'use client';

import { cx } from '@even-odds/design-system/ui';
import type { PlayerId, Snapshot } from '@even-odds/game-sdk';
import { SEATS } from '@even-odds/game-sdk/ui';
import { stoneAt, winningLines } from '../src/logic';
import { BOARD } from '../src/types';
import type { Cell, GomokuAction, GomokuState } from '../src/types';

const COLUMNS = 'ABCDEFGHJKLMNOP';

const EVERY_POINT: Cell[] = Array.from(
  { length: BOARD * BOARD },
  (_, index) => ({ x: index % BOARD, y: Math.floor(index / BOARD) }),
);

// The five marked points of a fifteen-line board, for finding your way about.
const STARS: Cell[] = [
  { x: 3, y: 3 },
  { x: 11, y: 3 },
  { x: 7, y: 7 },
  { x: 3, y: 11 },
  { x: 11, y: 11 },
];

const same = (one: Cell, other: Cell): boolean =>
  one.x === other.x && one.y === other.y;

/* How far a strike runs past the end stones, per square of the line's step:
   just beyond a stone's edge, which sits 0.4 out from its centre. A diagonal
   steps a square both ways, so it overhangs by a little more. */
const OVERHANG = 0.4;

/* One winning run, struck through and a little past each end. Drawn in board
   units, a point's centre at half past its index, so it lands on the stones
   at any size; it draws itself in once, from the run's first stone to its
   last. */
const Strike = ({ run }: { run: Cell[] }) => {
  const first = run[0];
  const end = run.at(-1);
  if (first === undefined || end === undefined) return null;

  // The run's step, one square along its axis: -1, 0 or 1 each way.
  const dx = Math.sign(end.x - first.x);
  const dy = Math.sign(end.y - first.y);

  return (
    <line
      x1={first.x + 0.5 - dx * OVERHANG}
      y1={first.y + 0.5 - dy * OVERHANG}
      x2={end.x + 0.5 + dx * OVERHANG}
      y2={end.y + 0.5 + dy * OVERHANG}
      stroke="currentColor"
      strokeWidth={0.22}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
    >
      <animate
        attributeName="stroke-dashoffset"
        from="1"
        to="0"
        dur="0.45s"
        fill="freeze"
      />
    </line>
  );
};

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
  const won = winningLines(state);
  const last = state.stones.at(-1);
  const result = snapshot.result;

  /* The band round the board says whose move it is, edged and tinted in their
     colour, and once the game is decided, in the winner's; a draw leaves it
     plain. The field inside the outer lines stays plain throughout, so stones
     of either colour read the same against it. */
  const owner =
    result === null ? state.turn : 'draw' in result ? null : result.winner;
  const tint = owner === null ? null : SEATS[owner];

  return (
    <div className="mx-auto w-full max-w-[min(640px,72vh)]">
      <div
        className={cx(
          'rounded-eo-md border-2 p-[2%] transition-colors duration-(--eo-duration-base)',
          tint === null
            ? 'border-eo-strong bg-eo-card'
            : cx(tint.border, tint.soft),
        )}
      >
        <div className="relative">
          {/* The field: from outer line to outer line, half a point in from
              each edge of the grid, which is where the lines stop. */}
          <span
            className="absolute bg-eo-card"
            style={{ inset: `${50 / BOARD}%` }}
          />
          <div
            className="relative grid"
            style={{ gridTemplateColumns: `repeat(${BOARD}, minmax(0, 1fr))` }}
            role="group"
            aria-label="Board"
          >
            {EVERY_POINT.map((point) => {
              const stone = stoneAt(state.stones, point);
              const winning =
                won?.lines.some((run) => run.some((at) => same(at, point))) ??
                false;
              const latest = last !== undefined && same(last.at, point);
              const open = mine !== null && stone === undefined;
              const star = STARS.some((at) => same(at, point));

              return (
                <button
                  className={cx(
                    'group relative grid aspect-square place-items-center',
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
                  {/* The grid lines stop at the centre on the outer points, so
                      the edge of the board is a line rather than a ragged
                      fringe. */}
                  <span
                    className={cx(
                      'absolute top-1/2 h-0.5 -translate-y-1/2 bg-eo-control-line',
                      point.x === 0 ? 'left-1/2' : 'left-0',
                      point.x === BOARD - 1 ? 'right-1/2' : 'right-0',
                    )}
                  />
                  <span
                    className={cx(
                      'absolute left-1/2 w-0.5 -translate-x-1/2 bg-eo-control-line',
                      point.y === 0 ? 'top-1/2' : 'top-0',
                      point.y === BOARD - 1 ? 'bottom-1/2' : 'bottom-0',
                    )}
                  />
                  {star && stone === undefined && (
                    <span className="relative size-[22%] rounded-full bg-eo-control-line" />
                  )}

                  {stone !== undefined ? (
                    <span
                      className={cx(
                        'absolute inset-[10%] grid animate-eo-pop place-items-center rounded-full border-2',
                        SEATS[stone.by].solid,
                        winning ? 'border-eo-strong' : SEATS[stone.by].border,
                      )}
                    >
                      {latest && result === null && (
                        <span className="size-[30%] rounded-full bg-eo-on-color" />
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

          {/* Every run the winning stone completed -- usually one. */}
          {won !== null && (
            <svg
              className="pointer-events-none absolute inset-0 size-full text-eo-strong"
              viewBox={`0 0 ${BOARD} ${BOARD}`}
              aria-hidden
            >
              {won.lines.map((run) => (
                <Strike
                  run={run}
                  key={run.map((at) => `${at.x},${at.y}`).join()}
                />
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
