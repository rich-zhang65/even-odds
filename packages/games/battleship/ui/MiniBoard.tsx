'use client';

import { cx } from '@even-odds/design-system/ui';
import type { SeatTheme } from '@even-odds/game-sdk/ui';
import { EVERY_CELL } from './Waters';
import { isSunk, shipAt } from '../src/logic';
import type { Board, Cell } from '../src/types';

/* What one square of a mini board shows. Too small for pegs and hulls, so each
   square is a single colour: a sunk ship whole in its owner's colour, a hit in
   the shooter's, a miss greyed, a ship still afloat faded. */
const squareLook = (
  board: Board,
  cell: Cell,
  owner: SeatTheme,
  shooter: SeatTheme,
): string => {
  const ship = shipAt(board.ships, cell);
  const shot = board.incoming.find(
    (fired) => fired.at.x === cell.x && fired.at.y === cell.y,
  );

  if (ship !== undefined && isSunk(board, ship)) return owner.solid;
  if (shot !== undefined) return shot.hit ? shooter.solid : 'bg-eo-faint';
  if (ship !== undefined) return cx(owner.solid, 'opacity-55');
  return owner.soft;
};

/* The board not on screen, small enough to sit in the tray, and the way to
   swap to it. It carries the same coloured edge as the full board when the
   next shot lands there. */
export const MiniBoard = ({
  board,
  owner,
  shooter,
  title,
  edge,
  onOpen,
}: {
  board: Board;
  owner: SeatTheme;
  shooter: SeatTheme;
  title: string;
  edge: string | null;
  onOpen: () => void;
}) => (
  <button
    className="flex cursor-pointer flex-col items-center gap-1.5"
    type="button"
    aria-label={`Show ${title}`}
    onClick={onOpen}
  >
    <span
      className={cx(
        'grid size-24 grid-cols-10 grid-rows-10 gap-px overflow-hidden rounded-eo-xs border-2 bg-eo-hairline',
        edge ?? 'border-eo-strong',
      )}
    >
      {EVERY_CELL.map((cell) => (
        <span
          className={squareLook(board, cell, owner, shooter)}
          key={`${cell.x},${cell.y}`}
        />
      ))}
    </span>
    <span className="font-eo-display text-sm font-semibold text-eo-strong">
      {title}
    </span>
  </button>
);
