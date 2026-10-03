'use client';

import { cx } from '@even-odds/design-system/ui';
import type { PlayerId, Snapshot } from '@even-odds/game-sdk';
import { SEATS } from '@even-odds/game-sdk/ui';
import { stoneAt, winningLine } from '../src/logic';
import { BOARD } from '../src/types';
import type { Cell, GomokuAction, GomokuState } from '../src/types';

const COLUMNS = 'ABCDEFGHJKLMNOP';

const EVERY_POINT: Cell[] = Array.from(
  { length: BOARD * BOARD },
  (_, index) => ({ x: index % BOARD, y: Math.floor(index / BOARD) }),
);

const same = (one: Cell, other: Cell): boolean =>
  one.x === other.x && one.y === other.y;

export const GomokuBoard = ({
  snapshot,
  seat,
  onAction,
}: {
  snapshot: Snapshot<GomokuState>;
  seat: PlayerId | null;
  onAction: (action: GomokuAction) => void;
}) => {
  const state = snapshot.state;
  const live = snapshot.phase === 'playing' && snapshot.result === null;
  const mine =
    live && seat !== null && state.turn === seat ? SEATS[seat] : null;
  const won = winningLine(state);
  const last = state.stones.at(-1);

  return (
    <div className="mx-auto w-full max-w-[min(640px,72vh)]">
      <div
        className="grid rounded-eo-lg border-2 border-eo-strong bg-eo-card p-2"
        style={{ gridTemplateColumns: `repeat(${BOARD}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Board"
      >
        {EVERY_POINT.map((point) => {
          const stone = stoneAt(state.stones, point);
          const winning = won?.line.some((at) => same(at, point)) ?? false;
          const latest = last !== undefined && same(last.at, point);
          const open = mine !== null && stone === undefined;

          return (
            <button
              className={cx(
                'group relative aspect-square',
                open ? 'cursor-pointer' : 'cursor-default',
              )}
              key={`${point.x},${point.y}`}
              type="button"
              disabled={!open}
              aria-label={[
                `${COLUMNS[point.x]}${BOARD - point.y}`,
                stone !== undefined && SEATS[stone.by].name,
                winning && 'part of the winning line',
              ]
                .filter(Boolean)
                .join(', ')}
              onClick={() => onAction({ type: 'PLACE', at: point })}
            >
              {/* The grid lines stop at the centre on the outer points, so the
                  edge of the board is a line rather than a ragged fringe. */}
              <span
                className={cx(
                  'absolute top-1/2 h-px -translate-y-1/2 bg-eo-strong/40',
                  point.x === 0 ? 'left-1/2' : 'left-0',
                  point.x === BOARD - 1 ? 'right-1/2' : 'right-0',
                )}
              />
              <span
                className={cx(
                  'absolute left-1/2 w-px -translate-x-1/2 bg-eo-strong/40',
                  point.y === 0 ? 'top-1/2' : 'top-0',
                  point.y === BOARD - 1 ? 'bottom-1/2' : 'bottom-0',
                )}
              />

              {stone !== undefined ? (
                <span
                  className={cx(
                    'absolute inset-[10%] grid place-items-center rounded-full',
                    SEATS[stone.by].solid,
                    winning &&
                      'ring-2 ring-eo-strong ring-offset-1 ring-offset-eo-card',
                  )}
                >
                  {latest && (
                    <span className="size-1/4 rounded-full bg-eo-on-color/80" />
                  )}
                </span>
              ) : (
                mine !== null && (
                  <span
                    className={cx(
                      'absolute inset-[10%] rounded-full opacity-0 transition-opacity duration-(--eo-duration-fast) group-hover:opacity-35 group-focus-visible:opacity-35',
                      mine.solid,
                    )}
                  />
                )
              )}
            </button>
          );
        })}
      </div>

      {live && (
        <p className="mt-3 text-center font-eo-body text-eo-body-s text-eo-muted">
          {seat === state.turn
            ? 'Your move'
            : `${SEATS[state.turn].name} to move`}
        </p>
      )}
    </div>
  );
};
