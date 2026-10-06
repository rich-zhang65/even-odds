'use client';

import { Shuffle } from 'lucide-react';
import type { PointerEvent } from 'react';
import { Button, Card, Flex, Icon, cx } from '@even-odds/design-system/ui';
import type { PlayerId } from '@even-odds/game-sdk';
import { SEATS } from '@even-odds/game-sdk/ui';
import { Hull, spanOf } from './Hull';
import { useFleet } from './useFleet';
import type { Drag, Piece } from './useFleet';
import { EVERY_CELL, Waters } from './Waters';
import { lengthOf } from '../src/logic';
import { FLEET } from '../src/types';
import type { BattleshipAction, Ship, ShipId } from '../src/types';

const nameOf = (id: ShipId): string =>
  FLEET.find((entry) => entry.id === id)?.name ?? id;

/* The whole fleet in a row, always lying across. A ship out on the board, or
   on its way there, leaves its outline behind, so the dock shows at a glance
   what is still to place. Dropping a ship back here takes it off the board;
   the data attribute is how a drop finds the dock. */
const Dock = ({
  pieces,
  drag,
  tint,
  compact,
  onPress,
}: {
  pieces: Piece[];
  drag: Drag | null;
  tint: string;
  compact: boolean;
  onPress: (id: ShipId, event: PointerEvent<HTMLElement>) => void;
}) => (
  <div
    className={cx(
      'flex touch-none flex-wrap items-start select-none',
      compact ? 'min-h-11 justify-center gap-2' : 'min-h-16 gap-3',
    )}
    data-dock
  >
    {pieces.map((piece) => {
      const out = piece.at !== null || drag?.id === piece.id;

      return (
        <div
          className={cx(
            'flex rounded-eo-pill border-2',
            out
              ? 'border-dashed border-eo-faint'
              : cx('cursor-grab border-eo-strong shadow-eo-edge-ink', tint),
          )}
          key={piece.id}
          aria-label={
            out ? undefined : `${nameOf(piece.id)}, drag onto the board`
          }
          onPointerDown={out ? undefined : (event) => onPress(piece.id, event)}
        >
          {Array.from({ length: lengthOf(piece.id) }, (_, square) => (
            <span
              className={cx(
                'grid place-items-center',
                compact ? 'size-6.5' : 'size-7.5',
              )}
              key={square}
            >
              {!out && (
                <span
                  className={cx(
                    'rounded-full bg-white/22',
                    compact ? 'size-2.5' : 'size-3',
                  )}
                />
              )}
            </span>
          ))}
        </div>
      );
    })}
  </div>
);

/* Deploy and Shuffle while arranging; once sent, a spent Deployed and the
   Cancel that takes the fleet back. Stacked in the side rail, in a row in the
   tray. */
const Actions = ({
  seat,
  locked,
  ready,
  compact,
  onDeploy,
  onShuffle,
  onCancel,
}: {
  seat: PlayerId;
  locked: boolean;
  ready: boolean;
  compact: boolean;
  onDeploy: () => void;
  onShuffle: () => void;
  onCancel: () => void;
}) => (
  <div className={compact ? 'flex gap-3' : 'grid gap-3'}>
    <div className={compact ? 'flex-1' : undefined}>
      <Button
        variant={SEATS[seat].button}
        size={compact ? 'md' : 'lg'}
        fullWidth
        disabled={locked || !ready}
        onClick={onDeploy}
      >
        {locked ? 'Deployed' : 'Deploy'}
      </Button>
    </div>
    {locked ? (
      <Button variant="outline" fullWidth={!compact} onClick={onCancel}>
        Cancel
      </Button>
    ) : (
      <Button
        variant="outline"
        fullWidth={!compact}
        iconLeft={<Icon icon={Shuffle} size={16} />}
        onClick={onShuffle}
      >
        Shuffle
      </Button>
    )}
  </div>
);

export const Deploy = ({
  seat,
  sent,
  live,
  onAction,
}: {
  seat: PlayerId;
  // The fleet this player has already sent, empty until they deploy.
  sent: Ship[];
  live: boolean;
  onAction: (action: BattleshipAction) => void;
}) => {
  const fleet = useFleet();
  const mySeat = SEATS[seat];
  const foeName = SEATS[seat === 'p0' ? 'p1' : 'p0'].name;

  /* Once sent, the board shows the fleet as the server holds it, locked; the
     local arrangement waits underneath in case it comes back. */
  const locked = sent.length > 0;
  const drag = fleet.drag;
  const shown: Piece[] = locked ? sent : fleet.pieces;

  const deploy = () => onAction({ type: 'DEPLOY', ships: fleet.ships });
  const cancel = () => {
    fleet.restore(sent);
    onAction({ type: 'RECALL' });
  };

  const actions = {
    seat,
    locked,
    ready: live && fleet.problem === null,
    onDeploy: deploy,
    onShuffle: fleet.shuffle,
    onCancel: cancel,
  };

  return (
    <div>
      <Flex wrap="wrap" align="start" justify="center" gap="24px">
        <div className="max-w-[560px] min-w-0 flex-[1_1_360px]">
          <Waters title="Your waters" edge={null} frame={fleet.water}>
            {EVERY_CELL.map((cell) => (
              <div className={mySeat.soft} key={`${cell.x},${cell.y}`} />
            ))}

            {shown.map((piece) => {
              // A ship being dragged shows only where it would land.
              const lifted = drag?.id === piece.id;
              const at = lifted ? drag.landing : piece.at;
              if (at === null) return null;

              return (
                <div
                  className={cx(
                    'absolute box-border p-[3px]',
                    locked ? 'opacity-60' : 'cursor-grab',
                    lifted ? 'z-10 opacity-35' : 'z-5',
                  )}
                  style={spanOf(at, piece.facing, piece.id)}
                  key={piece.id}
                  role={locked ? undefined : 'button'}
                  tabIndex={locked ? undefined : 0}
                  aria-label={`${nameOf(piece.id)}, drag to move, tap to turn`}
                  onPointerDown={
                    locked ? undefined : (event) => fleet.press(piece.id, event)
                  }
                  onKeyDown={
                    locked ? undefined : (event) => fleet.key(piece.id, event)
                  }
                >
                  <Hull
                    id={piece.id}
                    facing={piece.facing}
                    className={
                      lifted
                        ? cx(mySeat.solid, mySeat.border)
                        : cx(mySeat.solid, 'border-eo-strong')
                    }
                  />
                </div>
              );
            })}

            {locked && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-eo-card/72">
                <div className="flex flex-col items-center gap-3 rounded-eo-lg border-2 border-eo-strong bg-eo-card px-6 py-5 text-center shadow-eo-md">
                  <span className="size-2.5 animate-eo-pulse rounded-full bg-eo-waiting" />
                  <span className="font-eo-display text-lg font-semibold text-eo-strong">
                    Waiting for {foeName}
                  </span>
                </div>
              </div>
            )}
          </Waters>
        </div>

        {/* Above 800px the dock and buttons sit in a sticky rail; below it they
            move to a tray fixed along the bottom, as Yazy's dice do. */}
        <div className="sticky top-6 grid max-w-[320px] min-w-0 flex-[1_1_240px] gap-4 max-[800px]:hidden">
          <Card
            className="p-5!"
            tone={drag !== null && drag.landing === null ? 'outlined' : 'plain'}
          >
            <span className="mb-3 block font-eo-body text-eo-caption tracking-eo-caps text-eo-muted uppercase">
              Your fleet
            </span>
            <Dock
              pieces={fleet.pieces}
              drag={drag}
              tint={mySeat.solid}
              compact={false}
              onPress={fleet.press}
            />
          </Card>
          <Actions {...actions} compact={false} />
        </div>
      </Flex>

      <div className="h-45 min-[800px]:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-eo-strong bg-eo-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] min-[800px]:hidden">
        <div className="mx-auto grid max-w-[520px] gap-3">
          <Dock
            pieces={fleet.pieces}
            drag={drag}
            tint={mySeat.solid}
            compact
            onPress={fleet.press}
          />
          <Actions {...actions} compact />
        </div>
      </div>

      {drag !== null && (
        <div
          className="pointer-events-none fixed z-60 box-border p-[3px]"
          style={{
            left: drag.left,
            top: drag.top,
            width: drag.width,
            height: drag.height,
          }}
        >
          <Hull
            id={drag.id}
            facing={drag.facing}
            className={cx(
              'border-eo-strong shadow-eo-lg',
              mySeat.solid,
              drag.landing === null && 'opacity-60',
            )}
          />
        </div>
      )}
    </div>
  );
};
