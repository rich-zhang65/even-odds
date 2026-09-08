import type { PlayerId } from '@even-odds/game-sdk';

/* Abstract units, never pixels: the table is 100 wide by 200 tall whatever the
   viewport is, and the client scales it at render. Coupling the simulation to a
   screen size would make the physics depend on who is watching. */
export const TABLE = { width: 100, height: 200 } as const;

export const PADDLE = { width: 20, thickness: 3, inset: 5 } as const;
export const BALL = {
  radius: 2,
  speed: 90,
  speedUp: 1.04,
  maxSpeed: 170,
} as const;

export const SERVE_DELAY_MS = 900;
export const TARGET_SCORE = 7;

export type Vec = { x: number; y: number };

export type PongState = {
  ball: { at: Vec; velocity: Vec };

  /* Just where along the near edge each paddle sits. A pointer sets it outright
     rather than steering toward it, so there is no velocity to carry between
     ticks and nothing for the sim to advance. */
  paddles: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;

  /* Between a goal and the next serve the ball sits on the centre spot and
     nothing moves it. It then goes to whoever was just scored on. */
  serve: { inMs: number; toward: PlayerId };
};

export type PongAction = { type: 'AIM'; x: number };
