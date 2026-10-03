import { and, desc, eq, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from './client';
import { matches, matchPlayers, users } from './schema';

export type Seat = 'p0' | 'p1';

export type FinishedMatch = {
  id: string;
  gameId: string;
  winner: Seat | null;
  reason: string | null;
  startedAt: Date;
  finishedAt: Date;
  players: Record<Seat, string>;
  score: Record<Seat, number> | null;
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
      {
        matchId: finished.id,
        userId: finished.players.p0,
        seat: 'p0',
        score: finished.score?.p0 ?? null,
      },
      {
        matchId: finished.id,
        userId: finished.players.p1,
        seat: 'p1',
        score: finished.score?.p1 ?? null,
      },
    ]);
  });
};

export type Outcome = 'won' | 'lost' | 'draw';

export const outcomeFor = (winner: Seat | null, seat: Seat): Outcome =>
  winner === null ? 'draw' : winner === seat ? 'won' : 'lost';

export type PastMatch = {
  id: string;
  gameId: string;
  outcome: Outcome;
  reason: string | null;
  opponent: string;
  // Yours first, since history is always read from your side.
  score: { mine: number; theirs: number } | null;
  finishedAt: Date;
};

const them = alias(matchPlayers, 'them');

/* One account's finished matches, newest first, each told from their side: the
   outcome is theirs and the opponent is whoever sat in the other seat. */
export const historyFor = async (
  db: Db,
  userId: string,
  limit = 50,
): Promise<PastMatch[]> => {
  const rows = await db
    .select({
      id: matches.id,
      gameId: matches.gameId,
      winner: matches.winner,
      reason: matches.reason,
      finishedAt: matches.finishedAt,
      seat: matchPlayers.seat,
      mine: matchPlayers.score,
      theirs: them.score,
      opponent: users.username,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .innerJoin(
      them,
      and(eq(them.matchId, matchPlayers.matchId), ne(them.userId, userId)),
    )
    .innerJoin(users, eq(users.id, them.userId))
    .where(eq(matchPlayers.userId, userId))
    .orderBy(desc(matches.finishedAt))
    .limit(limit);

  return rows.map(({ winner, seat, mine, theirs, ...row }) => ({
    ...row,
    outcome: outcomeFor(winner, seat),
    score: mine === null || theirs === null ? null : { mine, theirs },
  }));
};
