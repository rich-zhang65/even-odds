'use client';

import type { ReactNode, Ref } from 'react';
import { Card, cx } from '@even-odds/design-system/ui';
import type { SeatTheme } from '@even-odds/game-sdk/ui';
import { BOARD } from '../src/types';
import type { Cell } from '../src/types';

const COLUMNS = 'ABCDEFGHIJ';

export const cellName = (cell: Cell): string =>
  `${COLUMNS[cell.x] ?? '?'}${cell.y + 1}`;

export const EVERY_CELL: Cell[] = Array.from(
  { length: BOARD * BOARD },
  (_, index) => ({
    x: index % BOARD,
    y: Math.floor(index / BOARD),
  }),
);

/* One board in its card: a title over a square ten-by-ten frame.
   The squares are the children; ships and overlays sit on top of them, placed
   absolutely against the frame.

   Whose turn it is lives on the boards rather than in a corner of the page, so
   it cannot be missed while looking at one: the board the next shot lands on
   takes the shooter's colour round its edge and a pill naming the shot, and
   a board out of play fades. */
export const Waters = ({
  title,
  turn = null,
  dim = false,
  frame,
  footer,
  children,
}: {
  title: string;
  turn?: { label: string; seat: SeatTheme } | null;
  dim?: boolean;
  frame?: Ref<HTMLDivElement>;
  footer?: ReactNode;
  children: ReactNode;
}) => (
  <Card className={cx('p-4!', turn?.seat.border)} tone="outlined">
    <div className="mb-3 flex min-h-7 items-center justify-between gap-3">
      <span className="font-eo-display text-lg font-semibold text-eo-strong">
        {title}
      </span>
      {turn !== null && (
        <span
          className={cx(
            'flex items-center gap-2 rounded-eo-pill px-3 py-1 font-eo-display text-sm font-semibold text-eo-on-color',
            turn.seat.solid,
          )}
        >
          <span className="size-2 animate-eo-pulse rounded-full bg-white" />
          {turn.label}
        </span>
      )}
    </div>

    {/* A board ships are dragged onto keeps a touch for the drag rather than
        letting it scroll the page. */}
    <div
      className={cx(
        'relative grid aspect-square w-full grid-cols-10 grid-rows-10 gap-0.5 overflow-hidden rounded-eo-md border-2 border-eo-strong bg-eo-hairline',
        frame !== undefined && 'touch-none select-none',
        dim && 'opacity-45 transition-opacity duration-(--eo-duration-base)',
      )}
      ref={frame}
    >
      {children}
    </div>

    {footer !== undefined && (
      <div className="mt-3 flex flex-wrap justify-center gap-3">{footer}</div>
    )}
  </Card>
);

/* A shot's mark: a peg in the shooter's colour for a hit, a dot for a miss.
   Raised so a peg stays on top of a hull drawn over its square. A peg pops in
   on every board alike, which also replays it when a hidden board is shown. */
export const Mark = ({ hit, tint }: { hit: boolean; tint: string }) =>
  hit ? (
    <span
      className={cx(
        'relative z-10 size-[58%] animate-eo-pop rounded-full border-2 border-eo-strong',
        tint,
      )}
    />
  ) : (
    <span className="size-[22%] rounded-full bg-eo-faint" />
  );
