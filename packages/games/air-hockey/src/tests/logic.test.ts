import { describe, expect, it } from "vitest";
import { createRandom } from "@even-odds/game-sdk";
import type { EngineContext, PlayerId } from "@even-odds/game-sdk";
import { AirHockey } from "../logic";
import { FACE_OFF_MS, GOAL, PADDLE, PUCK, TABLE, TARGET_SCORE } from "../types";
import type { AirHockeyState, Vec } from "../types";

const STEP_MS = 1000 / 60;

const tick = AirHockey.tick;

const MID_X = TABLE.width / 2;
const HALFWAY = TABLE.height / 2;
const TOUCHING = PUCK.radius + PADDLE.radius;

const context = (seed = 1): EngineContext => ({
  matchId: "m1",
  players: ["p0", "p1"],
  random: createRandom(seed),
  now: 0,
});

const run = (state: AirHockeyState, ticks: number, ctx = context()): AirHockeyState => {
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
  faceOff: { inMs: 0, toward: "p0" },
  ...overrides,
});

const speedOf = (v: Vec): number => Math.hypot(v.x, v.y);

describe("Air Hockey — the face-off", () => {
  it("holds the puck until the delay runs out", () => {
    const waiting = run(board({ faceOff: { inMs: FACE_OFF_MS, toward: "p0" } }), 3);

    expect(waiting.puck.velocity).toEqual({ x: 0, y: 0 });
    expect(waiting.faceOff.inMs).toBeLessThan(FACE_OFF_MS);
  });

  it("drops the puck in the half of whoever was just scored on, at rest", () => {
    const ticks = Math.ceil(FACE_OFF_MS / STEP_MS);
    const toP0 = run(board({ faceOff: { inMs: FACE_OFF_MS, toward: "p0" } }), ticks);
    const toP1 = run(board({ faceOff: { inMs: FACE_OFF_MS, toward: "p1" } }), ticks);

    expect(toP0.puck.at.y).toBeGreaterThan(HALFWAY);
    expect(toP1.puck.at.y).toBeLessThan(HALFWAY);
    expect(toP0.puck.velocity).toEqual({ x: 0, y: 0 });
  });

  it("still lets the paddles move while the puck waits", () => {
    const waiting = run(
      board({
        faceOff: { inMs: FACE_OFF_MS, toward: "p0" },
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

describe("Air Hockey — paddles", () => {
  it("keeps a paddle inside its own half", () => {
    const overreach = AirHockey.reduce(board(), { type: "AIM", x: 50, y: 10 }, "p0", context());
    const undereach = AirHockey.reduce(board(), { type: "AIM", x: 50, y: 190 }, "p1", context());

    expect(overreach.paddles.p0.target.y).toBe(HALFWAY + PADDLE.radius);
    expect(undereach.paddles.p1.target.y).toBe(HALFWAY - PADDLE.radius);
  });

  it("keeps a paddle inside the side walls", () => {
    const wide = AirHockey.reduce(board(), { type: "AIM", x: 999, y: 150 }, "p0", context());

    expect(wide.paddles.p0.target.x).toBe(TABLE.width - PADDLE.radius);
  });

  it("arrives at its target within the tick", () => {
    const aimed = board({
      paddles: {
        p0: { at: { x: 20, y: 150 }, target: { x: 80, y: 170 } },
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });

    expect(run(aimed, 1).paddles.p0.at).toEqual({ x: 80, y: 170 });
  });

  it("refuses an aim that is not a pair of real numbers", () => {
    const at = board();

    expect(AirHockey.isLegal(at, { type: "AIM", x: Number.NaN, y: 5 }, "p0", context())).toBe(
      false,
    );
    expect(AirHockey.isLegal(at, { type: "AIM", x: 5, y: Infinity }, "p0", context())).toBe(false);
    expect(AirHockey.isLegal(at, { type: "AIM", x: 50, y: 150 }, "p0", context())).toBe(true);
  });
});

describe("Air Hockey — the puck", () => {
  it("reflects off the long sides", () => {
    const drifting = board({
      puck: { at: { x: PUCK.radius + 0.5, y: HALFWAY }, velocity: { x: -60, y: 0 } },
    });

    const bounced = run(drifting, 1);

    expect(bounced.puck.velocity.x).toBeGreaterThan(0);
    expect(bounced.puck.at.x).toBeGreaterThanOrEqual(PUCK.radius);
  });

  it("reflects off the end wall beside the mouth", () => {
    const wide = GOAL.width / 2 + PUCK.radius + 5;
    const atCorner = board({
      puck: { at: { x: MID_X + wide, y: PUCK.radius + 0.5 }, velocity: { x: 0, y: -60 } },
    });

    const bounced = run(atCorner, 1);

    expect(bounced.puck.velocity.y).toBeGreaterThan(0);
    expect(bounced.scores).toEqual({ p0: 0, p1: 0 });
  });

  it("goes in through the mouth", () => {
    const onTarget = board({
      puck: { at: { x: MID_X, y: PUCK.radius }, velocity: { x: 0, y: -120 } },
    });

    const scored = run(onTarget, 3);

    expect(scored.scores).toEqual({ p0: 1, p1: 0 });
    expect(scored.faceOff).toEqual({ inMs: FACE_OFF_MS, toward: "p1" });
  });

  it("slows down while nothing is touching it", () => {
    const gliding = board({ puck: { at: { x: MID_X, y: HALFWAY }, velocity: { x: 40, y: 0 } } });

    expect(speedOf(run(gliding, 30).puck.velocity)).toBeLessThan(40);
  });
});

describe("Air Hockey — striking", () => {
  /* A paddle sitting in the puck's path, close enough to be touching it. */
  const facing = (velocity: Vec, hand: Vec = { x: 0, y: 0 }): AirHockeyState => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    return board({
      puck: { at: { x: MID_X, y: centre.y - TOUCHING + 1 }, velocity },
      paddles: {
        p0: { at: { x: centre.x - hand.x, y: centre.y - hand.y }, target: centre },
        p1: still({ x: PADDLE.radius, y: PADDLE.radius }),
      },
    });
  };

  it("turns the puck around and pushes it clear of the paddle", () => {
    const hit = run(facing({ x: 0, y: 60 }), 1);
    const gap = Math.hypot(hit.puck.at.x - MID_X, hit.puck.at.y - (HALFWAY + 30));

    expect(hit.puck.velocity.y).toBeLessThan(0);
    expect(gap).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });

  it("sends the puck off the side of the paddle it actually struck", () => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    const glancing = board({
      puck: { at: { x: centre.x + 6, y: centre.y - TOUCHING + 2 }, velocity: { x: 0, y: 60 } },
      paddles: { p0: still(centre), p1: still({ x: PADDLE.radius, y: PADDLE.radius }) },
    });

    expect(run(glancing, 1).puck.velocity.x).toBeGreaterThan(0);
  });

  it("adds speed when the paddle is moving into it", () => {
    const parked = speedOf(run(facing({ x: 0, y: 20 }), 1).puck.velocity);
    const swung = speedOf(run(facing({ x: 0, y: 20 }, { x: 0, y: -3 }), 1).puck.velocity);

    expect(swung).toBeGreaterThan(parked);
  });

  /* The reason the transfer is capped at all: a pointer can cross the table
     between two ticks, and that must not become an arbitrarily hard shot. */
  it("caps what a flung paddle can add", () => {
    const flung = speedOf(run(facing({ x: 0, y: 20 }, { x: 0, y: -80 }), 1).puck.velocity);

    expect(flung).toBeLessThanOrEqual(PUCK.maxSpeed + 1e-9);
  });

  it("never lets the puck past its speed ceiling", () => {
    let state = facing({ x: 0, y: PUCK.maxSpeed }, { x: 0, y: -60 });
    for (let i = 0; i < 40; i++) state = run(state, 1);

    expect(speedOf(state.puck.velocity)).toBeLessThanOrEqual(PUCK.maxSpeed + 1e-9);
  });

  /* Puck tunnelling is ruled out by arithmetic rather than by collision code:
     capped, it cannot cover its own contact radius within a tick. */
  it("keeps the puck slow enough that it can never cross a paddle in one tick", () => {
    expect(PUCK.maxSpeed / 60).toBeLessThan(TOUCHING);
  });

  it("turns back a puck arriving at full speed", () => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    const incoming = board({
      puck: {
        at: { x: MID_X, y: centre.y - TOUCHING - PUCK.maxSpeed / 120 },
        velocity: { x: 0, y: PUCK.maxSpeed },
      },
      paddles: { p0: still(centre), p1: still({ x: PADDLE.radius, y: PADDLE.radius }) },
    });

    const after = run(incoming, 2);

    expect(after.puck.velocity.y).toBeLessThan(0);
    expect(after.puck.at.y).toBeLessThan(centre.y);
  });

  /* The paddle is the thing with no speed limit, so it is the thing that can
     skip over the puck. A hand crossing its own half in one tick moves further
     between slices than the puck is wide. */
  it("does not let a flung paddle jump over the puck", () => {
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

describe("Air Hockey — the pinch", () => {
  /* Both paddles on the halfway line sit fourteen apart, and the puck wants
     twelve from each. It cannot have both, so it leaves sideways. */
  it("squeezes the puck out sideways instead of burying it in a paddle", () => {
    const top = { x: MID_X, y: HALFWAY - PADDLE.radius };
    const bottom = { x: MID_X, y: HALFWAY + PADDLE.radius };
    const pinched = board({
      puck: { at: { x: MID_X, y: HALFWAY + 0.5 }, velocity: { x: 0, y: 0 } },
      paddles: { p0: still(bottom), p1: still(top) },
    });

    const out = run(pinched, 1).puck.at;

    expect(Math.hypot(out.x - top.x, out.y - top.y)).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
    expect(Math.hypot(out.x - bottom.x, out.y - bottom.y)).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });

  it("leaves a puck touching only one paddle where that paddle put it", () => {
    const centre = { x: MID_X, y: HALFWAY + 30 };
    const single = board({
      puck: { at: { x: MID_X, y: centre.y - TOUCHING + 1 }, velocity: { x: 0, y: 30 } },
      paddles: { p0: still(centre), p1: still({ x: PADDLE.radius, y: PADDLE.radius }) },
    });

    const out = run(single, 1).puck.at;

    expect(out.x).toBe(MID_X);
    expect(Math.hypot(out.x - centre.x, out.y - centre.y)).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });

  it("keeps the squeezed puck on the table", () => {
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
    expect(Math.hypot(out.x - top.x, out.y - top.y)).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
    expect(Math.hypot(out.x - bottom.x, out.y - bottom.y)).toBeGreaterThanOrEqual(TOUCHING - 1e-9);
  });
});

describe("Air Hockey — scoring", () => {
  it("ends the match at the target score", () => {
    expect(AirHockey.isTerminal(board())).toBeNull();
    expect(AirHockey.isTerminal(board({ scores: { p0: TARGET_SCORE - 1, p1: 0 } }))).toBeNull();
    expect(AirHockey.isTerminal(board({ scores: { p0: TARGET_SCORE, p1: 2 } }))).toEqual({
      winner: "p0",
    });
    expect(AirHockey.isTerminal(board({ scores: { p0: 2, p1: TARGET_SCORE } }))).toEqual({
      winner: "p1",
    });
  });
});

describe("Air Hockey — determinism", () => {
  it("lands in the same place from the same seed and the same inputs", () => {
    const play = (): AirHockeyState => {
      const ctx = context(99);
      let state = AirHockey.setup(ctx);
      for (let i = 0; i < 400; i++) {
        if (i === 60) state = AirHockey.reduce(state, { type: "AIM", x: 50, y: 120 }, "p0", ctx);
        if (i === 90) state = AirHockey.reduce(state, { type: "AIM", x: 40, y: 80 }, "p1", ctx);
        state = tick(state, STEP_MS, ctx);
      }
      return state;
    };

    expect(play()).toEqual(play());
  });

  it("picks the opening face-off from the seed, and both sides are reachable", () => {
    const opening = (seed: number): PlayerId => AirHockey.setup(context(seed)).faceOff.toward;

    expect(opening(7)).toBe(opening(7));

    /* A spread rather than 1..6: mulberry32's first draw is correlated across
       small sequential seeds, so those six all open the same way. */
    const seen = [1, 7, 41, 1_000, 65_537, 1_234_567].map(opening);
    expect(seen).toContain("p0");
    expect(seen).toContain("p1");
  });
});
