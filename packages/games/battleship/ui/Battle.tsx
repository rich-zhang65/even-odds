'use client';

import { useState } from 'react';
import { Flex, cx } from '@even-odds/design-system/ui';
import type { PlayerId } from '@even-odds/game-sdk';
import { SEATS } from '@even-odds/game-sdk/ui';
import { FleetBar, Hull, spanOf } from './Hull';
import { MiniBoard } from './MiniBoard';
import { EVERY_CELL, Mark, Waters, cellName } from './Waters';
import { isSunk } from '../src/logic';
import { FLEET } from '../src/types';
import type { BattleshipAction, Board, Cell, ShipId } from '../src/types';

// The board under the pointer lights a shade deeper when a shot can go there.
const AIM: Record<PlayerId, string> = {
  p0: 'hover:bg-eo-red-100',
  p1: 'hover:bg-eo-blue-100',
};

type View = 'attack' | 'fleet';

const shotAt = (board: Board, cell: Cell) =>
  board.incoming.find((shot) => shot.at.x === cell.x && shot.at.y === cell.y);

const sunkIds = (board: Board): ShipId[] =>
  board.ships.filter((ship) => isSunk(board, ship)).map((ship) => ship.id);

export const Battle = ({
  seat,
  mine,
  theirs,
  myTurn,
  over,
  onAction,
}: {
  seat: PlayerId;
  mine: Board;
  theirs: Board;
  myTurn: boolean;
  over: boolean;
  onAction: (action: BattleshipAction) => void;
}) => {
  /* Below 800px one board fills the screen and the other waits small in the
     tray. The big one follows the turn -- theirs to aim at on yours, your own
     to watch on theirs -- unless the player swaps, and a swap holds only
     until the turn changes hands. Kept with the turn it was made on, so the
     view is worked out on render rather than reset by an effect. */
  const [swapped, setSwapped] = useState<{
    myTurn: boolean;
    view: View;
  } | null>(null);
  const follow: View = myTurn || over ? 'attack' : 'fleet';
  const tab =
    swapped !== null && swapped.myTurn === myTurn ? swapped.view : follow;
  const show = (view: View) => setSwapped({ myTurn, view });

  const foe = seat === 'p0' ? 'p1' : 'p0';
  const mySeat = SEATS[seat];
  const theirSeat = SEATS[foe];

  const theySank = sunkIds(mine);
  const iSank = sunkIds(theirs);

  return (
    <div>
      <Flex wrap="wrap" align="start" justify="center" gap="24px">
        <div
          className={cx(
            'max-w-[520px] min-w-0 flex-[1_1_360px]',
            tab !== 'attack' && 'max-[800px]:hidden',
          )}
        >
          <Waters
            title={`${theirSeat.name}’s waters`}
            turn={myTurn ? { label: 'Your shot', seat: mySeat } : null}
            dim={!myTurn && !over}
            footer={FLEET.map(({ id }) => (
              <FleetBar
                id={id}
                sunk={iSank.includes(id)}
                tint={theirSeat.solid}
                key={id}
              />
            ))}
          >
            {EVERY_CELL.map((cell) => {
              const shot = shotAt(theirs, cell);
              const open = myTurn && shot === undefined;

              return (
                <button
                  className={cx(
                    'grid place-items-center',
                    theirSeat.soft,
                    open ? cx('cursor-crosshair', AIM[foe]) : 'cursor-default',
                  )}
                  key={`${cell.x},${cell.y}`}
                  type="button"
                  disabled={!open}
                  aria-label={`${theirSeat.name}’s waters, ${cellName(cell)}`}
                  onClick={() => onAction({ type: 'FIRE', at: cell })}
                >
                  {shot !== undefined && (
                    <Mark hit={shot.hit} tint={mySeat.solid} />
                  )}
                </button>
              );
            })}

            {/* Their board holds only what has sunk, and a sunk ship is drawn
                whole: every square of it is known by then. */}
            {theirs.ships.map((ship) => (
              <div
                className="pointer-events-none absolute box-border p-[3px]"
                style={spanOf(ship.at, ship.facing, ship.id)}
                key={ship.id}
              >
                <Hull
                  id={ship.id}
                  facing={ship.facing}
                  className={cx('border-eo-strong', theirSeat.solid)}
                />
              </div>
            ))}
          </Waters>
        </div>

        <div
          className={cx(
            'max-w-[520px] min-w-0 flex-[1_1_360px]',
            tab !== 'fleet' && 'max-[800px]:hidden',
          )}
        >
          <Waters
            title="Your waters"
            turn={
              !myTurn && !over
                ? { label: `${theirSeat.name}’s shot`, seat: theirSeat }
                : null
            }
            dim={myTurn}
            footer={FLEET.map(({ id }) => (
              <FleetBar
                id={id}
                sunk={theySank.includes(id)}
                tint={mySeat.solid}
                key={id}
              />
            ))}
          >
            {EVERY_CELL.map((cell) => {
              const shot = shotAt(mine, cell);
              return (
                <div
                  className={cx('grid place-items-center', mySeat.soft)}
                  key={`${cell.x},${cell.y}`}
                >
                  {shot !== undefined && (
                    <Mark hit={shot.hit} tint={theirSeat.solid} />
                  )}
                </div>
              );
            })}

            {/* Afloat ships are faded so the shots on them read; a sunk one
                is drawn solid, the same as on the board of whoever sank it. */}
            {mine.ships.map((ship) => (
              <div
                className={cx(
                  'pointer-events-none absolute box-border p-[3px]',
                  !theySank.includes(ship.id) && 'opacity-55',
                )}
                style={spanOf(ship.at, ship.facing, ship.id)}
                key={ship.id}
              >
                <Hull
                  id={ship.id}
                  facing={ship.facing}
                  className={cx('border-eo-strong', mySeat.solid)}
                />
              </div>
            ))}
          </Waters>
        </div>
      </Flex>

      <div className="h-39 min-[800px]:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-eo-strong bg-eo-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] min-[800px]:hidden">
        <div className="flex justify-center">
          {tab === 'attack' ? (
            <MiniBoard
              board={mine}
              owner={mySeat}
              shooter={theirSeat}
              title="Your waters"
              edge={!myTurn && !over ? theirSeat.border : null}
              onOpen={() => show('fleet')}
            />
          ) : (
            <MiniBoard
              board={theirs}
              owner={theirSeat}
              shooter={mySeat}
              title={`${theirSeat.name}’s waters`}
              edge={myTurn ? mySeat.border : null}
              onOpen={() => show('attack')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
