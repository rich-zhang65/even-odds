import type { Db } from './client';
import { matches, matchPlayers } from './schema';

export type Seat = 'p0' | 'p1';

export type FinishedMatch = {
  id: string;
  gameId: string;
  winner: Seat | null;
  reason: string | null;
  startedAt: Date;
  finishedAt: Date;
  players: Record<Seat, string>;
};

/* Both rows or neither, so history never holds a match with a missing player. */
export const recordMatch = async (
  db: Db,
  finished: FinishedMatch,
): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.insert(matches).values({
      id: finished.id,
      gameId: finished.gameId,
      winner: finished.winner,
      reason: finished.reason,
      startedAt: finished.startedAt,
      finishedAt: finished.finishedAt,
    });
    await tx.insert(matchPlayers).values([
      { matchId: finished.id, userId: finished.players.p0, seat: 'p0' },
      { matchId: finished.id, userId: finished.players.p1, seat: 'p1' },
    ]);
  });
};
