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
