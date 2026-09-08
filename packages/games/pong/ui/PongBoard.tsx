"use client";

import { useEffect, useRef } from "react";
import type { PlayerId, RealtimeSnapshot, Snapshot } from "@even-odds/game-sdk";
import { SEATS } from "@even-odds/game-sdk/ui";
import { cx } from "@even-odds/design-system/ui";
import { BALL, PADDLE, TABLE } from "../src/types";
import type { PongAction, PongState } from "../src/types";

/* Draw this far behind the server. Snapshots arrive every 50ms, so a frame
   almost always has two to sit between; without the delay every frame would be
   extrapolating past the newest one and the ball would jitter. */
const DELAY_MS = 100;

const PADDLE_WIDTH = 3;

type Frame = { received: number; tick: number; state: PongState };

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const isRealtimePong = (snapshot: Snapshot<unknown>): snapshot is RealtimeSnapshot<PongState> =>
  snapshot.mode === "realtime";

export const PongBoard = ({
  seat,
  subscribe,
  onAction,
}: {
  seat: PlayerId | null;
  subscribe: (listener: (snapshot: Snapshot<unknown>) => void) => () => void;
  onAction: (action: PongAction) => void;
}) => {
  const table = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const paddleRefs = useRef<Record<PlayerId, HTMLDivElement | null>>({ p0: null, p1: null });

  /* All of this is deliberately outside React. The loop below runs sixty times a
     second; putting any of it in state would re-render the tree to move three
     absolutely positioned divs. */
  const frames = useRef<Frame[]>([]);
  const size = useRef({ width: 0, height: 0 });
  const held = useRef(0);

  useEffect(() => {
    const stop = subscribe((snapshot) => {
      if (!isRealtimePong(snapshot)) return;

      const buffered = frames.current;
      // Socket.IO delivers in order, but a stale frame would rewind the render.
      if (buffered.length > 0 && snapshot.tick <= buffered[buffered.length - 1].tick) return;

      buffered.push({
        received: performance.now(),
        tick: snapshot.tick,
        state: snapshot.state,
      });
      // Two frames span the render delay; a few more absorb a late arrival.
      if (buffered.length > 8) buffered.splice(0, buffered.length - 8);
    });

    return stop;
  }, [subscribe]);

  useEffect(() => {
    const element = table.current;
    if (element === null) return;

    const observer = new ResizeObserver(([entry]) => {
      size.current = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let running = 0;

    const place = (node: HTMLDivElement | null, x: number, y: number): void => {
      if (node === null) return;
      const { width, height } = size.current;
      const px = (x / TABLE.width) * width;
      const py = (y / TABLE.height) * height;
      node.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
    };

    const draw = (): void => {
      running = requestAnimationFrame(draw);

      const buffered = frames.current;
      if (buffered.length === 0) return;

      const at = performance.now() - DELAY_MS;

      /* Find the pair the render time falls between. Past the newest frame we
         hold on it rather than extrapolate: a ball that guesses wrong has to be
         yanked back, and standing still for 50ms reads better than that. */
      let older = buffered[0];
      let newer = buffered[buffered.length - 1];
      for (let i = 0; i < buffered.length - 1; i++) {
        if (buffered[i].received <= at && buffered[i + 1].received >= at) {
          older = buffered[i];
          newer = buffered[i + 1];
          break;
        }
      }

      const span = newer.received - older.received;
      const t = span > 0 ? Math.min(Math.max((at - older.received) / span, 0), 1) : 1;

      place(
        ball.current,
        lerp(older.state.ball.at.x, newer.state.ball.at.x, t),
        lerp(older.state.ball.at.y, newer.state.ball.at.y, t),
      );

      for (const player of ["p0", "p1"] as const) {
        place(
          paddleRefs.current[player],
          player === "p0" ? PADDLE.inset : TABLE.width - PADDLE.inset,
          lerp(older.state.paddles[player].y, newer.state.paddles[player].y, t),
        );
      }
    };

    running = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(running);
  }, []);

  useEffect(() => {
    if (seat === null) return;

    const directionOf = (key: string): -1 | 0 | 1 =>
      key === "ArrowUp" || key === "w" ? -1 : key === "ArrowDown" || key === "s" ? 1 : 0;

    const press = (event: KeyboardEvent): void => {
      const dir = directionOf(event.key);
      if (dir === 0 || held.current === dir) return;
      event.preventDefault();
      held.current = dir;
      onAction({ type: "SET_DIR", dir });
    };

    const release = (event: KeyboardEvent): void => {
      const dir = directionOf(event.key);
      if (dir === 0 || held.current !== dir) return;
      held.current = 0;
      onAction({ type: "SET_DIR", dir: 0 });
    };

    window.addEventListener("keydown", press);
    window.addEventListener("keyup", release);

    return () => {
      window.removeEventListener("keydown", press);
      window.removeEventListener("keyup", release);
    };
  }, [seat, onAction]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-eo-lg border-2 border-eo-strong bg-eo-inverse"
      style={{ aspectRatio: `${TABLE.width} / ${TABLE.height}` }}
      ref={table}
    >
      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-eo-on-inverse/20" />

      {(["p0", "p1"] as const).map((player) => (
        <div
          key={player}
          className={cx(
            "absolute top-0 left-0 rounded-eo-xs will-change-transform",
            SEATS[player].solid,
            seat === player && "ring-2 ring-eo-on-inverse/60",
          )}
          style={{
            width: `${(PADDLE_WIDTH / TABLE.width) * 100}%`,
            height: `${(PADDLE.height / TABLE.height) * 100}%`,
          }}
          ref={(node) => {
            paddleRefs.current[player] = node;
          }}
        />
      ))}

      <div
        className="absolute top-0 left-0 rounded-full bg-eo-on-inverse will-change-transform"
        style={{
          width: `${((BALL.radius * 2) / TABLE.width) * 100}%`,
          aspectRatio: "1",
        }}
        ref={ball}
      />
    </div>
  );
};
