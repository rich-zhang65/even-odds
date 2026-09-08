import { describe, expect, it } from "vitest";
import { createRandom } from "@even-odds/game-sdk";
import type { EngineContext, PlayerId } from "@even-odds/game-sdk";
import { Pong } from "../logic";
import { BALL, PADDLE, SERVE_DELAY_MS, TABLE, TARGET_SCORE } from "../types";
import type { Direction, PongState } from "../types";

const STEP_MS = 1000 / 60;

const tick = Pong.tick;

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
  ball: { at: { x: TABLE.width / 2, y: TABLE.height / 2 }, velocity: { x: 0, y: 0 } },
  paddles: { p0: { y: 50, dir: 0 }, p1: { y: 50, dir: 0 } },
  scores: { p0: 0, p1: 0 },
  serve: { inMs: 0, toward: "p0" },
  ...overrides,
});

const facing = (player: PlayerId, dir: Direction): PongState["paddles"] => ({
  p0: { y: 50, dir: player === "p0" ? dir : 0 },
  p1: { y: 50, dir: player === "p1" ? dir : 0 },
});

describe("Pong — serving", () => {
  it("holds the ball on the spot until the delay runs out", () => {
    const waiting = run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p0" } }), 3);

    expect(waiting.ball.velocity).toEqual({ x: 0, y: 0 });
    expect(waiting.ball.at).toEqual({ x: TABLE.width / 2, y: TABLE.height / 2 });
    expect(waiting.serve.inMs).toBeLessThan(SERVE_DELAY_MS);
  });

  it("sends the ball toward whoever it is served to", () => {
    const ticks = Math.ceil(SERVE_DELAY_MS / STEP_MS);

    expect(
      run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p0" } }), ticks).ball.velocity.x,
    ).toBeLessThan(0);
    expect(
      run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p1" } }), ticks).ball.velocity.x,
    ).toBeGreaterThan(0);
  });

  it("serves at an angle that is neither flat nor steep", () => {
    const ticks = Math.ceil(SERVE_DELAY_MS / STEP_MS);
    const { velocity } = run(board({ serve: { inMs: SERVE_DELAY_MS, toward: "p1" } }), ticks).ball;

    expect(Math.abs(velocity.y)).toBeLessThan(Math.abs(velocity.x));
  });
});

describe("Pong — paddles", () => {
  it("moves a paddle in the direction it was set, and only that paddle", () => {
    const moved = run(board({ paddles: facing("p0", -1) }), 10);

    expect(moved.paddles.p0.y).toBeLessThan(50);
    expect(moved.paddles.p1.y).toBe(50);
  });

  it("stops a paddle at the wall instead of letting it leave the table", () => {
    const top = run(board({ paddles: facing("p0", -1) }), 600);
    const bottom = run(board({ paddles: facing("p1", 1) }), 600);

    expect(top.paddles.p0.y).toBe(PADDLE.height / 2);
    expect(bottom.paddles.p1.y).toBe(TABLE.height - PADDLE.height / 2);
  });

  it("takes a direction from an action without moving anything itself", () => {
    const set = Pong.reduce(board(), { type: "SET_DIR", dir: 1 }, "p1", context());

    expect(set.paddles.p1.dir).toBe(1);
    expect(set.paddles.p1.y).toBe(50);
    expect(set.paddles.p0.dir).toBe(0);
  });

  it("refuses a direction that is not one of the three", () => {
    const illegal = { type: "SET_DIR", dir: 7 } as unknown as { type: "SET_DIR"; dir: Direction };

    expect(Pong.isLegal(board(), illegal, "p0", context())).toBe(false);
    expect(Pong.isLegal(board(), { type: "SET_DIR", dir: -1 }, "p0", context())).toBe(true);
  });
});

describe("Pong — the ball", () => {
  it("reflects off the top and bottom walls", () => {
    const rising = board({
      ball: { at: { x: 100, y: BALL.radius + 0.5 }, velocity: { x: 0, y: -60 } },
    });

    const bounced = run(rising, 1);

    expect(bounced.ball.velocity.y).toBeGreaterThan(0);
    expect(bounced.ball.at.y).toBeGreaterThanOrEqual(BALL.radius);
  });

  it("turns the ball around when a paddle is in the way", () => {
    const incoming = board({
      ball: { at: { x: PADDLE.inset + 1, y: 50 }, velocity: { x: -90, y: 0 } },
    });

    const hit = run(incoming, 1);

    expect(hit.ball.velocity.x).toBeGreaterThan(0);
    expect(hit.scores).toEqual({ p0: 0, p1: 0 });
  });

  it("takes its outgoing angle from where it struck the paddle", () => {
    const at = (y: number) =>
      run(
        board({
          ball: { at: { x: PADDLE.inset + 1, y }, velocity: { x: -90, y: 0 } },
          paddles: { p0: { y: 50, dir: 0 }, p1: { y: 50, dir: 0 } },
        }),
        1,
      ).ball.velocity.y;

    expect(Math.abs(at(50))).toBeLessThan(1);
    expect(at(50 + PADDLE.height / 2)).toBeGreaterThan(10);
    expect(at(50 - PADDLE.height / 2)).toBeLessThan(-10);
  });

  it("speeds up on every return, up to a ceiling", () => {
    let state = board({
      ball: { at: { x: PADDLE.inset + 1, y: 50 }, velocity: { x: -BALL.speed, y: 0 } },
    });
    state = run(state, 1);
    const afterOne = Math.hypot(state.ball.velocity.x, state.ball.velocity.y);

    expect(afterOne).toBeGreaterThan(BALL.speed);

    // Drive a long rally by keeping both paddles under the ball.
    for (let i = 0; i < 400; i++) {
      state = {
        ...state,
        paddles: { p0: { y: state.ball.at.y, dir: 0 }, p1: { y: state.ball.at.y, dir: 0 } },
      };
      state = run(state, 1);
    }

    expect(Math.hypot(state.ball.velocity.x, state.ball.velocity.y)).toBeLessThanOrEqual(
      BALL.maxSpeed + 1e-9,
    );
  });
});

describe("Pong — scoring", () => {
  it("gives the point to the other player when the ball leaves a wall", () => {
    const past = board({
      ball: { at: { x: 0.5, y: 10 }, velocity: { x: -90, y: 0 } },
      paddles: { p0: { y: 90, dir: 0 }, p1: { y: 50, dir: 0 } },
    });

    const conceded = run(past, 1);

    expect(conceded.scores).toEqual({ p0: 0, p1: 1 });
  });

  it("re-serves toward whoever was just scored on", () => {
    const past = board({
      ball: { at: { x: 0.5, y: 10 }, velocity: { x: -90, y: 0 } },
      paddles: { p0: { y: 90, dir: 0 }, p1: { y: 50, dir: 0 } },
    });

    const conceded = run(past, 1);

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
        if (i === 20) state = Pong.reduce(state, { type: "SET_DIR", dir: 1 }, "p0", ctx);
        if (i === 90) state = Pong.reduce(state, { type: "SET_DIR", dir: -1 }, "p1", ctx);
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
