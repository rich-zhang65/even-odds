'use client';

import type { CSSProperties } from 'react';
import { cx } from '@even-odds/design-system/ui';
import { lengthOf } from '../src/logic';
import type { Cell, Facing, ShipId } from '../src/types';

/* Where a ship sits on a ten-by-ten board, as fractions of it, so the hull lands
   on its squares at any size the board is drawn. */
export const spanOf = (at: Cell, facing: Facing, id: ShipId): CSSProperties => {
  const length = lengthOf(id);
  return {
    left: `${at.x * 10}%`,
    top: `${at.y * 10}%`,
    width: `${(facing === 'across' ? length : 1) * 10}%`,
    height: `${(facing === 'across' ? 1 : length) * 10}%`,
  };
};

/* A ship drawn as one rounded hull with a port light per square, filling
   whatever box it is put in. */
export const Hull = ({
  id,
  facing,
  className,
}: {
  id: ShipId;
  facing: Facing;
  className: string;
}) => (
  <div
    className={cx(
      'grid size-full place-items-center rounded-eo-pill border-2',
      facing === 'across'
        ? 'grid-flow-col auto-cols-fr'
        : 'grid-flow-row auto-rows-fr',
      className,
    )}
  >
    {Array.from({ length: lengthOf(id) }, (_, square) => (
      <span
        className="aspect-square w-[42%] rounded-full bg-white/22"
        key={square}
      />
    ))}
  </div>
);

/* A small hull for the fleet rows under each board, in its owner's colour,
   faded once it goes down. */
export const FleetBar = ({
  id,
  sunk,
  tint,
}: {
  id: ShipId;
  sunk: boolean;
  tint: string;
}) => (
  <div
    className={cx(
      'flex gap-0.5 rounded-eo-pill border-2 border-eo-strong p-0.5',
      tint,
      sunk && 'opacity-30',
    )}
  >
    {Array.from({ length: lengthOf(id) }, (_, square) => (
      <span className="size-2.5 rounded-full bg-white/20" key={square} />
    ))}
  </div>
);
