import type {
  EngineContext,
  PlayerId,
  RandomAPI,
  RealtimeGame,
} from '@even-odds/game-sdk';
import { assets } from './assets';
import { BALL, PADDLE, SERVE_DELAY_MS, TABLE, TARGET_SCORE } from './types';
import type { PongAction, PongState, Vec } from './types';

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

/* p0 defends the near edge, p1 the far one. Both are planes rather than boxes:
   the ball is tested against a half-space, which is why nothing here can tunnel
   through a paddle however fast it is travelling. */
const PADDLE_Y: Record<PlayerId, number> = {
  p0: TABLE.height - PADDLE.inset,
  p1: PADDLE.inset,
};

/* The countdown is subtracted a step at a time and 1000/60 has no exact float
   representation, so it lands a hair above zero instead of on it and costs an
   extra tick. Well under any real duration, well over the error. */
const SLACK_MS = 1e-6;

const HALF_PADDLE = PADDLE.width / 2;
const MIN_X = HALF_PADDLE;
const MAX_X = TABLE.width - HALF_PADDLE;
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
    x: steepness,
    y: toward === 'p1' ? -BALL.speed : BALL.speed,
  };
};

const restingBall = (): PongState['ball'] => ({
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
  const heading = { x: angle, y: velocity.y < 0 ? 1 : -1 };
  const length = Math.hypot(heading.x, heading.y);
  return { x: (heading.x / length) * speed, y: (heading.y / length) * speed };
};

const bounceOffPaddle = (
  state: PongState,
  player: PlayerId,
): PongState | null => {
  const plane = PADDLE_Y[player];
  const heading = player === 'p1' ? -1 : 1;
  const { at, velocity } = state.ball;

  if (Math.sign(velocity.y) !== heading) return null;

  const reached =
    player === 'p1' ? at.y - BALL.radius <= plane : at.y + BALL.radius >= plane;
  if (!reached) return null;

  const offset = (at.x - state.paddles[player]) / HALF_PADDLE;
  if (Math.abs(offset) > 1 + BALL.radius / HALF_PADDLE) return null;

  return {
    ...state,
    ball: {
      at: { x: at.x, y: plane - heading * BALL.radius },
      velocity: deflect(velocity, clamp(offset, -1, 1)),
    },
  };
};

const moveBall = (state: PongState, dt: number): PongState => {
  const { at, velocity } = state.ball;
  let next: Vec = { x: at.x + velocity.x * dt, y: at.y + velocity.y * dt };
  let heading = velocity;

  // Left and right are walls: reflect and push clear, so a ball cannot stick.
  if (next.x - BALL.radius <= 0 && heading.x < 0) {
    next = { ...next, x: BALL.radius };
    heading = { ...heading, x: -heading.x };
  } else if (next.x + BALL.radius >= TABLE.width && heading.x > 0) {
    next = { ...next, x: TABLE.width - BALL.radius };
    heading = { ...heading, x: -heading.x };
  }

  const moved: PongState = { ...state, ball: { at: next, velocity: heading } };

  const struck = bounceOffPaddle(moved, 'p0') ?? bounceOffPaddle(moved, 'p1');
  if (struck !== null) return struck;

  if (next.y < 0) return concede(moved, 'p0');
  if (next.y > TABLE.height) return concede(moved, 'p1');

  return moved;
};

export const Pong: RealtimeGame<PongState, PongAction> = {
  mode: 'realtime',

  meta: {
    id: 'pong',
    name: 'Pong',
    tagline: 'Keep it off your wall',
    estimatedMinutes: 3,
    assets,
  },

  tickRateHz: 60,

  setup: (ctx) => ({
    ball: restingBall(),
    paddles: { p0: TABLE.width / 2, p1: TABLE.width / 2 },
    scores: { p0: 0, p1: 0 },
    serve: {
      inMs: SERVE_DELAY_MS,
      toward: ctx.random.int(0, 1) === 0 ? 'p0' : 'p1',
    },
  }),

  isLegal: (_state, action) => Number.isFinite(action.x),

  reduce: (state, action, by) => ({
    ...state,
    paddles: { ...state.paddles, [by]: clamp(action.x, MIN_X, MAX_X) },
  }),

  /* Paddles are absent here on purpose: a pointer sets one outright, so there is
     nothing to integrate between ticks and the only thing time moves is the ball. */
  tick: (state, dtMs, ctx: EngineContext) => {
    if (state.serve.inMs > 0) {
      const inMs = state.serve.inMs - dtMs;
      if (inMs > SLACK_MS) {
        return { ...state, serve: { ...state.serve, inMs } };
      }
      return {
        ...state,
        ball: {
          at: { ...CENTRE },
          velocity: serveVelocity(ctx.random, state.serve.toward),
        },
        serve: { ...state.serve, inMs: 0 },
      };
    }

    return moveBall(state, dtMs / 1000);
  },

  isTerminal: (state) => {
    if (state.scores.p0 >= TARGET_SCORE) return { winner: 'p0' };
    if (state.scores.p1 >= TARGET_SCORE) return { winner: 'p1' };
    return null;
  },
};
