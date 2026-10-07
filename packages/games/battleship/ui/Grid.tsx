'use client';

import type { PointerEvent } from 'react';
import { cx } from '@even-odds/design-system/ui';
import { BOARD } from '../src/types';
import type { Cell } from '../src/types';

/* What a square is showing, worst news last: a sunk cell is also a hit, and a
   hit is also a ship, so the later state wins when both are true. */
export type CellLook = 'water' | 'ship' | 'miss' | 'hit' | 'sunk';

// Ships and hits take their colour from whoever's waters these are.
const LOOKS: Record<'water' | 'miss' | 'sunk', string> = {
  water: 'bg-eo-sunken',
  miss: 'bg-eo-sunken',
  sunk: 'bg-eo-strong',
};

const COLUMNS = 'ABCDEFGHIJ';

export const cellName = (cell: Cell): string =>
  `${COLUMNS[cell.x] ?? '?'}${cell.y + 1}`;

const EVERY_CELL: Cell[] = Array.from(
  { length: BOARD * BOARD },
  (_, index) => ({
    x: index % BOARD,
    y: Math.floor(index / BOARD),
  }),
);

export const Grid = ({
  look,
  shipTint,
  hitTint,
  preview,
  previewBad = false,
  reach,
  label,
  dropTarget = false,
  onCell,
  onGrab,
  onAim,
}: {
  look: (cell: Cell) => CellLook;
  shipTint: string;
  hitTint: string;
  preview: Cell[];
  previewBad?: boolean;
  /* Null when nothing on this grid can be acted on, which also takes every
     square out of the tab order rather than leaving a hundred dead stops. */
  reach: ((cell: Cell) => boolean) | null;
  label: string;
  /* Marks every square so a ship dragged over the page can find it, and stops a
     touch on the grid from scrolling instead of dragging. */
  dropTarget?: boolean;
  onCell?: (cell: Cell) => void;
  onGrab?: (cell: Cell, event: PointerEvent<HTMLButtonElement>) => void;
  onAim?: (cell: Cell | null) => void;
}) => (
  <div
    className="grid gap-px rounded-eo-sm bg-eo-hairline p-px"
    style={{ gridTemplateColumns: `repeat(${BOARD}, minmax(0, 1fr))` }}
    role="group"
    aria-label={label}
    onPointerLeave={() => onAim?.(null)}
  >
    {EVERY_CELL.map((cell) => {
      const showing = look(cell);
      const shown = preview.some(
        (part) => part.x === cell.x && part.y === cell.y,
      );
      const live = reach?.(cell) ?? false;

      return (
        <button
          className={cx(
            'relative aspect-square w-full transition-colors duration-(--eo-duration-fast)',
            showing === 'ship'
              ? shipTint
              : showing === 'hit'
                ? hitTint
                : LOOKS[showing],
            shown && (previewBad ? 'bg-eo-lose/40' : 'bg-eo-live-soft'),
            live && 'cursor-pointer hover:brightness-125',
            !live && 'cursor-default',
            dropTarget && 'touch-none select-none',
          )}
          key={`${cell.x},${cell.y}`}
          type="button"
          disabled={!live}
          aria-label={`${label}, ${cellName(cell)}`}
          data-drop-x={dropTarget ? cell.x : undefined}
          data-drop-y={dropTarget ? cell.y : undefined}
          onClick={() => onCell?.(cell)}
          onPointerDown={(event) => onGrab?.(cell, event)}
          onPointerEnter={() => onAim?.(cell)}
          onFocus={() => onAim?.(cell)}
        >
          {showing === 'miss' && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="size-1/4 rounded-full bg-eo-muted" />
            </span>
          )}
        </button>
      );
    })}
  </div>
);
