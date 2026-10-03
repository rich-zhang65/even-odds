import type { PlayerId, TurnBasedGame } from '@even-odds/game-sdk';
import { assets } from './assets';
import { BOARD, RUN } from './types';
import type { Cell, GomokuAction, GomokuState, Stone } from './types';

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

/* Four axes, not eight: a line and its reverse are the same line, so each is
   walked in both directions from the stone that was just played. */
const AXES: Cell[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
];

const same = (one: Cell, other: Cell): boolean =>
  one.x === other.x && one.y === other.y;

const onBoard = (cell: Cell): boolean =>
  Number.isInteger(cell.x) &&
  Number.isInteger(cell.y) &&
  cell.x >= 0 &&
  cell.x < BOARD &&
  cell.y >= 0 &&
  cell.y < BOARD;

export const stoneAt = (stones: Stone[], cell: Cell): Stone | undefined =>
  stones.find((stone) => same(stone.at, cell));

/* Every stone of one colour touching `from` along one axis, in board order. */
const lineThrough = (stones: Stone[], from: Stone, axis: Cell): Cell[] => {
  const reach = (step: number): Cell[] => {
    const found: Cell[] = [];
    for (let out = 1; out < BOARD; out++) {
      const at = {
        x: from.at.x + axis.x * out * step,
        y: from.at.y + axis.y * out * step,
      };
      if (stoneAt(stones, at)?.by !== from.by) return found;
      found.push(at);
    }
    return found;
  };

  return [...reach(-1).reverse(), from.at, ...reach(1)];
};

/* The line that won, or null. Only the stone just played can have completed
   one, so this looks at that stone alone rather than sweeping the board --
   which also means a win is found the moment it is made.

   Exported so the client can draw the five it was won with instead of working
   them out again and disagreeing about which five. */
export const winningLine = (
  state: GomokuState,
): { line: Cell[]; by: PlayerId } | null => {
  const last = state.stones[state.stones.length - 1];
  if (last === undefined) return null;

  for (const axis of AXES) {
    const line = lineThrough(state.stones, last, axis);
    if (line.length >= RUN) return { line, by: last.by };
  }

  return null;
};

export const Gomoku: TurnBasedGame<GomokuState, GomokuAction> = {
  mode: 'turn-based',

  meta: {
    id: 'gomoku',
    name: 'Gomoku',
    tagline: 'Five in a row, any direction',
    estimatedMinutes: 6,
    assets,
  },

  setup: () => ({ stones: [], turn: 'p0' }),

  currentPlayer: (state) => state.turn,

  isLegal: (state, action) =>
    onBoard(action.at) && stoneAt(state.stones, action.at) === undefined,

  reduce: (state, action, by) => ({
    stones: [...state.stones, { at: action.at, by }],
    turn: OPPONENT[by],
  }),

  isTerminal: (state) => {
    const won = winningLine(state);
    if (won !== null) return { winner: won.by };

    return state.stones.length === BOARD * BOARD
      ? { draw: true, reason: 'the board is full' }
      : null;
  },
};
