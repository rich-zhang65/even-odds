import type { PlayerId } from "@even-odds/game-sdk";

/* Abstract units, never pixels: the table is 200 wide by 100 tall whatever the
   viewport is, and the client scales it at render. Coupling the simulation to a
   screen size would make the physics depend on who is watching. */
export const TABLE = { width: 200, height: 100 } as const;

export const PADDLE = { height: 20, inset: 5, speed: 70 } as const;
export const BALL = { radius: 2, speed: 90, speedUp: 1.04, maxSpeed: 170 } as const;

export const SERVE_DELAY_MS = 900;
export const TARGET_SCORE = 7;

export type Direction = -1 | 0 | 1;

export type Vec = { x: number; y: number };

export type PongState = {
  ball: { at: Vec; velocity: Vec };
  paddles: Record<PlayerId, { y: number; dir: Direction }>;
  scores: Record<PlayerId, number>;

  /* Between a goal and the next serve the ball sits on the centre spot and
     nothing moves it. It then goes to whoever was just scored on. */
  serve: { inMs: number; toward: PlayerId };
};

export type PongAction = { type: "SET_DIR"; dir: Direction };
