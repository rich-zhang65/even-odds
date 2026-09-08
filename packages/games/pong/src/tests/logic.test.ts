import { describe, expect, it } from "vitest";
import { createRandom } from "@even-odds/game-sdk";
import type { EngineContext, PlayerId } from "@even-odds/game-sdk";
import { Pong } from "../logic";
import { BALL, PADDLE, SERVE_DELAY_MS, TABLE, TARGET_SCORE } from "../types";
import type { PongState } from "../types";

const STEP_MS = 1000 / 60;

const tick = Pong.tick;

const MID_X = TABLE.width / 2;
const MIN_X = PADDLE.width / 2;
const MAX_X = TABLE.width - PADDLE.width / 2;

const context = (seed = 1): EngineContext => ({
  matchId: "m1",
  players: ["p0", "p1"],
  random: createRandom(seed),
  now: 0,
});

const run = (state: PongState, ticks: number, ctx = context()): PongState => {
  let next = state;
  for (let i = 0; i < ticks; i++) next = tick(next, STEP_MS, ctx);
  return next;
};

/* Physics tests build the exact situation rather than playing into it, so a
   failure names one rule instead of a whole rally. */
const board = (overrides: Partial<PongState> = {}): PongState => ({
  ball: { at: { x: MID_X, y: TABLE.height / 2 }, velocity: { x: 0, y: 0 } },
  paddles: { p0: MID_X, p1: MID_X },
  scores: { p0: 0, p1: 0 },
  serve: { inMs: 0, toward: "p0" },
  ...overrides,
});

/* Both paddles parked under the ball, so a rally runs indefinitely without a
   test having to steer. */
const covering = (state: PongState): PongState => ({
  ...state,
  paddles: { p0: state.ball.at.x, p1: state.ball.at.x },
});

describe("Pong — serving", () => {
  it("holds the ball on the spot until the delay runs out", () => {
    const waiting = run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p0" } }), 3);

    expect(waiting.ball.velocity).toEqual({ x: 0, y: 0 });
    expect(waiting.ball.at).toEqual({ x: MID_X, y: TABLE.height / 2 });
    expect(waiting.serve.inMs).toBeLessThan(SERVE_DELAY_MS);
  });

  it("sends the ball toward whoever it is served to", () => {
    const ticks = Math.ceil(SERVE_DELAY_MS / STEP_MS);

    // p0 defends the bottom, so a serve to p0 travels down the table.
    expect(
      run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p0" } }), ticks).ball.velocity.y,
    ).toBeGreaterThan(0);
    expect(
      run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p1" } }), ticks).ball.velocity.y,
    ).toBeLessThan(0);
  });

  it("serves at an angle that is neither flat nor steep", () => {
    const ticks = Math.ceil(SERVE_DELAY_MS / STEP_MS);
    const { velocity } = run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p1" } }), ticks).ball;

    expect(Math.abs(velocity.x)).toBeLessThan(Math.abs(velocity.y));
  });
});

describe("Pong — paddles", () => {
  it("puts the paddle exactly where it was aimed, and only that paddle", () => {
    const aimed = Pong.reduce(board(), { type: "AIM", x: 30 }, "p0", context());

    expect(aimed.paddles.p0).toBe(30);
    expect(aimed.paddles.p1).toBe(MID_X);
  });

  it("clamps an aim that would put the paddle through the wall", () => {
    expect(Pong.reduce(board(), { type: "AIM", x: 1000 }, "p0", context()).paddles.p0).toBe(MAX_X);
    expect(Pong.reduce(board(), { type: "AIM", x: -1000 }, "p0", context()).paddles.p0).toBe(MIN_X);
  });

  it("leaves paddles alone as time passes, since only an aim moves them", () => {
    const still = run(board({ paddles: { p0: 30, p1: 70 } }), 60);

    expect(still.paddles).toEqual({ p0: 30, p1: 70 });
  });

  it("refuses an aim that is not a real number", () => {
    expect(Pong.isLegal(board(), { type: "AIM", x: Number.NaN }, "p0", context())).toBe(false);
    expect(Pong.isLegal(board(), { type: "AIM", x: Infinity }, "p0", context())).toBe(false);
    expect(Pong.isLegal(board(), { type: "AIM", x: 30 }, "p0", context())).toBe(true);
  });
});

describe("Pong — the ball", () => {
  it("reflects off the left and right walls", () => {
    const drifting = board({
      ball: {
        at: { x: BALL.radius + 0.5, y: 100 },
        velocity: { x: -60, y: 0 },
      },
    });

    const bounced = run(drifting, 1);

    expect(bounced.ball.velocity.x).toBeGreaterThan(0);
    expect(bounced.ball.at.x).toBeGreaterThanOrEqual(BALL.radius);
  });

  it("turns the ball around when a paddle is in the way", () => {
    const incoming = board({
      ball: {
        at: { x: MID_X, y: TABLE.height - PADDLE.inset - 1 },
        velocity: { x: 0, y: 90 },
      },
    });

    const hit = run(incoming, 1);

    expect(hit.ball.velocity.y).toBeLessThan(0);
    expect(hit.scores).toEqual({ p0: 0, p1: 0 });
  });

  it("takes its outgoing angle from where it struck the paddle", () => {
    const at = (x: number) =>
      run(
        board({
          ball: {
            at: { x, y: TABLE.height - PADDLE.inset - 1 },
            velocity: { x: 0, y: 90 },
          },
        }),
        1,
      ).ball.velocity.x;

    expect(Math.abs(at(MID_X))).toBeLessThan(1);
    expect(at(MID_X + PADDLE.width / 2)).toBeGreaterThan(10);
    expect(at(MID_X - PADDLE.width / 2)).toBeLessThan(-10);
  });

  it("speeds up on every return, up to a ceiling", () => {
    let state = board({
      ball: {
        at: { x: MID_X, y: TABLE.height - PADDLE.inset - 1 },
        velocity: { x: 0, y: BALL.speed },
      },
    });
    state = run(state, 1);
    const afterOne = Math.hypot(state.ball.velocity.x, state.ball.velocity.y);

    expect(afterOne).toBeGreaterThan(BALL.speed);

    for (let i = 0; i < 400; i++) state = run(covering(state), 1);

    expect(Math.hypot(state.ball.velocity.x, state.ball.velocity.y)).toBeLessThanOrEqual(
      BALL.maxSpeed + 1e-9,
    );
  });
});

describe("Pong — scoring", () => {
  const pastP0 = board({
    ball: { at: { x: 20, y: TABLE.height - 0.5 }, velocity: { x: 0, y: 90 } },
    paddles: { p0: 80, p1: MID_X },
  });

  it("gives the point to the other player when the ball leaves a wall", () => {
    expect(run(pastP0, 1).scores).toEqual({ p0: 0, p1: 1 });
  });

  it("re-serves toward whoever was just scored on", () => {
    const conceded = run(pastP0, 1);

    expect(conceded.serve).toEqual({ inMs: SERVE_DELAY_MS, toward: "p0" });
    expect(conceded.ball.velocity).toEqual({ x: 0, y: 0 });
  });

  it("ends the match at the target score", () => {
    expect(Pong.isTerminal(board())).toBeNull();
    expect(Pong.isTerminal(board({ scores: { p0: TARGET_SCORE - 1, p1: 0 } }))).toBeNull();
    expect(Pong.isTerminal(board({ scores: { p0: TARGET_SCORE, p1: 2 } }))).toEqual({
      winner: "p0",
    });
    expect(Pong.isTerminal(board({ scores: { p0: 2, p1: TARGET_SCORE } }))).toEqual({
      winner: "p1",
    });
  });
});

describe("Pong — determinism", () => {
  it("lands in the same place from the same seed and the same inputs", () => {
    const play = (): PongState => {
      const ctx = context(99);
      let state = Pong.setup(ctx);
      for (let i = 0; i < 400; i++) {
        if (i === 20) state = Pong.reduce(state, { type: "AIM", x: 70 }, "p0", ctx);
        if (i === 90) state = Pong.reduce(state, { type: "AIM", x: 25 }, "p1", ctx);
        state = tick(state, STEP_MS, ctx);
      }
      return state;
    };

    expect(play()).toEqual(play());
  });

  it("picks the opening serve from the seed, and both sides are reachable", () => {
    const opening = (seed: number): PlayerId => Pong.setup(context(seed)).serve.toward;

    expect(opening(7)).toBe(opening(7));

    /* A spread rather than 1..6: mulberry32's first draw is correlated across
       small sequential seeds, so those six all open the same way. Matches are
       seeded from Math.random() * 2**31, which is nowhere near that regime. */
    const seen = [1, 7, 41, 1_000, 65_537, 1_234_567].map(opening);
    expect(seen).toContain("p0");
    expect(seen).toContain("p1");
  });
});
