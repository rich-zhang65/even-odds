import type { PlayerId } from "@even-odds/game-sdk";

/* Abstract units, never pixels: the table is 100 wide by 200 tall whatever the
   viewport is, and the client scales it at render. Coupling the simulation to a
   screen size would make the physics depend on who is watching. */
export const TABLE = { width: 100, height: 200 } as const;

/* A mouth in the middle of each end rather than the whole open edge, so the
   corners are somewhere to hide the puck rather than somewhere to lose it. */
export const GOAL = { width: 36 } as const;

export const PADDLE = { radius: 7, maxTransfer: 110 } as const;
export const PUCK = { radius: 5, maxSpeed: 190, damping: 0.35 } as const;

/* Slices per tick, so the puck meets the walls and the paddles in roughly the
   order it really would. It is not what prevents tunnelling: the puck is capped
   well below its own radius per tick, and a paddle has no speed limit at all, so
   that job belongs to the swept collision test rather than to more slices. */
export const SUB_STEPS = 4;

export const FACE_OFF_MS = 900;
export const TARGET_SCORE = 7;

export type Vec = { x: number; y: number };

export type AirHockeyState = {
  puck: { at: Vec; velocity: Vec };

  /* A paddle reaches its target in one tick, so the distance between the two is
     exactly how fast the hand behind it was moving — which is what a strike
     carries into the puck. */
  paddles: Record<PlayerId, { at: Vec; target: Vec }>;
  scores: Record<PlayerId, number>;

  /* After a goal the puck waits, then appears in the half of whoever was just
     scored on. Conceding buys you possession. */
  faceOff: { inMs: number; toward: PlayerId };
};

export type AirHockeyAction = { type: "AIM"; x: number; y: number };
