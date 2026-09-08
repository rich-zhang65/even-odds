import type { EngineContext, GameDefinition, PlayerId, RandomAPI } from "@even-odds/game-sdk";
import { assets } from "./assets";
import { BALL, PADDLE, SERVE_DELAY_MS, TABLE, TARGET_SCORE } from "./types";
import type { PongAction, PongState, Vec } from "./types";

const OPPONENT: Record<PlayerId, PlayerId> = { p0: "p1", p1: "p0" };

/* p0 defends the left edge, p1 the right. Both are planes rather than boxes: the
   ball is tested against a half-space, which is why nothing here can tunnel
   through a paddle however fast it is travelling. */
const PADDLE_X: Record<PlayerId, number> = {
  p0: PADDLE.inset,
  p1: TABLE.width - PADDLE.inset,
};

/* The countdown is subtracted a step at a time and 1000/60 has no exact float
   representation, so it lands a hair above zero instead of on it and costs an
   extra tick. Well under any real duration, well over the error. */
const SLACK_MS = 1e-6;

const HALF_PADDLE = PADDLE.height / 2;
const MIN_Y = HALF_PADDLE;
const MAX_Y = TABLE.height - HALF_PADDLE;
const CENTRE: Vec = { x: TABLE.width / 2, y: TABLE.height / 2 };

const clamp = (value: number, low: number, high: number): number =>
  value < low ? low : value > high ? high : value;

const speedOf = (v: Vec): number => Math.hypot(v.x, v.y);

/* Serves at a shallow angle, never flat and never steep, so a rally starts
   readable. The angle comes from the seeded RNG, so a replay of the same match
   serves the same way. */
const serveVelocity = (random: RandomAPI, toward: PlayerId): Vec => {
  const steepness = (random.int(-45, 45) / 100) * BALL.speed;
  return {
    x: toward === "p0" ? -BALL.speed : BALL.speed,
    y: steepness,
  };
};

const restingBall = (): PongState["ball"] => ({
  at: { ...CENTRE },
  velocity: { x: 0, y: 0 },
});

const concede = (state: PongState, to: PlayerId): PongState => ({
  ...state,
  ball: restingBall(),
  scores: { ...state.scores, [to]: state.scores[to] + 1 },
  serve: { inMs: SERVE_DELAY_MS, toward: OPPONENT[to] },
});

/* Where the ball strikes the paddle sets the outgoing angle: dead centre goes
   back flat, the edges kick it away. That is the only control a player has over
   direction, so it is the whole game. */
const deflect = (velocity: Vec, offset: number): Vec => {
  const speed = Math.min(speedOf(velocity) * BALL.speedUp, BALL.maxSpeed);
  const angle = offset * 0.6;
  const heading = { x: velocity.x < 0 ? 1 : -1, y: angle };
  const length = Math.hypot(heading.x, heading.y);
  return { x: (heading.x / length) * speed, y: (heading.y / length) * speed };
};

const bounceOffPaddle = (state: PongState, player: PlayerId): PongState | null => {
  const plane = PADDLE_X[player];
  const heading = player === "p0" ? -1 : 1;
  const { at, velocity } = state.ball;

  if (Math.sign(velocity.x) !== heading) return null;

  const reached = player === "p0" ? at.x - BALL.radius <= plane : at.x + BALL.radius >= plane;
  if (!reached) return null;

  const offset = (at.y - state.paddles[player].y) / HALF_PADDLE;
  if (Math.abs(offset) > 1 + BALL.radius / HALF_PADDLE) return null;

  return {
    ...state,
    ball: {
      at: { x: plane - heading * BALL.radius, y: at.y },
      velocity: deflect(velocity, clamp(offset, -1, 1)),
    },
  };
};

const movePaddles = (state: PongState, dt: number): PongState => ({
  ...state,
  paddles: {
    p0: {
      ...state.paddles.p0,
      y: clamp(state.paddles.p0.y + state.paddles.p0.dir * PADDLE.speed * dt, MIN_Y, MAX_Y),
    },
    p1: {
      ...state.paddles.p1,
      y: clamp(state.paddles.p1.y + state.paddles.p1.dir * PADDLE.speed * dt, MIN_Y, MAX_Y),
    },
  },
});

const moveBall = (state: PongState, dt: number): PongState => {
  const { at, velocity } = state.ball;
  let next: Vec = { x: at.x + velocity.x * dt, y: at.y + velocity.y * dt };
  let heading = velocity;

  // Top and bottom are walls: reflect and push clear, so a ball cannot stick.
  if (next.y - BALL.radius <= 0 && heading.y < 0) {
    next = { ...next, y: BALL.radius };
    heading = { ...heading, y: -heading.y };
  } else if (next.y + BALL.radius >= TABLE.height && heading.y > 0) {
    next = { ...next, y: TABLE.height - BALL.radius };
    heading = { ...heading, y: -heading.y };
  }

  const moved: PongState = { ...state, ball: { at: next, velocity: heading } };

  const struck = bounceOffPaddle(moved, "p0") ?? bounceOffPaddle(moved, "p1");
  if (struck !== null) return struck;

  if (next.x < 0) return concede(moved, "p1");
  if (next.x > TABLE.width) return concede(moved, "p0");

  return moved;
};

export const Pong: GameDefinition<PongState, PongAction> = {
  meta: {
    id: "pong",
    name: "Pong",
    tagline: "Keep it off your wall",
    estimatedMinutes: 3,
    mode: "realtime",
    assets,
  },

  tickRateHz: 60,

  setup: (ctx) => ({
    ball: restingBall(),
    paddles: {
      p0: { y: TABLE.height / 2, dir: 0 },
      p1: { y: TABLE.height / 2, dir: 0 },
    },
    scores: { p0: 0, p1: 0 },
    serve: { inMs: SERVE_DELAY_MS, toward: ctx.random.int(0, 1) === 0 ? "p0" : "p1" },
  }),

  /* Required by GameDefinition, meaningless here: both players act on the same
     tick and RealtimeSnapshot carries no such field, so nothing reads it. */
  currentPlayer: () => "p0",

  isLegal: (_state, action) => action.dir === -1 || action.dir === 0 || action.dir === 1,

  reduce: (state, action, by) => ({
    ...state,
    paddles: { ...state.paddles, [by]: { ...state.paddles[by], dir: action.dir } },
  }),

  tick: (state, dtMs, ctx: EngineContext) => {
    const dt = dtMs / 1000;
    const withPaddles = movePaddles(state, dt);

    if (withPaddles.serve.inMs > 0) {
      const inMs = withPaddles.serve.inMs - dtMs;
      if (inMs > SLACK_MS) {
        return { ...withPaddles, serve: { ...withPaddles.serve, inMs } };
      }
      return {
        ...withPaddles,
        ball: {
          at: { ...CENTRE },
          velocity: serveVelocity(ctx.random, withPaddles.serve.toward),
        },
        serve: { ...withPaddles.serve, inMs: 0 },
      };
    }

    return moveBall(withPaddles, dt);
  },

  isTerminal: (state) => {
    if (state.scores.p0 >= TARGET_SCORE) return { winner: "p0" };
    if (state.scores.p1 >= TARGET_SCORE) return { winner: "p1" };
    return null;
  },
};
