'use client';

import type { ReactNode, Ref } from 'react';
import { Card, cx } from '@even-odds/design-system/ui';
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
   absolutely against the frame. */
export const Waters = ({
  title,
  edge,
  frame,
  footer,
  children,
}: {
  title: string;
  // A border colour for whichever board the next shot lands on.
  edge: string | null;
  frame?: Ref<HTMLDivElement>;
  footer?: ReactNode;
  children: ReactNode;
}) => (
  <Card className={cx('p-4!', edge)} tone="outlined">
    <span className="mb-3 block font-eo-display text-lg font-semibold text-eo-strong">
      {title}
    </span>

    {/* A board ships are dragged onto keeps a touch for the drag rather than
        letting it scroll the page. */}
    <div
      className={cx(
        'relative grid aspect-square w-full grid-cols-10 grid-rows-10 gap-0.5 overflow-hidden rounded-eo-md border-2 border-eo-strong bg-eo-hairline',
        frame !== undefined && 'touch-none select-none',
      )}
      ref={frame}
    >
      {children}
    </div>

    {footer !== undefined && (
      <div className="mt-3 flex flex-wrap gap-3">{footer}</div>
    )}
  </Card>
);

/* A shot's mark: a peg in the shooter's colour for a hit, a dot for a miss.
   Raised so a peg stays on top of a hull drawn over its square. */
export const Mark = ({
  hit,
  tint,
  pop,
}: {
  hit: boolean;
  tint: string;
  pop: boolean;
}) =>
  hit ? (
    <span
      className={cx(
        'relative z-10 size-[58%] rounded-full border-2 border-eo-strong',
        tint,
        pop && 'animate-eo-pop',
      )}
    />
  ) : (
    <span className="size-[22%] rounded-full bg-eo-faint" />
  );
