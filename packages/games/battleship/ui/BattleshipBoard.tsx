'use client';

import { Card } from '@even-odds/design-system/ui';
import type { PlayerId, TurnBasedSnapshot } from '@even-odds/game-sdk';
import { Battle } from './Battle';
import { Deploy } from './Deploy';
import type { BattleshipAction, BattleshipState } from '../src/types';

const OPPONENT: Record<PlayerId, PlayerId> = { p0: 'p1', p1: 'p0' };

export const BattleshipBoard = ({
  snapshot,
  seat,
  onAction,
}: {
  snapshot: TurnBasedSnapshot<BattleshipState>;
  seat: PlayerId | null;
  onAction: (action: BattleshipAction) => void;
}) => {
  const state = snapshot.state;
  const live = snapshot.phase === 'playing' && snapshot.result === null;

  /* A spectator has no board of their own to sit at, and the session only ever
     sends state to the two seats, so this is a defensive read rather than a
     supported view. */
  const me = seat ?? 'p0';

  if (state.phase === 'deploying') {
    return seat === null ? (
      <Card className="text-center font-eo-body text-eo-body-s text-eo-muted">
        Both fleets are deploying
      </Card>
    ) : (
      <Deploy
        seat={seat}
        sent={state.boards[seat].ships}
        live={live}
        onAction={onAction}
      />
    );
  }

  /* Read off the snapshot rather than the state: the session works it out from
     the real state, which the masked view this player holds cannot. */
  const myTurn = live && seat !== null && snapshot.currentPlayer === seat;

  return (
    <Battle
      seat={me}
      mine={state.boards[me]}
      theirs={state.boards[OPPONENT[me]]}
      myTurn={myTurn}
      over={snapshot.result !== null}
      onAction={onAction}
    />
  );
};
