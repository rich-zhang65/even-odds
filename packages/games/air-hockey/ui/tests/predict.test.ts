import { describe, expect, it } from 'vitest';
import { createRandom } from '@even-odds/game-sdk';
import type { EngineContext } from '@even-odds/game-sdk';
import { AirHockey } from '../../src/logic';
import { PADDLE, PUCK, TABLE } from '../../src/types';
import type { AirHockeyState } from '../../src/types';
import {
  CORRECTION_MS,
  STEP_MS,
  advanceTo,
  drawnPuck,
  rebase,
  start,
} from '../predict';

const context: EngineContext = {
  matchId: 'm1',
  players: ['p0', 'p1'],
  random: createRandom(1),
  now: 0,
};

const MID_X = TABLE.width / 2;
const HALFWAY = TABLE.height / 2;
const TOUCHING = PUCK.radius + PADDLE.radius;

// Live play: no face-off, paddles parked well away in the corners.
const live = (overrides: Partial<AirHockeyState> = {}): AirHockeyState => ({
  puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 0, y: 0 } },
  paddles: {
    p0: {
      at: { x: PADDLE.radius, y: TABLE.height - PADDLE.radius },
      target: { x: PADDLE.radius, y: TABLE.height - PADDLE.radius },
    },
    p1: {
      at: { x: PADDLE.radius, y: PADDLE.radius },
      target: { x: PADDLE.radius, y: PADDLE.radius },
    },
  },
  scores: { p0: 0, p1: 0 },
  faceOff: { inMs: 0, toward: 'p0' },
  ...overrides,
});

describe('Air Hockey prediction', () => {
  it('runs the game itself forward, step for step', () => {
    const moving = live({
      puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 40, y: -90 } },
    });

    const predicted = advanceTo(start(moving, 0), STEP_MS * 5, null, null);

    let expected = moving;
    for (let i = 0; i < 5; i++)
      expected = AirHockey.tick(expected, STEP_MS, context);
    expect(predicted.state.puck).toEqual(expected.puck);
  });

  /* The game moves in 60Hz steps but the screen redraws at its own rate, often
     faster. Drawn from the latest step alone the puck would stand still for
     several frames and then jump, so it is drawn between its last two steps by
     how far this frame has got from one to the next. */
  it('draws the puck between steps, so it moves every frame', () => {
    const moving = live({
      puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 0, y: 120 } },
    });
    const one = AirHockey.tick(moving, STEP_MS, context);
    const two = AirHockey.tick(one, STEP_MS, context);

    const ahead = advanceTo(start(moving, 0), STEP_MS * 2.25, null, null);

    expect(drawnPuck(ahead, STEP_MS * 2.25).y).toBeCloseTo(
      one.puck.at.y + (two.puck.at.y - one.puck.at.y) * 0.25,
      9,
    );
    expect(drawnPuck(ahead, STEP_MS * 2.75).y).toBeCloseTo(
      one.puck.at.y + (two.puck.at.y - one.puck.at.y) * 0.75,
      9,
    );
  });

  /* The point of predicting: your hit lands the moment you make it, without
     waiting for the server to hear about it and answer. */
  it('lands your hit straight away, before the server has answered', () => {
    const resting = live({
      puck: { at: { x: MID_X, y: HALFWAY + 20 }, velocity: { x: 0, y: 0 } },
      paddles: {
        p0: {
          at: { x: MID_X, y: HALFWAY + 60 },
          target: { x: MID_X, y: HALFWAY + 60 },
        },
        p1: {
          at: { x: PADDLE.radius, y: PADDLE.radius },
          target: { x: PADDLE.radius, y: PADDLE.radius },
        },
      },
    });

    // Your cursor has swept up through where the puck sits.
    const aim = { x: MID_X, y: HALFWAY + 10 };
    const predicted = advanceTo(start(resting, 0), STEP_MS * 2, 'p0', aim);

    expect(predicted.state.puck.velocity.y).toBeLessThan(0);
    expect(predicted.state.puck.at.y).toBeLessThan(aim.y - TOUCHING + 1e-9);
  });

  it('starts again from a snapshot, caught up by how old it is', () => {
    const moving = live({
      puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 0, y: 120 } },
    });
    const now = 1000;

    const fresh = rebase(null, moving, STEP_MS * 3, now, null, null);

    let expected = moving;
    for (let i = 0; i < 3; i++)
      expected = AirHockey.tick(expected, STEP_MS, context);
    expect(fresh.state.puck.at.y).toBeCloseTo(expected.puck.at.y, 9);
  });

  /* A correction blends in rather than snapping: the puck is drawn exactly
     where it was the moment the snapshot lands, then drifts onto the server's
     path over CORRECTION_MS. */
  it('blends a correction in instead of snapping to it', () => {
    const now = 1000;
    const ours = start(live(), now);
    const theirs = live({
      puck: { at: { x: MID_X + 6, y: HALFWAY }, velocity: { x: 0, y: 0 } },
    });

    const corrected = rebase(ours, theirs, 0, now, null, null);

    expect(drawnPuck(corrected, now)).toEqual(drawnPuck(ours, now));
    expect(drawnPuck(corrected, now + CORRECTION_MS / 2).x).toBeCloseTo(
      MID_X + 3,
      9,
    );
    expect(drawnPuck(corrected, now + CORRECTION_MS)).toEqual({
      x: MID_X + 6,
      y: HALFWAY,
    });
  });

  it('keeps a moving puck exactly where it was drawn when a snapshot lands', () => {
    const moving = live({
      puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 30, y: 150 } },
    });
    // Run to part-way between two steps, as a real frame usually is.
    const now = STEP_MS * 4.4;
    const ours = advanceTo(start(moving, 0), now, null, null);
    const theirs = live({
      puck: {
        at: { x: MID_X + 2, y: HALFWAY + 9 },
        velocity: { x: 30, y: 150 },
      },
    });

    const corrected = rebase(ours, theirs, STEP_MS * 1.6, now, null, null);

    const before = drawnPuck(ours, now);
    const after = drawnPuck(corrected, now);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  /* A snapshot lands between frames, when the prediction was last run at the
     previous frame. The comparison has to be with where the puck would be
     drawn now, not where it was drawn then. */
  it('stays continuous when a snapshot lands between frames', () => {
    const moving = live({
      puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 30, y: 150 } },
    });
    const lastFrame = STEP_MS * 4.4;
    const now = STEP_MS * 5.9;
    const ours = advanceTo(start(moving, 0), lastFrame, null, null);
    const theirs = live({
      puck: {
        at: { x: MID_X + 2, y: HALFWAY + 9 },
        velocity: { x: 30, y: 150 },
      },
    });

    const corrected = rebase(ours, theirs, STEP_MS * 1.6, now, null, null);

    const expected = drawnPuck(advanceTo(ours, now, null, null), now);
    const after = drawnPuck(corrected, now);
    expect(after.x).toBeCloseTo(expected.x, 9);
    expect(after.y).toBeCloseTo(expected.y, 9);
  });

  /* A fresh run from a snapshot has no step before it yet. Drawn between two
     copies of the same point, the puck stood still until the next step came
     round -- a hitch twenty times a second. */
  it('keeps the puck moving straight after a snapshot', () => {
    const moving = live({
      puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 0, y: 150 } },
    });
    const now = 1000;

    const fresh = rebase(null, moving, 2, now, null, null);
    const later = advanceTo(fresh, now + 5, null, null);

    const travelled = drawnPuck(later, now + 5).y - drawnPuck(fresh, now).y;
    expect(travelled).toBeCloseTo(150 * 0.005, 2);
  });

  it('snaps on a goal, where the puck jumps on purpose', () => {
    const now = 1000;
    const ours = start(
      live({
        puck: { at: { x: MID_X, y: 3 }, velocity: { x: 0, y: -200 } },
      }),
      now,
    );
    const scored = live({
      scores: { p0: 1, p1: 0 },
      faceOff: { inMs: 1500, toward: 'p1' },
      puck: {
        at: { x: MID_X, y: TABLE.height * 0.25 },
        velocity: { x: 0, y: 0 },
      },
    });

    const corrected = rebase(ours, scored, 0, now, null, null);

    expect(drawnPuck(corrected, now)).toEqual(scored.puck.at);
  });
});
