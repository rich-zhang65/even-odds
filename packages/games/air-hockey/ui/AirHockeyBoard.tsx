'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@even-odds/design-system/ui';
import type { PlayerId, RealtimeSnapshot, Snapshot } from '@even-odds/game-sdk';
import { SEATS, seenBy } from '@even-odds/game-sdk/ui';
import { clearOfPaddle, penned } from '../src/logic';
import { GOAL, PADDLE, PUCK, TABLE } from '../src/types';
import type { AirHockeyAction, AirHockeyState, Vec } from '../src/types';

/* Draw this far behind the server. Snapshots arrive every 50ms, so a frame
   almost always has two to sit between; without the delay every frame would be
   extrapolating past the newest one and the puck would jitter. */
const DELAY_MS = 100;

// A fifth of a unit is about half a pixel at the table's largest. Below that the
// paddle cannot visibly move, so sending it only spends bandwidth.
const AIM_EPSILON = 0.2;

type Frame = { received: number; tick: number; state: AirHockeyState };

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const isRealtimeAirHockey = (
  snapshot: Snapshot<unknown>,
): snapshot is RealtimeSnapshot<AirHockeyState> => snapshot.mode === 'realtime';

const percent = (value: number, of: number): string => `${(value / of) * 100}%`;

export const AirHockeyBoard = ({
  seat,
  subscribe,
  onAction,
}: {
  seat: PlayerId | null;
  subscribe: (listener: (snapshot: Snapshot<unknown>) => void) => () => void;
  onAction: (action: AirHockeyAction) => void;
}) => {
  const table = useRef<HTMLDivElement>(null);
  const puck = useRef<HTMLDivElement>(null);
  const paddleRefs = useRef<Record<PlayerId, HTMLDivElement | null>>({
    p0: null,
    p1: null,
  });

  /* All of this is deliberately outside React. The loop below runs sixty times a
     second; putting any of it in state would re-render the tree to move three
     absolutely positioned divs. */
  const frames = useRef<Frame[]>([]);
  const size = useRef({ width: 0, height: 0 });
  const aim = useRef<Vec | null>(null);

  useEffect(() => {
    const stop = subscribe((snapshot) => {
      if (!isRealtimeAirHockey(snapshot)) return;

      const buffered = frames.current;
      // Socket.IO delivers in order, but a stale frame would rewind the render.
      if (
        buffered.length > 0 &&
        snapshot.tick <= buffered[buffered.length - 1].tick
      )
        return;

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
    const element = table.current;
    let running = 0;
    let sent: Vec | null = null;

    const place = (node: HTMLDivElement | null, at: Vec): void => {
      if (node === null) return;
      const { width, height } = size.current;
      const on = seenBy(seat, at, TABLE);
      const px = (on.x / TABLE.width) * width;
      const py = (on.y / TABLE.height) * height;
      node.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
    };

    const draw = (): void => {
      const buffered = frames.current;
      if (buffered.length === 0) return;

      const at = performance.now() - DELAY_MS;

      /* Find the pair the render time falls between. Past the newest frame we
         hold on it rather than extrapolate: a puck that guesses wrong has to be
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
      const t =
        span > 0 ? Math.min(Math.max((at - older.received) / span, 0), 1) : 1;

      const drifting = {
        x: lerp(older.state.puck.at.x, newer.state.puck.at.x, t),
        y: lerp(older.state.puck.at.y, newer.state.puck.at.y, t),
      };

      /* Your paddle is drawn from the cursor and the puck from a snapshot a
         tenth of a second old, so left alone the two would overlap on screen
         every time you moved onto the puck — the server has already pushed it
         away, that frame just has not arrived. Nothing here changes the game:
         the next snapshot overrides it, and only your own paddle counts,
         because the opponent's and the puck come from the same frame and the
         server has already settled them against each other. */
      place(
        puck.current,
        aim.current === null ? drifting : clearOfPaddle(drifting, aim.current),
      );

      for (const player of ['p0', 'p1'] as const) {
        /* Your own paddle is drawn from the pointer, never from the snapshot.
           Everything else renders DELAY_MS behind the server, and a hand that
           lags its own cursor by a tenth of a second is the one delay nobody
           tolerates — most of all in the game where you are dragging the thing.
           The server still owns the paddle the puck collides with. */
        const own = player === seat ? aim.current : null;
        place(
          paddleRefs.current[player],
          own ?? {
            x: lerp(
              older.state.paddles[player].at.x,
              newer.state.paddles[player].at.x,
              t,
            ),
            y: lerp(
              older.state.paddles[player].at.y,
              newer.state.paddles[player].at.y,
              t,
            ),
          },
        );
      }
    };

    /* A pointer fires far faster than the sim ticks, so moving only records the
       position and the frame sends whatever it last settled on. Emitting from
       the handler would put a hundred-odd actions a second on the wire. */
    const flush = (): void => {
      const wanted = aim.current;
      if (wanted === null) return;
      if (
        sent !== null &&
        Math.hypot(wanted.x - sent.x, wanted.y - sent.y) < AIM_EPSILON
      )
        return;
      sent = wanted;
      onAction({ type: 'AIM', x: wanted.x, y: wanted.y });
    };

    // One loop, so the position drawn this frame is exactly the one sent.
    const frame = (): void => {
      running = requestAnimationFrame(frame);
      draw();
      flush();
    };

    /* Tracked on the window rather than the table: the cursor leaving mid-rally
       is normal, and freezing the paddle when it does would be worse than
       pinning it to the edge the cursor left by. */
    const track = (event: PointerEvent): void => {
      if (element === null || seat === null) return;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const onScreen = {
        x: ((event.clientX - rect.left) / rect.width) * TABLE.width,
        y: ((event.clientY - rect.top) / rect.height) * TABLE.height,
      };
      // seenBy is its own inverse, so the same turn reads the pointer back.
      aim.current = penned(seat, seenBy(seat, onScreen, TABLE));
    };

    if (seat !== null) window.addEventListener('pointermove', track);
    running = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('pointermove', track);
      cancelAnimationFrame(running);
    };
  }, [seat, onAction]);

  return (
    <div
      className="relative mx-auto h-[min(68vh,720px)] max-w-full touch-none overflow-hidden rounded-eo-lg border-2 border-eo-strong bg-eo-inverse"
      style={{ aspectRatio: `${TABLE.width} / ${TABLE.height}` }}
      ref={table}
    >
      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-eo-on-inverse/20" />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-eo-on-inverse/20"
        style={{
          width: percent(PADDLE.radius * 4, TABLE.width),
          aspectRatio: '1',
        }}
      />

      {(['top', 'bottom'] as const).map((end) => (
        <div
          key={end}
          className={cx(
            'absolute left-1/2 -translate-x-1/2 bg-eo-on-inverse/15',
            end === 'top'
              ? 'top-0 rounded-b-eo-xs'
              : 'bottom-0 rounded-t-eo-xs',
          )}
          style={{
            width: percent(GOAL.width, TABLE.width),
            height: percent(PUCK.radius, TABLE.height),
          }}
        />
      ))}

      {(['p0', 'p1'] as const).map((player) => (
        <div
          key={player}
          className={cx(
            'absolute top-0 left-0 rounded-full will-change-transform',
            SEATS[player].solid,
            seat === player && 'ring-2 ring-eo-on-inverse/60',
          )}
          style={{
            width: percent(PADDLE.radius * 2, TABLE.width),
            aspectRatio: '1',
          }}
          ref={(node) => {
            paddleRefs.current[player] = node;
          }}
        />
      ))}

      <div
        className="absolute top-0 left-0 rounded-full bg-eo-on-inverse will-change-transform"
        style={{
          width: percent(PUCK.radius * 2, TABLE.width),
          aspectRatio: '1',
        }}
        ref={puck}
      />
    </div>
  );
};
