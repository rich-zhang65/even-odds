'use client';

import { useState } from 'react';
import { Button, Card, Flex, cx } from '@even-odds/design-system/ui';
import type { PlayerId, TurnBasedSnapshot } from '@even-odds/game-sdk';
import { SEATS } from '@even-odds/game-sdk/ui';
import { Grid, cellName } from './Grid';
import type { CellLook } from './Grid';
import { useFleet } from './useFleet';
import { cellsOf, isSunk, shipAt } from '../src/logic';
import { FLEET } from '../src/types';
import type {
  BattleshipAction,
  BattleshipState,
  Board,
  Cell,
} from '../src/types';

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

const NO_CELLS: Cell[] = [];

const at = (one: Cell, other: Cell): boolean =>
  one.x === other.x && one.y === other.y;

/* Worst news last: a sunk cell is also a hit, and a hit may also be a ship. */
const lookOf = (board: Board, cell: Cell): CellLook => {
  const ship = shipAt(board.ships, cell);
  const shot = board.incoming.find((fired) => at(fired.at, cell));

  if (ship !== undefined && isSunk(board, ship)) return 'sunk';
  if (shot !== undefined) return shot.hit ? 'hit' : 'miss';
  return ship !== undefined ? 'ship' : 'water';
};

const afloat = (board: Board): number =>
  board.ships.filter((ship) => !isSunk(board, ship)).length;

export const BattleshipBoard = ({
  snapshot,
  seat,
  onAction,
}: {
  snapshot: TurnBasedSnapshot<BattleshipState>;
  seat: PlayerId | null;
  onAction: (action: BattleshipAction) => void;
}) => {
  const [aim, setAim] = useState<Cell | null>(null);
  const fleet = useFleet();

  const state = snapshot.state;
  const live = snapshot.phase === 'playing' && snapshot.result === null;

  /* Read off the snapshot rather than worked out from the state, the way Yazy
     does it. Yazy can derive it because it hides nothing; here the masked view
     cannot tell whether the opponent has deployed, since their empty fleet and
     their hidden fleet look identical. The session computes this from the real
     state, so it is the only honest source. */
  const onTurn = snapshot.currentPlayer;

  /* A spectator has no board of their own to sit at, and the session only ever
     sends state to the two seats, so this is a defensive read rather than a
     supported view. */
  const me = seat ?? 'p0';
  const foe = OPPONENT[me];
  const mine = state.boards[me];
  const theirs = state.boards[foe];

  const mySeat = SEATS[me];
  const theirSeat = SEATS[foe];
  const myMove = live && seat !== null && onTurn === seat;

  const deploying = state.phase === 'deploying';
  const sent = mine.ships.length > 0;
  const arranging = deploying && !sent && seat !== null;

  // Before the fleet is sent, your own waters show the local arrangement.
  const ownShips = sent ? mine : { ships: fleet.ships, incoming: [] };

  const holdingShip =
    fleet.holding === null
      ? null
      : (FLEET.find((entry) => entry.id === fleet.holding) ?? null);

  const preview =
    arranging && holdingShip !== null && aim !== null
      ? cellsOf({ id: holdingShip.id, at: aim, facing: fleet.facing })
      : NO_CELLS;

  const waitingOn = deploying
    ? sent
      ? `Waiting for ${theirSeat.name} to deploy`
      : myMove
        ? null
        : `${SEATS[onTurn].name} is deploying`
    : null;

  return (
    <Flex wrap="wrap" align="start" gap="24px">
      <div className="min-w-0 flex-[1_1_320px]">
        <Flex
          align="center"
          justify="space-between"
          gap="12px"
          className="mb-2"
        >
          <span
            className={cx(
              'font-eo-display text-eo-title tracking-eo-tight',
              mySeat.ink,
            )}
          >
            Your waters
          </span>
          {!deploying && (
            <span className="font-eo-body text-eo-caption text-eo-muted">
              {afloat(mine)} afloat
            </span>
          )}
        </Flex>

        <Grid
          label="Your waters"
          look={(cell) => lookOf(ownShips, cell)}
          shipTint={mySeat.solid}
          preview={preview}
          previewBad={aim !== null && fleet.trouble(aim)}
          reach={
            arranging
              ? (cell) =>
                  fleet.holding !== null ||
                  shipAt(fleet.ships, cell) !== undefined
              : null
          }
          onCell={fleet.put}
          onAim={setAim}
        />
      </div>

      <div className="min-w-0 flex-[1_1_320px]">
        <Flex
          align="center"
          justify="space-between"
          gap="12px"
          className="mb-2"
        >
          <span
            className={cx(
              'font-eo-display text-eo-title tracking-eo-tight',
              theirSeat.ink,
            )}
          >
            {theirSeat.name}&rsquo;s waters
          </span>
          {!deploying && (
            <span className="font-eo-body text-eo-caption text-eo-muted">
              {theirs.incoming.length} shots fired
            </span>
          )}
        </Flex>

        <Grid
          label={`${theirSeat.name}'s waters`}
          look={(cell) => lookOf(theirs, cell)}
          shipTint={theirSeat.solid}
          preview={NO_CELLS}
          reach={
            myMove && !deploying
              ? (cell) => !theirs.incoming.some((shot) => at(shot.at, cell))
              : null
          }
          onCell={(cell) => onAction({ type: 'FIRE', at: cell })}
        />

        {!deploying && (
          <p className="mt-3 text-center font-eo-body text-eo-body-s text-eo-muted">
            {myMove
              ? aim !== null
                ? `Fire on ${cellName(aim)}`
                : 'Pick a square'
              : `${SEATS[onTurn].name} is taking a shot`}
          </p>
        )}
      </div>

      {arranging && (
        <Card className="w-full" tone="outlined">
          <Flex wrap="wrap" align="center" gap="8px" className="mb-4">
            {FLEET.map((entry) => {
              const down = fleet.ships.some((ship) => ship.id === entry.id);
              return (
                <button
                  className={cx(
                    'rounded-eo-pill border-2 px-3 py-1 font-eo-body text-eo-label transition-colors duration-(--eo-duration-fast)',
                    fleet.holding === entry.id
                      ? cx(mySeat.border, mySeat.ink)
                      : 'border-eo-hairline text-eo-muted',
                    down && 'line-through',
                  )}
                  key={entry.id}
                  type="button"
                  onClick={() => fleet.take(entry.id)}
                >
                  {entry.name} · {entry.length}
                </button>
              );
            })}
          </Flex>

          <Flex wrap="wrap" align="center" gap="8px">
            <Button size="sm" variant="outline" onClick={fleet.rotate}>
              {fleet.facing === 'across' ? 'Across' : 'Down'}
            </Button>
            <Button size="sm" variant="outline" onClick={fleet.scatter}>
              Scatter
            </Button>
            <Button size="sm" variant="ghost" onClick={fleet.clear}>
              Clear
            </Button>
            <Button
              size="sm"
              variant={mySeat.button}
              disabled={fleet.problem !== null || !myMove}
              onClick={() => onAction({ type: 'DEPLOY', ships: fleet.ships })}
            >
              Ready
            </Button>
            <span className="font-eo-body text-eo-caption text-eo-muted">
              {fleet.problem ??
                (myMove
                  ? 'Fleet ready'
                  : `Arrange away — ${SEATS[onTurn].name} deploys first`)}
            </span>
          </Flex>
        </Card>
      )}

      {waitingOn !== null && !arranging && (
        <Card className="w-full text-center font-eo-body text-eo-body-s text-eo-muted">
          {waitingOn}
        </Card>
      )}
    </Flex>
  );
};
