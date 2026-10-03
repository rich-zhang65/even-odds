import type { PlayerId, TurnBasedGame } from '@even-odds/game-sdk';
import { assets } from './assets';
import { BOARD, FLEET } from './types';
import type {
  BattleshipAction,
  BattleshipState,
  Board,
  Cell,
  Ship,
  ShipId,
} from './types';

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

const LENGTHS: Record<ShipId, number> = {
  carrier: 5,
  battleship: 4,
  cruiser: 3,
  submarine: 3,
  destroyer: 2,
};

const same = (one: Cell, other: Cell): boolean =>
  one.x === other.x && one.y === other.y;

const onBoard = (cell: Cell): boolean =>
  Number.isInteger(cell.x) &&
  Number.isInteger(cell.y) &&
  cell.x >= 0 &&
  cell.x < BOARD &&
  cell.y >= 0 &&
  cell.y < BOARD;

/* Every cell a ship occupies, from its bow along its facing. */
export const cellsOf = (ship: Ship): Cell[] =>
  Array.from({ length: LENGTHS[ship.id] }, (_, step) =>
    ship.facing === 'across'
      ? { x: ship.at.x + step, y: ship.at.y }
      : { x: ship.at.x, y: ship.at.y + step },
  );

/* Why a fleet is not deployable, or null when it is. Exported so the client can
   say what is wrong and keep the Ready button honest, rather than reimplementing
   the rules and drifting from them. */
export const fleetProblem = (ships: Ship[]): string | null => {
  if (ships.length !== FLEET.length) {
    return `A fleet is ${FLEET.length} ships`;
  }

  for (const { id, name } of FLEET) {
    const count = ships.filter((ship) => ship.id === id).length;
    if (count !== 1) return `Deploy exactly one ${name}`;
  }

  const taken: Cell[] = [];
  for (const ship of ships) {
    const cells = cellsOf(ship);
    if (cells.some((cell) => !onBoard(cell))) {
      return 'Every ship has to fit on the board';
    }
    if (cells.some((cell) => taken.some((used) => same(used, cell)))) {
      return 'Ships cannot overlap';
    }
    taken.push(...cells);
  }

  return null;
};

const struck = (board: Board, cell: Cell): boolean =>
  board.incoming.some((shot) => shot.hit && same(shot.at, cell));

export const isSunk = (board: Board, ship: Ship): boolean =>
  cellsOf(ship).every((cell) => struck(board, cell));

const wipedOut = (board: Board): boolean =>
  board.ships.length === FLEET.length &&
  board.ships.every((ship) => isSunk(board, ship));

const emptyBoard = (): Board => ({ ships: [], incoming: [] });

/* An opponent's board with the fleet taken out of it. Sunk ships stay, because
   a sunk ship is public -- its position is fully known from the hits that sank
   it, and the client has to draw the wreck and name it. */
const masked = (board: Board): Board => ({
  ships: board.ships.filter((ship) => isSunk(board, ship)),
  incoming: board.incoming,
});

export const Battleship: TurnBasedGame<BattleshipState, BattleshipAction> = {
  mode: 'turn-based',

  meta: {
    id: 'battleship',
    name: 'Battleship',
    tagline: 'Find the fleet before it finds yours',
    estimatedMinutes: 8,
    assets,
  },

  setup: () => ({
    phase: 'deploying',
    boards: { p0: emptyBoard(), p1: emptyBoard() },
  }),

  /* Deployment is taken one player at a time, so whoever still has no fleet is
     on the clock, and p0 goes first. */
  currentPlayer: (state) =>
    state.phase === 'firing'
      ? state.turn
      : state.boards.p0.ships.length === 0
        ? 'p0'
        : 'p1',

  isLegal: (state, action, by) => {
    if (action.type === 'DEPLOY') {
      if (state.phase !== 'deploying') return false;
      if (state.boards[by].ships.length > 0) return false;
      return fleetProblem(action.ships) === null;
    }

    if (state.phase !== 'firing') return false;
    if (!onBoard(action.at)) return false;
    // One shot per cell: firing into a known square wastes a turn for nothing.
    return !state.boards[OPPONENT[by]].incoming.some((shot) =>
      same(shot.at, action.at),
    );
  },

  reduce: (state, action, by) => {
    if (action.type === 'DEPLOY') {
      const boards = {
        ...state.boards,
        [by]: { ships: action.ships, incoming: state.boards[by].incoming },
      };

      /* Both fleets down means firing starts, and it starts with whoever
         deployed second. They sat through the other's setup; the first shot is
         what that buys them. */
      return boards.p0.ships.length > 0 && boards.p1.ships.length > 0
        ? { phase: 'firing', boards, turn: by }
        : { phase: 'deploying', boards };
    }

    if (state.phase !== 'firing') return state;

    const foe = OPPONENT[by];
    const target = state.boards[foe];
    const hit = target.ships.some((ship) =>
      cellsOf(ship).some((cell) => same(cell, action.at)),
    );

    return {
      phase: 'firing',
      turn: foe,
      boards: {
        ...state.boards,
        [foe]: {
          ships: target.ships,
          incoming: [...target.incoming, { at: action.at, hit }],
        },
      },
    };
  },

  isTerminal: (state) => {
    if (state.phase !== 'firing') return null;
    if (wipedOut(state.boards.p1)) return { winner: 'p0' };
    if (wipedOut(state.boards.p0)) return { winner: 'p1' };
    return null;
  },

  /* The whole game is the hidden fleet, so this is the first game where a
     snapshot must differ per viewer. Your own board is untouched; theirs loses
     everything still afloat. */
  playerView: (state, viewer) => {
    const boards = {
      ...state.boards,
      [OPPONENT[viewer]]: masked(state.boards[OPPONENT[viewer]]),
    };

    return state.phase === 'firing'
      ? { phase: 'firing', boards, turn: state.turn }
      : { phase: 'deploying', boards };
  },
};
