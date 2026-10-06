'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@even-odds/design-system/ui';
import type { PlayerId, RealtimeSnapshot, Snapshot } from '@even-odds/game-sdk';
import { SEATS, seenBy } from '@even-odds/game-sdk/ui';
import { clearOfPaddle, inFrontOf, penned, puckLook } from '../src/logic';
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

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

const TOUCHING = PUCK.radius + PADDLE.radius;

/* How long a ram keeps the drawn puck in front of your paddle: the render
   delay, plus a little for the hit's snapshot to arrive. */
const RAM_MS = DELAY_MS + 60;

// Whether the stroke from `from` to `to` passed within reach of `at`.
const strokeMet = (from: Vec, to: Vec, at: Vec): boolean => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.min(
          Math.max(((at.x - from.x) * dx + (at.y - from.y) * dy) / length, 0),
          1,
        );
  return (
    Math.hypot(at.x - (from.x + dx * t), at.y - (from.y + dy * t)) < TOUCHING
  );
};

/* The table's markings, in table units: the centre circle and each goal crease.
   They are drawn hairline-grey on a light table and white on a dark one, where
   the grey all but disappears into the tinted halves. */
const CENTRE_RADIUS = 15;
const CREASE_RADIUS = 22.5;

/* A paddle: a disc with a dark outline and a hard shadow under it, as if lifted
   off the table. */
const DISC =
  'border-[3px] border-eo-strong shadow-[0_4px_0_var(--color-eo-strong)]';

export const AirHockeyBoard = ({
  seat,
  scores,
  count,
  scorer,
  winner,
  subscribe,
  onAction,
}: {
  seat: PlayerId | null;
  scores: Record<PlayerId, number>;
  // The opening countdown, 3 to 1, while the puck waits on the centre spot.
  count: number | null;
  // Whoever just scored, while the puck waits to come back; null otherwise.
  scorer: PlayerId | null;
  winner: PlayerId | null;
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
    // Where your paddle was drawn last frame, and the ram in progress, if any.
    let last: Vec | null = null;
    let ram: { heading: Vec; until: number } | null = null;

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
      /* While it waits the puck is a ghost on the server, which paddles pass
         through, so it is drawn exactly where it is. After a goal it is
         hidden, then blinks through the grace period. */
      const live = newer.state.faceOff.inMs <= 0;
      const node = puck.current;
      const look = puckLook(newer.state);
      if (node !== null && node.dataset.look !== look) node.dataset.look = look;

      /* A fast ram can carry your paddle past the delayed puck's centre in a
         single frame, and pushed out the nearest way the puck would show
         behind the paddle until the hit arrives. So when this frame's stroke
         met the puck, it is drawn ahead of the stroke for as long as the hit
         takes to show. */
      const own = aim.current;
      const now = performance.now();
      if (own !== null && last !== null && live) {
        const dx = own.x - last.x;
        const dy = own.y - last.y;
        const length = Math.hypot(dx, dy);
        if (length > 0 && strokeMet(last, own, drifting)) {
          ram = {
            heading: { x: dx / length, y: dy / length },
            until: now + RAM_MS,
          };
        }
      }
      last = own;
      if (ram !== null && now > ram.until) ram = null;

      let shown = drifting;
      if (own !== null && live) {
        if (ram !== null) shown = inFrontOf(shown, own, ram.heading);
        shown = clearOfPaddle(shown, own);
      }
      place(node, shown);

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

  /* The table is always drawn from your end: your half and goal at the
     bottom, theirs at the top. Someone watching sees it from Red's end. */
  const near = seat ?? 'p0';
  const far = OPPONENT[near];

  /* The rim takes the colour of whoever leads, and the winner's at the end; a
     level score leaves it plain. */
  const ahead =
    winner ??
    (scores.p0 === scores.p1 ? null : scores.p0 > scores.p1 ? 'p0' : 'p1');

  return (
    <div
      className={cx(
        'relative mx-auto h-[min(68vh,720px)] max-w-full touch-none overflow-hidden rounded-eo-lg border-2 bg-eo-card shadow-eo-sm transition-colors duration-(--eo-duration-base)',
        ahead === null ? 'border-eo-strong' : SEATS[ahead].border,
        // Your paddle sits under the pointer, so the cursor would only cover it.
        seat !== null && winner === null && 'cursor-none',
      )}
      style={{ aspectRatio: `${TABLE.width} / ${TABLE.height}` }}
      ref={table}
    >
      <div className={cx('absolute inset-x-0 top-0 h-1/2', SEATS[far].soft)} />
      <div
        className={cx('absolute inset-x-0 bottom-0 h-1/2', SEATS[near].soft)}
      />

      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-eo-hairline dark:bg-white" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-eo-hairline dark:border-white bg-eo-card"
        style={{
          width: percent(CENTRE_RADIUS * 2, TABLE.width),
          aspectRatio: '1',
        }}
      />

      {/* Each crease is a whole circle centred on the end wall, half of it
          hidden past the edge, and each mouth a bar in its defender's colour. */}
      {(['top', 'bottom'] as const).map((end) => (
        <div key={end}>
          <div
            className="absolute left-1/2 rounded-full border-2 border-eo-hairline dark:border-white"
            style={{
              width: percent(CREASE_RADIUS * 2, TABLE.width),
              aspectRatio: '1',
              [end]: 0,
              translate: `-50% ${end === 'top' ? '-50%' : '50%'}`,
            }}
          />
          <div
            className={cx(
              'absolute left-1/2 h-1.75 -translate-x-1/2',
              end === 'top'
                ? 'top-0 rounded-b-full'
                : 'bottom-0 rounded-t-full',
              SEATS[end === 'top' ? far : near].solid,
            )}
            style={{ width: percent(GOAL.width, TABLE.width) }}
          />
        </div>
      ))}

      {(['p0', 'p1'] as const).map((player) => (
        <div
          key={player}
          className={cx(
            'absolute top-0 left-0 grid place-items-center rounded-full will-change-transform',
            DISC,
            SEATS[player].solid,
          )}
          style={{
            width: percent(PADDLE.radius * 2, TABLE.width),
            aspectRatio: '1',
          }}
          ref={(node) => {
            paddleRefs.current[player] = node;
          }}
        >
          <span className="size-1/3 rounded-full bg-white/85" />
        </div>
      ))}

      {/* Black in either theme, as a puck is, with an outline that turns white
          on a dark table. A shallower shadow than the paddles': at this size
          theirs stretched it into an egg. The ring is the raised rim of its top
          face, which is what makes it read as a flat disc from above. */}
      <div
        className="absolute top-0 left-0 grid place-items-center rounded-full border-2 border-eo-strong bg-eo-ink-900 shadow-[0_2px_0_var(--color-eo-strong)] will-change-transform data-[look=blinking]:animate-eo-blink data-[look=hidden]:opacity-0"
        style={{
          width: percent(PUCK.radius * 2, TABLE.width),
          aspectRatio: '1',
        }}
        ref={puck}
      >
        <span className="size-[62%] rounded-full border border-white/30" />
      </div>

      {/* Keyed on the number, so each second pops in afresh. */}
      {count !== null && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span
            className="grid aspect-square w-[32%] animate-eo-pop place-items-center rounded-full bg-eo-inverse font-eo-display text-6xl font-bold tracking-eo-tight text-eo-on-inverse shadow-eo-md"
            key={count}
          >
            {count}
          </span>
        </div>
      )}

      {/* Keyed on the score, so a second goal in a row pops in afresh. */}
      {scorer !== null && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span
            className={cx(
              'animate-eo-pop rounded-eo-pill border-[3px] border-eo-strong px-6 py-2 font-eo-display text-2xl font-bold tracking-eo-tight whitespace-nowrap text-white shadow-eo-edge-ink',
              SEATS[scorer].solid,
            )}
            key={scores.p0 + scores.p1}
          >
            {seat === scorer ? 'You score' : `${SEATS[scorer].name} scores`}
          </span>
        </div>
      )}
    </div>
  );
};
