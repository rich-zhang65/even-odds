import type { PlayerId } from '@even-odds/game-sdk';

/* Fifteen square, the standard gomoku board. Stones sit on intersections, so a
   coordinate is a point rather than a square. */
export const BOARD = 15;

/* Five in a row wins, and so does six or more. Free-style rather than the
   tournament rule where an overline is not a win -- a player who lines up six
   has plainly won, and telling them otherwise is the kind of surprise a casual
   game can do without. */
export const RUN = 5;

export type Cell = { x: number; y: number };

export type Stone = { at: Cell; by: PlayerId };

export type GomokuState = {
  /* In play order, rather than a grid of 225 mostly-empty slots. The order is
     what lets the client mark the stone just played, and a finished game is
     usually well under a hundred stones. */
  stones: Stone[];
  turn: PlayerId;
};

export type GomokuAction = { type: 'PLACE'; at: Cell };
