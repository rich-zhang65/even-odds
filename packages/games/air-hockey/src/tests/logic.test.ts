import { describe, expect, it } from 'vitest';
import { createRandom } from '@even-odds/game-sdk';
import type { EngineContext, PlayerId } from '@even-odds/game-sdk';
import {
  AirHockey,
  countdown,
  inFrontOf,
  justScored,
  puckLook,
} from '../logic';
import {
  FACE_OFF_MS,
  GOAL,
  GRACE_MS,
  OPENING_MS,
  PADDLE,
  PUCK,
  SUB_STEPS,
  TABLE,
  TARGET_SCORE,
} from '../types';
import type { AirHockeyState, Vec } from '../types';

const STEP_MS = 1000 / 60;

const tick = AirHockey.tick;

const MID_X = TABLE.width / 2;
const HALFWAY = TABLE.height / 2;
const TOUCHING = PUCK.radius + PADDLE.radius;

const context = (seed = 1): EngineContext => ({
  matchId: 'm1',
  players: ['p0', 'p1'],
  random: createRandom(seed),
  now: 0,
});

const run = (
  state: AirHockeyState,
  ticks: number,
  ctx = context(),
): AirHockeyState => {
  let next = state;
  for (let i = 0; i < ticks; i++) next = tick(next, STEP_MS, ctx);
  return next;
};

const still = (at: Vec): { at: Vec; target: Vec } => ({ at, target: at });

/* Physics tests build the exact situation rather than playing into it, so a
   failure names one rule instead of a whole rally. Both paddles start parked in
   the corners, well out of the way of anything being measured. */
const board = (overrides: Partial<AirHockeyState> = {}): AirHockeyState => ({
  puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 0, y: 0 } },
  paddles: {
    p0: still({ x: PADDLE.radius, y: TABLE.height - PADDLE.radius }),
    p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
  },
  scores: { p0: 0, p1: 0 },
  faceOff: { inMs: 0, toward: 'p0' },
  ...overrides,
});

const speedOf = (v: Vec): number => Math.hypot(v.x, v.y);

describe('Air Hockey — the opening countdown', () => {
  it('opens with three seconds on the clock and the puck in the middle', () => {
    const fresh = AirHockey.setup(context());

    expect(fresh.faceOff).toEqual({ inMs: OPENING_MS, toward: null });
    expect(fresh.puck.at).toEqual({ x: MID_X, y: HALFWAY });
  });

  it('holds the puck through the countdown, then leaves it in the middle at rest', () => {
    const ticks = Math.ceil(OPENING_MS / STEP_MS);
    const nearly = run(AirHockey.setup(context()), ticks - 2);
    const done = run(AirHockey.setup(context()), ticks + 1);

    expect(nearly.faceOff.inMs).toBeGreaterThan(0);
    expect(nearly.puck.velocity).toEqual({ x: 0, y: 0 });
    expect(done.faceOff.inMs).toBe(0);
    expect(done.puck.at).toEqual({ x: MID_X, y: HALFWAY });
    expect(done.puck.velocity).toEqual({ x: 0, y: 0 });
  });

  it('counts 3, 2, 1 for the screen, then nothing', () => {
    const at = (ms: number) =>
      countdown(run(AirHockey.setup(context()), Math.round(ms / STEP_MS)));

    expect(at(0)).toBe(3);
    expect(at(1100)).toBe(2);
    expect(at(2100)).toBe(1);
    expect(at(OPENING_MS + 100)).toBeNull();
  });

  it('shows no countdown on the face-off after a goal', () => {
    const afterGoal = board({
      scores: { p0: 1, p1: 0 },
      faceOff: { inMs: FACE_OFF_MS, toward: 'p1' },
    });

    expect(countdown(afterGoal)).toBeNull();
  });
});

describe('Air Hockey — the face-off', () => {
  it('holds the puck until the delay runs out', () => {
    const waiting = run(
      board({ faceOff: { inMs: FACE_OFF_MS, toward: 'p0' } }),
      3,
    );

    expect(waiting.puck.velocity).toEqual({ x: 0, y: 0 });
    expect(waiting.faceOff.inMs).toBeLessThan(FACE_OFF_MS);
  });

  it('drops the puck in the half of whoever was just scored on, at rest', () => {
    const ticks = Math.ceil(FACE_OFF_MS / STEP_MS);
    const toP0 = run(
      board({ faceOff: { inMs: FACE_OFF_MS, toward: 'p0' } }),
      ticks,
    );
    const toP1 = run(
      board({ faceOff: { inMs: FACE_OFF_MS, toward: 'p1' } }),
      ticks,
    );

    expect(toP0.puck.at.y).toBeGreaterThan(HALFWAY);
    expect(toP1.puck.at.y).toBeLessThan(HALFWAY);
    expect(toP0.puck.velocity).toEqual({ x: 0, y: 0 });
  });

  it('still lets the paddles move while the puck waits', () => {
    const waiting = run(
      board({
        faceOff: { inMs: FACE_OFF_MS, toward: 'p0' },
        paddles: {
          p0: { at: { x: 20, y: 150 }, target: { x: 60, y: 150 } },
          p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
        },
      }),
      1,
    );

    expect(waiting.paddles.p0.at.x).toBe(60);
  });
});

describe('Air Hockey — paddles', () => {
  it('keeps a paddle inside its own half', () => {
    const overreach = AirHockey.reduce(
      board(),
      { type: 'AIM', x: 50, y: 10 },
      'p0',
      context(),
    );
    const undereach = AirHockey.reduce(
      board(),
      { type: 'AIM', x: 50, y: 190 },
      'p1',
      context(),
    );

    expect(overreach.paddles.p0.target.y).toBe(HALFWAY + PADDLE.radius);
    expect(undereach.paddles.p1.target.y).toBe(HALFWAY - PADDLE.radius);
  });

  it('keeps a paddle inside the side walls', () => {
    const wide = AirHockey.reduce(
      board(),
      { type: 'AIM', x: 999, y: 150 },
      'p0',
      context(),
    );

    expect(wide.paddles.p0.target.x).toBe(TABLE.width - PADDLE.radius);
  });

  it('arrives at its target within the tick', () => {
    const aimed = board({
      paddles: {
        p0: { at: { x: 20, y: 150 }, target: { x: 80, y: 170 } },
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    expect(run(aimed, 1).paddles.p0.at).toEqual({ x: 80, y: 170 });
  });

  it('refuses an aim that is not a pair of real numbers', () => {
    const at = board();

    expect(
      AirHockey.isLegal(
        at,
        { type: 'AIM', x: Number.NaN, y: 5 },
        'p0',
        context(),
      ),
    ).toBe(false);
    expect(
      AirHockey.isLegal(
        at,
        { type: 'AIM', x: 5, y: Infinity },
        'p0',
        context(),
      ),
    ).toBe(false);
    expect(
      AirHockey.isLegal(at, { type: 'AIM', x: 50, y: 150 }, 'p0', context()),
    ).toBe(true);
  });
});

describe('Air Hockey — the puck', () => {
  it('reflects off the long sides', () => {
    const drifting = board({
      puck: {
        at: { x: PUCK.radius + 0.5, y: HALFWAY },
        velocity: { x: -60, y: 0 },
      },
    });

    const bounced = run(drifting, 1);

    expect(bounced.puck.velocity.x).toBeGreaterThan(0);
    expect(bounced.puck.at.x).toBeGreaterThanOrEqual(PUCK.radius);
  });

  it('reflects off the end wall beside the mouth', () => {
    const wide = GOAL.width / 2 + PUCK.radius + 5;
    const atCorner = board({
      puck: {
        at: { x: MID_X + wide, y: PUCK.radius + 0.5 },
        velocity: { x: 0, y: -60 },
      },
    });

    const bounced = run(atCorner, 1);

    expect(bounced.puck.velocity.y).toBeGreaterThan(0);
    expect(bounced.scores).toEqual({ p0: 0, p1: 0 });
  });

  it('goes in through the mouth', () => {
    const onTarget = board({
      puck: { at: { x: MID_X, y: PUCK.radius }, velocity: { x: 0, y: -120 } },
    });

    const scored = run(onTarget, 3);

    expect(scored.scores).toEqual({ p0: 1, p1: 0 });
    expect(scored.faceOff).toEqual({ inMs: FACE_OFF_MS, toward: 'p1' });
    // Straight to the conceding side's spot, never back through the middle.
    expect(scored.puck.at).toEqual({ x: MID_X, y: TABLE.height * 0.25 });
    expect(scored.puck.velocity).toEqual({ x: 0, y: 0 });
  });

  it('slows down while nothing is touching it', () => {
    const gliding = board({
      puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 40, y: 0 } },
    });

    expect(speedOf(run(gliding, 30).puck.velocity)).toBeLessThan(40);
  });
});

describe('Air Hockey — striking', () => {
  /* Continuous: the bounce happens at the instant the two touch, and the puck
     spends the rest of the slice travelling away. Resolved at the end of the
     slice instead, it would be parked against the paddle and lose that travel,
     which is what made hits look like they clipped into the paddle. */
  it('bounces at the moment of contact and keeps moving for the rest of the slice', () => {
    const paddle = { x: MID_X, y: HALFWAY + 30 };
    const slice = 1 / (60 * SUB_STEPS);
    const speed = 240;
    // Half a slice's travel short of touching, heading straight at the paddle.
    const gap = (speed * slice) / 2;
    const state = board({
      puck: {
        at: { x: MID_X, y: paddle.y - TOUCHING - gap },
        velocity: { x: 0, y: speed },
      },
      paddles: {
        p0: still(paddle),
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    // By hand: touch half-way through slice one, bounce, then travel away.
    let y = paddle.y - TOUCHING - (speed * PUCK.bounce * slice) / 2;
    let vy = -speed * PUCK.bounce * (1 - PUCK.damping * slice);
    for (let rest = 1; rest < SUB_STEPS; rest++) {
      y += vy * slice;
      vy *= 1 - PUCK.damping * slice;
    }

    const after = run(state, 1);
    expect(after.puck.at.y).toBeCloseTo(y, 6);
    expect(after.puck.velocity.y).toBeCloseTo(vy, 6);
  });

  /* A paddle can cover far more than the puck can in one slice, so a hard ram
     ends a slice with the paddle past the puck's centre while still overlapping
     it. Pushed straight out from the paddle, the puck went out the back and
     back toward the rammer's own goal. */
  const ram = (puckX: number) =>
    run(
      AirHockey.reduce(
        board({
          puck: { at: { x: puckX, y: 128 }, velocity: { x: 0, y: 0 } },
          paddles: {
            p0: still({ x: 50, y: 168 }),
            p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
          },
        }),
        { type: 'AIM', x: 50, y: 107 },
        'p0',
        context(),
      ),
      1,
    );

  it('sends a puck forward however hard the paddle rams it', () => {
    const after = ram(50);

    expect(after.puck.velocity.y).toBeLessThan(0);
    expect(after.puck.at.y).toBeLessThan(after.paddles.p0.at.y);
  });

  it('keeps a rammed puck on the side it was struck', () => {
    const after = ram(55);

    expect(after.puck.velocity.y).toBeLessThan(0);
    expect(after.puck.velocity.x).toBeGreaterThan(0);
    expect(after.puck.at.x).toBeGreaterThan(50);
  });

  /* A paddle sitting in the puck's path, close enough to be touching it. */
  const facing = (
    velocity: Vec,
    hand: Vec = { x: 0, y: 0 },
  ): AirHockeyState => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    return board({
      puck: { at: { x: MID_X, y: centre.y - TOUCHING + 1 }, velocity },
      paddles: {
        p0: {
          at: { x: centre.x - hand.x, y: centre.y - hand.y },
          target: centre,
        },
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });
  };

  it('turns the puck around and pushes it clear of the paddle', () => {
    const hit = run(facing({ x: 0, y: 60 }), 1);
    const gap = Math.hypot(
      hit.puck.at.x - MID_X,
      hit.puck.at.y - (HALFWAY + 30),
    );

    expect(hit.puck.velocity.y).toBeLessThan(0);
    expect(gap).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });

  it('sends the puck off the side of the paddle it actually struck', () => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    const glancing = board({
      puck: {
        at: { x: centre.x + 6, y: centre.y - TOUCHING + 2 },
        velocity: { x: 0, y: 60 },
      },
      paddles: {
        p0: still(centre),
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    expect(run(glancing, 1).puck.velocity.x).toBeGreaterThan(0);
  });

  /* A hit bounces the puck off the paddle, so it leaves faster than the paddle
     was moving. Leaving at the paddle's own speed, it rode along stuck to the
     face of a hand that kept moving. */
  it('bounces off a paddle that keeps pushing, rather than riding it', () => {
    const start = { x: MID_X, y: HALFWAY + 60 };
    let state = board({
      puck: {
        at: { x: MID_X, y: start.y - TOUCHING - 1 },
        velocity: { x: 0, y: 0 },
      },
      paddles: {
        p0: still(start),
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });
    // The hand keeps coming at 180 units a second, an ordinary swing.
    for (let i = 0; i < 20; i++) {
      const at = state.paddles.p0.at;
      state = tick(
        {
          ...state,
          paddles: {
            ...state.paddles,
            p0: { at, target: { x: at.x, y: at.y - 3 } },
          },
        },
        STEP_MS,
        context(),
      );
    }

    const gap = Math.hypot(
      state.puck.at.x - state.paddles.p0.at.x,
      state.puck.at.y - state.paddles.p0.at.y,
    );
    expect(gap).toBeGreaterThan(TOUCHING + 20);
  });

  it('adds speed when the paddle is moving into it', () => {
    const parked = speedOf(run(facing({ x: 0, y: 20 }), 1).puck.velocity);
    const swung = speedOf(
      run(facing({ x: 0, y: 20 }, { x: 0, y: -3 }), 1).puck.velocity,
    );

    expect(swung).toBeGreaterThan(parked);
  });

  /* The reason the transfer is capped at all: a pointer can cross the table
     between two ticks, and that must not become an arbitrarily hard shot. */
  it('caps what a flung paddle can add', () => {
    const flung = speedOf(
      run(facing({ x: 0, y: 20 }, { x: 0, y: -80 }), 1).puck.velocity,
    );

    expect(flung).toBeLessThanOrEqual(PUCK.maxSpeed + 1e-9);
  });

  it('never lets the puck past its speed ceiling', () => {
    let state = facing({ x: 0, y: PUCK.maxSpeed }, { x: 0, y: -60 });
    for (let i = 0; i < 40; i++) state = run(state, 1);

    expect(speedOf(state.puck.velocity)).toBeLessThanOrEqual(
      PUCK.maxSpeed + 1e-9,
    );
  });

  /* Puck tunnelling is ruled out by arithmetic rather than by collision code:
     capped, it cannot cover its own contact radius within a tick. */
  it('keeps the puck slow enough that it can never cross a paddle in one tick', () => {
    expect(PUCK.maxSpeed / 60).toBeLessThan(TOUCHING);
  });

  it('turns back a puck arriving at full speed', () => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    const incoming = board({
      puck: {
        at: { x: MID_X, y: centre.y - TOUCHING - PUCK.maxSpeed / 120 },
        velocity: { x: 0, y: PUCK.maxSpeed },
      },
      paddles: {
        p0: still(centre),
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    const after = run(incoming, 2);

    expect(after.puck.velocity.y).toBeLessThan(0);
    expect(after.puck.at.y).toBeLessThan(centre.y);
  });

  /* The paddle is the thing with no speed limit, so it is the thing that can
     skip over the puck. A hand crossing its own half in one tick moves further
     between slices than the puck is wide. */
  it('does not let a flung paddle jump over the puck', () => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    const swept = board({
      puck: { at: { x: MID_X, y: centre.y - 40 }, velocity: { x: 0, y: 0 } },
      paddles: {
        p0: { at: centre, target: { x: MID_X, y: centre.y - 80 } },
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    expect(speedOf(run(swept, 1).puck.velocity)).toBeGreaterThan(0);
  });
});

describe('Air Hockey — the pinch', () => {
  /* Both paddles on the halfway line sit fourteen apart, and the puck wants
     twelve from each. It cannot have both, so it leaves sideways. */
  it('squeezes the puck out sideways instead of burying it in a paddle', () => {
    const top = { x: MID_X, y: HALFWAY - PADDLE.radius };
    const bottom = { x: MID_X, y: HALFWAY + PADDLE.radius };
    const pinched = board({
      puck: { at: { x: MID_X, y: HALFWAY + 0.5 }, velocity: { x: 0, y: 0 } },
      paddles: { p0: still(bottom), p1: still(top) },
    });

    const out = run(pinched, 1).puck.at;

    expect(Math.hypot(out.x - top.x, out.y - top.y)).toBeGreaterThanOrEqual(
      TOUCHING - 1e-9,
    );
    expect(
      Math.hypot(out.x - bottom.x, out.y - bottom.y),
    ).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });

  it('leaves a puck touching only one paddle where that paddle put it', () => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    const single = board({
      puck: {
        at: { x: MID_X, y: centre.y - TOUCHING + 1 },
        velocity: { x: 0, y: 30 },
      },
      paddles: {
        p0: still(centre),
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    const out = run(single, 1).puck.at;

    expect(out.x).toBe(MID_X);
    expect(
      Math.hypot(out.x - centre.x, out.y - centre.y),
    ).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });

  it('keeps the squeezed puck on the table', () => {
    const against = { x: PUCK.radius, y: HALFWAY };
    const cornered = board({
      puck: { at: against, velocity: { x: 0, y: 0 } },
      paddles: {
        p0: still({ x: PUCK.radius, y: HALFWAY + PADDLE.radius }),
        p1: still({ x: PUCK.radius, y: HALFWAY - PADDLE.radius }),
      },
    });

    const out = run(cornered, 1).puck.at;
    const top = { x: PUCK.radius, y: HALFWAY - PADDLE.radius };
    const bottom = { x: PUCK.radius, y: HALFWAY + PADDLE.radius };

    expect(out.x).toBeGreaterThanOrEqual(PUCK.radius);
    expect(out.x).toBeLessThanOrEqual(TABLE.width - PUCK.radius);
    // Escaping into the wall is not an escape; it has to leave the other way.
    expect(Math.hypot(out.x - top.x, out.y - top.y)).toBeGreaterThanOrEqual(
      TOUCHING - 1e-9,
    );
    expect(
      Math.hypot(out.x - bottom.x, out.y - bottom.y),
    ).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });
});

describe('Air Hockey — nothing ever ends inside a paddle', () => {
  /* While it waits the puck is a ghost: paddles pass through it and it stays
     on its spot, so nobody can hit it before it is live. */
  it('lets a paddle pass through a waiting puck without moving it', () => {
    const spot = { x: MID_X, y: TABLE.height * 0.75 };
    const camped = board({
      puck: { at: spot, velocity: { x: 0, y: 0 } },
      faceOff: { inMs: FACE_OFF_MS, toward: 'p0' },
      paddles: {
        p0: { at: { x: MID_X - 20, y: spot.y }, target: spot },
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    const after = run(camped, 2);

    expect(after.paddles.p0.at).toEqual(spot);
    expect(after.puck.at).toEqual(spot);
    expect(after.puck.velocity).toEqual({ x: 0, y: 0 });
  });

  it('drops the puck clear even if someone is already standing on the spot', () => {
    const spot = { x: MID_X, y: TABLE.height * 0.75 };
    const camped = board({
      faceOff: { inMs: STEP_MS / 2, toward: 'p0' },
      paddles: {
        p0: still(spot),
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    const dropped = run(camped, 1);

    expect(dropped.faceOff.inMs).toBe(0);
    expect(
      Math.hypot(dropped.puck.at.x - spot.x, dropped.puck.at.y - spot.y),
    ).toBeCloseTo(TOUCHING, 9);
  });

  /* The cases above are the ones worth naming. This one is the actual promise:
     whatever the paddles and puck were doing, a tick never leaves them
     overlapping — so the puck always meets the edge of a paddle, never its
     inside. Seeded, so a failure is reproducible. */
  it('slides the puck around a paddle pinning it to the end wall, not into it', () => {
    const against = { x: 80, y: TABLE.height - PADDLE.radius };
    const pinned = board({
      puck: {
        at: { x: 80, y: TABLE.height - PUCK.radius },
        velocity: { x: 0, y: 0 },
      },
      paddles: {
        p0: still(against),
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    const out = run(pinned, 1).puck.at;

    expect(out.y).toBeLessThanOrEqual(TABLE.height - PUCK.radius + 1e-9);
    expect(
      Math.hypot(out.x - against.x, out.y - against.y),
    ).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });

  it('holds across a sweep of positions, speeds and paddle lunges', () => {
    const random = createRandom(20260907);
    const spread = (low: number, high: number): number =>
      low + (random.int(0, 10_000) / 10_000) * (high - low);
    const inHalf = (player: PlayerId): Vec => ({
      x: spread(PADDLE.radius, TABLE.width - PADDLE.radius),
      y:
        player === 'p0'
          ? spread(HALFWAY + PADDLE.radius, TABLE.height - PADDLE.radius)
          : spread(PADDLE.radius, HALFWAY - PADDLE.radius),
    });

    let worst = Infinity;
    let inBoards = 0;
    for (let trial = 0; trial < 3_000; trial++) {
      const before = board({
        puck: {
          at: {
            x: spread(PUCK.radius, TABLE.width - PUCK.radius),
            y: spread(PUCK.radius, TABLE.height - PUCK.radius),
          },
          velocity: {
            x: spread(-PUCK.maxSpeed, PUCK.maxSpeed),
            y: spread(-PUCK.maxSpeed, PUCK.maxSpeed),
          },
        },
        paddles: {
          p0: { at: inHalf('p0'), target: inHalf('p0') },
          p1: { at: inHalf('p1'), target: inHalf('p1') },
        },
        faceOff: {
          inMs: trial % 4 === 0 ? STEP_MS / 2 : 0,
          toward: trial % 2 === 0 ? 'p0' : 'p1',
        },
      });

      const after = tick(before, STEP_MS, context());
      for (const player of ['p0', 'p1'] as const) {
        const centre = after.paddles[player].at;
        worst = Math.min(
          worst,
          Math.hypot(after.puck.at.x - centre.x, after.puck.at.y - centre.y),
        );
      }

      /* Being shoved through the boards is worse than being overlapped, so the
         same sweep watches for it. The mouth is not a wall: a puck on its way in
         is allowed past the line. */
      const { x, y } = after.puck.at;
      const inMouth = Math.abs(x - MID_X) <= GOAL.width / 2;
      const buried =
        x < PUCK.radius - 1e-9 ||
        x > TABLE.width - PUCK.radius + 1e-9 ||
        ((y < PUCK.radius - 1e-9 || y > TABLE.height - PUCK.radius + 1e-9) &&
          !inMouth);
      if (buried) inBoards += 1;
    }

    expect(worst).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
    expect(inBoards).toBe(0);
  });
});

describe('Air Hockey — camped against the boards', () => {
  /* The sweep above starts the puck anywhere, which almost never reproduces a
     paddle that has already driven it into a corner. This one starts every
     trial from exactly that: a paddle on a wall with the puck under it. */
  it('clears the puck off a paddle pinned to any wall, without burying it in the boards', () => {
    const random = createRandom(9070);
    const spread = (low: number, high: number): number =>
      low + (random.int(0, 10_000) / 10_000) * (high - low);

    let worst = Infinity;
    let inBoards = 0;
    const edges = [PADDLE.radius, TABLE.width - PADDLE.radius];

    for (let trial = 0; trial < 2_000; trial++) {
      // A paddle jammed into a wall, or a corner of its own half.
      const p0At = {
        x:
          trial % 3 === 0
            ? edges[trial % 2]
            : spread(PADDLE.radius, TABLE.width - PADDLE.radius),
        y:
          trial % 2 === 0
            ? TABLE.height - PADDLE.radius
            : HALFWAY + PADDLE.radius,
      };
      const p1At = {
        x:
          trial % 5 === 0
            ? edges[trial % 2]
            : spread(PADDLE.radius, TABLE.width - PADDLE.radius),
        y: trial % 2 === 0 ? PADDLE.radius : HALFWAY - PADDLE.radius,
      };
      // The puck starting right under one of them, which is what camping does.
      const under = trial % 2 === 0 ? p0At : p1At;

      const after = tick(
        board({
          puck: {
            at: { x: under.x + spread(-3, 3), y: under.y + spread(-3, 3) },
            velocity: { x: spread(-40, 40), y: spread(-40, 40) },
          },
          paddles: { p0: still(p0At), p1: still(p1At) },
          faceOff: { inMs: trial % 4 === 0 ? STEP_MS / 2 : 0, toward: 'p0' },
        }),
        STEP_MS,
        context(),
      );

      const { x, y } = after.puck.at;
      for (const player of ['p0', 'p1'] as const) {
        const centre = after.paddles[player].at;
        worst = Math.min(worst, Math.hypot(x - centre.x, y - centre.y));
      }

      const mouth = Math.abs(x - MID_X) <= GOAL.width / 2;
      if (
        x < PUCK.radius - 1e-9 ||
        x > TABLE.width - PUCK.radius + 1e-9 ||
        ((y < PUCK.radius - 1e-9 || y > TABLE.height - PUCK.radius + 1e-9) &&
          !mouth)
      ) {
        inBoards += 1;
      }
    }

    expect(worst).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
    expect(inBoards).toBe(0);
  });
});

describe('Air Hockey — scoring', () => {
  it('ends the match at the target score', () => {
    expect(AirHockey.isTerminal(board())).toBeNull();
    expect(
      AirHockey.isTerminal(board({ scores: { p0: TARGET_SCORE - 1, p1: 0 } })),
    ).toBeNull();
    expect(
      AirHockey.isTerminal(board({ scores: { p0: TARGET_SCORE, p1: 2 } })),
    ).toEqual({
      winner: 'p0',
    });
    expect(
      AirHockey.isTerminal(board({ scores: { p0: 2, p1: TARGET_SCORE } })),
    ).toEqual({
      winner: 'p1',
    });
  });
});

describe('Air Hockey — who just scored', () => {
  it('names the scorer while the puck waits to come back', () => {
    // The puck is dropped to whoever conceded, so p1 scored here.
    const waiting = board({
      scores: { p0: 0, p1: 1 },
      faceOff: { inMs: FACE_OFF_MS, toward: 'p0' },
    });

    expect(justScored(waiting)).toBe('p1');
  });

  it('names nobody before the first goal, or once play is back on', () => {
    expect(
      justScored(board({ faceOff: { inMs: FACE_OFF_MS, toward: 'p1' } })),
    ).toBeNull();
    expect(justScored(board({ scores: { p0: 3, p1: 1 } }))).toBeNull();
  });

  it('names the scorer of a real goal', () => {
    // Into the top mouth, which p1 defends.
    const state = run(
      board({
        puck: { at: { x: MID_X, y: 2 }, velocity: { x: 0, y: -PUCK.maxSpeed } },
      }),
      10,
    );

    expect(state.scores).toEqual({ p0: 1, p1: 0 });
    expect(justScored(state)).toBe('p0');
  });
});

describe('Air Hockey — how the puck shows after a goal', () => {
  const afterGoal = (inMs: number) =>
    board({ scores: { p0: 1, p1: 0 }, faceOff: { inMs, toward: 'p1' } });

  it('hides it, then blinks it for the grace period, then shows it', () => {
    expect(puckLook(afterGoal(FACE_OFF_MS))).toBe('hidden');
    expect(puckLook(afterGoal(GRACE_MS + 1))).toBe('hidden');
    expect(puckLook(afterGoal(GRACE_MS))).toBe('blinking');
    expect(puckLook(afterGoal(1))).toBe('blinking');
    expect(puckLook(afterGoal(0))).toBe('solid');
  });

  it('shows it plainly through the opening countdown', () => {
    expect(puckLook(AirHockey.setup(context()))).toBe('solid');
  });
});

describe('Air Hockey — drawing the puck in front of a fast paddle', () => {
  const centre = { x: 50, y: 100 };
  const up = { x: 0, y: -1 };

  it('puts a puck the paddle has run through back in front of it', () => {
    // Dead behind the paddle, as a fast ram leaves the delayed puck.
    expect(inFrontOf({ x: 50, y: 104 }, centre, up)).toEqual({
      x: 50,
      y: 100 - TOUCHING,
    });
  });

  it('keeps how far off-centre the puck was', () => {
    const out = inFrontOf({ x: 53, y: 102 }, centre, up);

    expect(out.x).toBe(53);
    expect(Math.hypot(out.x - centre.x, out.y - centre.y)).toBeCloseTo(
      TOUCHING,
      9,
    );
    expect(out.y).toBeLessThan(centre.y);
  });

  it('leaves a puck that is already clear ahead alone', () => {
    const clear = { x: 50, y: 100 - TOUCHING - 3 };

    expect(inFrontOf(clear, centre, up)).toEqual(clear);
  });

  it('leaves a puck off to the side, which the paddle never reached', () => {
    const beside = { x: 50 + TOUCHING + 1, y: 104 };

    expect(inFrontOf(beside, centre, up)).toEqual(beside);
  });
});

describe('Air Hockey — determinism', () => {
  it('lands in the same place from the same seed and the same inputs', () => {
    const play = (): AirHockeyState => {
      const ctx = context(99);
      let state = AirHockey.setup(ctx);
      for (let i = 0; i < 400; i++) {
        if (i === 60)
          state = AirHockey.reduce(
            state,
            { type: 'AIM', x: 50, y: 120 },
            'p0',
            ctx,
          );
        if (i === 90)
          state = AirHockey.reduce(
            state,
            { type: 'AIM', x: 40, y: 80 },
            'p1',
            ctx,
          );
        state = tick(state, STEP_MS, ctx);
      }
      return state;
    };

    expect(play()).toEqual(play());
  });
});
