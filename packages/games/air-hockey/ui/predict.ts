import { createRandom } from '@even-odds/game-sdk';
import type { EngineContext, PlayerId } from '@even-odds/game-sdk';
import { AirHockey } from '../src/logic';
import type { AirHockeyState, Vec } from '../src/types';

/* Client-side prediction. The server owns the game, but a snapshot is already
   old by the time it lands, and drawing it as it stands puts the puck in the
   past while your paddle is under your cursor in the present -- you hit where
   the puck was, and it seems to pass through the paddle before the hit shows.
   The physics is deterministic and shared, so the client runs the same tick
   forward to now, with your paddle aimed at your cursor, and draws that. Each
   snapshot starts the run again from the truth. */

// The server's own step, so a predicted tick is the tick it will run.
export const STEP_MS = 1000 / AirHockey.tickRateHz;

/* How long a correction takes to blend in. A snapshot that disagrees with the
   prediction -- usually because the opponent did something -- moves the puck
   over this long rather than in one frame. */
export const CORRECTION_MS = 120;

/* Past this, a difference is not a correction but a jump the game made on
   purpose, such as the puck going to its spot after a goal, and it is shown
   as it is. */
const SNAP_DISTANCE = 20;

// The tick never draws on its context; this only satisfies the signature.
const CONTEXT: EngineContext = {
  matchId: 'prediction',
  players: ['p0', 'p1'],
  random: createRandom(0),
  now: 0,
};

export type Prediction = {
  state: AirHockeyState;
  // The moment, on performance.now()'s clock, that `state` has been run to.
  at: number;
  // Where the puck was one step before `at`, to draw between the two.
  previous: Vec;
  /* How far the drawn puck is from the simulated one, fading to nothing over
     CORRECTION_MS from `nudgedAt`. */
  nudge: Vec;
  nudgedAt: number;
};

/* A run starts with no step behind it, so the step before is worked back from
   the puck's velocity. Left equal to where the puck is, there would be nothing
   to draw between and the puck would stand still until the next step. */
export const start = (state: AirHockeyState, now: number): Prediction => ({
  state,
  at: now,
  previous: {
    x: state.puck.at.x - (state.puck.velocity.x * STEP_MS) / 1000,
    y: state.puck.at.y - (state.puck.velocity.y * STEP_MS) / 1000,
  },
  nudge: { x: 0, y: 0 },
  nudgedAt: now,
});

/* Run the game forward to `now` in the server's steps, your paddle aimed at
   your cursor. The opponent's paddle stays where it was last seen: where it is
   going is the one thing the client cannot know. */
export const advanceTo = (
  prediction: Prediction,
  now: number,
  seat: PlayerId | null,
  aim: Vec | null,
): Prediction => {
  let { state, at, previous } = prediction;
  while (now - at >= STEP_MS) {
    previous = state.puck.at;
    const aimed =
      seat === null || aim === null
        ? state
        : AirHockey.reduce(state, { type: 'AIM', ...aim }, seat, CONTEXT);
    state = AirHockey.tick(aimed, STEP_MS, CONTEXT);
    at += STEP_MS;
  }
  return { ...prediction, state, at, previous };
};

const nudgeAt = (prediction: Prediction, now: number): Vec => {
  const left = Math.max(0, 1 - (now - prediction.nudgedAt) / CORRECTION_MS);
  return { x: prediction.nudge.x * left, y: prediction.nudge.y * left };
};

/* The game moves in steps but the screen redraws at its own rate, often faster,
   so the puck is drawn between its last two steps by how far this frame has
   got from one to the next. Drawn from the latest step alone it would stand
   still for frames at a time and then jump. This puts it one step behind the
   simulation, which is the price of moving every frame. */
export const drawnPuck = (prediction: Prediction, now: number): Vec => {
  const { previous, state, at } = prediction;
  const through = Math.min(Math.max((now - at) / STEP_MS, 0), 1);
  const nudge = nudgeAt(prediction, now);
  return {
    x: previous.x + (state.puck.at.x - previous.x) * through + nudge.x,
    y: previous.y + (state.puck.at.y - previous.y) * through + nudge.y,
  };
};

/* A snapshot arrived: start again from it, caught up by its age, and carry
   the difference from what was being drawn as a nudge that fades out. */
export const rebase = (
  prediction: Prediction | null,
  server: AirHockeyState,
  ageMs: number,
  now: number,
  seat: PlayerId | null,
  aim: Vec | null,
): Prediction => {
  const fresh = advanceTo(start(server, now - ageMs), now, seat, aim);
  if (prediction === null) return { ...fresh, nudgedAt: now };

  /* Measured between where the puck was drawn and where the fresh run would
     draw it, both between steps; against the fresh run's latest step instead,
     a moving puck would jump on every snapshot. */
  // Run on to now first: the snapshot usually lands between two frames.
  const was = drawnPuck(advanceTo(prediction, now, seat, aim), now);
  const will = drawnPuck({ ...fresh, nudge: { x: 0, y: 0 } }, now);
  const nudge = { x: was.x - will.x, y: was.y - will.y };
  const scored =
    server.scores.p0 + server.scores.p1 !==
    prediction.state.scores.p0 + prediction.state.scores.p1;
  const snap = scored || Math.hypot(nudge.x, nudge.y) > SNAP_DISTANCE;

  return { ...fresh, nudge: snap ? { x: 0, y: 0 } : nudge, nudgedAt: now };
};
