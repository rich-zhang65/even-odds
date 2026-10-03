import type { PlayerId } from '@even-odds/game-sdk';

/* Ten by ten, the size everyone already knows. Coordinates are cells rather
   than pixels: the client scales the grid at render. */
export const BOARD = 10;

/* The standard fleet. Two ships are three cells long, so length alone does not
   identify a vessel -- the id does, and the name is what gets announced when
   one goes down. */
export const FLEET = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
] as const;

export type ShipId = (typeof FLEET)[number]['id'];

export type Facing = 'across' | 'down';

export type Cell = { x: number; y: number };

export type Ship = { id: ShipId; at: Cell; facing: Facing };

/* Whether a shot hit is recorded when it is taken rather than worked out later
   from the ships. The player who fired has to be told the outcome without
   being told where the fleet is, and that is only possible if the answer is
   already in the state. */
export type Shot = { at: Cell; hit: boolean };

export type Board = { ships: Ship[]; incoming: Shot[] };

/* Spelled out per phase rather than carrying a turn through deployment, where
   nobody is firing and the value could not mean anything. Who is on the clock
   while deploying follows from who has a fleet, so it needs no field. */
export type BattleshipState =
  | { phase: 'deploying'; boards: Record<PlayerId, Board> }
  | { phase: 'firing'; boards: Record<PlayerId, Board>; turn: PlayerId };

export type BattleshipAction =
  { type: 'DEPLOY'; ships: Ship[] } | { type: 'FIRE'; at: Cell };
