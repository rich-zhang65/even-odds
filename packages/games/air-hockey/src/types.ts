import type { PlayerId } from '@even-odds/game-sdk';

/* Abstract units, never pixels: the table is 100 wide by 200 tall whatever the
   viewport is, and the client scales it at render. Coupling the simulation to a
   screen size would make the physics depend on who is watching. */
export const TABLE = { width: 100, height: 200 } as const;

/* A mouth in the middle of each end rather than the whole open edge, so the
   corners are somewhere to hide the puck rather than somewhere to lose it. */
export const GOAL = { width: 36 } as const;

/* maxTransfer is the most paddle speed a strike counts, so a flick across the
   table is not an arbitrarily hard shot. */
export const PADDLE = { radius: 7, maxTransfer: 220 } as const;

/* bounce is how much of the closing speed a strike gives back, measured against
   the paddle's own movement: a puck at rest hit by a paddle moving at u leaves
   at (1 + bounce) * u, faster than the paddle, so it flies off rather than
   riding along on the face of a hand that keeps coming. maxSpeed still keeps
   it well short of crossing a paddle in one tick. */
export const PUCK = {
  radius: 5,
  maxSpeed: 320,
  damping: 0.35,
  bounce: 0.9,
} as const;

/* Slices per tick, so the puck meets the walls and the paddles in roughly the
   order it really would. It is not what prevents tunnelling: the puck is capped
   well below its own radius per tick, and a paddle has no speed limit at all, so
   that job belongs to the swept collision test rather than to more slices. */
export const SUB_STEPS = 4;

/* The wait after a goal. The puck is hidden for the first part, then reappears
   on its spot and blinks for GRACE_MS, untouchable, before it goes live. */
export const FACE_OFF_MS = 1500;
export const GRACE_MS = 1000;

/* The opening wait, counted down 3, 2, 1 on screen. The game clock only runs
   once both players are in, so this starts the moment the second one arrives,
   and nobody is caught still loading when the puck goes live. */
export const OPENING_MS = 3000;
export const TARGET_SCORE = 7;

export type Vec = { x: number; y: number };

export type AirHockeyState = {
  puck: { at: Vec; velocity: Vec };

  /* A paddle reaches its target in one tick, so the distance between the two is
     exactly how fast the hand behind it was moving — which is what a strike
     carries into the puck. */
  paddles: Record<PlayerId, { at: Vec; target: Vec }>;
  scores: Record<PlayerId, number>;

  /* After a goal the puck waits on a spot in the half of whoever was just
     scored on: conceding buys you possession. The opening has nobody to favour,
     so `toward` is null and the puck sits on the centre spot. While it waits
     it is a ghost -- paddles pass through it -- and it goes live where it is. */
  faceOff: { inMs: number; toward: PlayerId | null };
};

export type AirHockeyAction = { type: 'AIM'; x: number; y: number };
