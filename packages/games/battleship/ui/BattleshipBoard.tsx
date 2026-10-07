'use client';

import { useState } from 'react';
import { Button, Card, Flex, cx } from '@even-odds/design-system/ui';
import type { PlayerId, TurnBasedSnapshot } from '@even-odds/game-sdk';
import { SEATS } from '@even-odds/game-sdk/ui';
import { Grid, cellName } from './Grid';
import type { CellLook } from './Grid';
import { useFleet } from './useFleet';
import { isSunk, shipAt } from '../src/logic';
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
          hitTint="bg-eo-lose"
          preview={arranging ? fleet.preview : NO_CELLS}
          previewBad={fleet.previewBad}
          reach={
            arranging ? (cell) => shipAt(fleet.ships, cell) !== undefined : null
          }
          dropTarget={arranging}
          onCell={fleet.turn}
          onGrab={arranging ? fleet.grabAt : undefined}
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
          hitTint={theirSeat.solid}
          preview={NO_CELLS}
          reach={
            myMove && !deploying
              ? (cell) => !theirs.incoming.some((shot) => at(shot.at, cell))
              : null
          }
          onCell={(cell) => onAction({ type: 'FIRE', at: cell })}
          onAim={setAim}
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
            {fleet.ashore.map((entry) => (
              <span
                className={cx(
                  'cursor-grab touch-none rounded-eo-pill border-2 px-3 py-1 font-eo-body text-eo-label select-none',
                  mySeat.border,
                  mySeat.ink,
                )}
                key={entry.id}
                onPointerDown={(event) => fleet.launch(entry.id, event)}
              >
                {entry.name} · {entry.length}
              </span>
            ))}
            <span className="font-eo-body text-eo-caption text-eo-muted">
              {fleet.ashore.length > 0
                ? 'Drag each ship into your waters. Click one to turn it.'
                : 'Drag a ship to move it. Click one to turn it.'}
            </span>
          </Flex>

          <Flex wrap="wrap" align="center" gap="8px">
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
