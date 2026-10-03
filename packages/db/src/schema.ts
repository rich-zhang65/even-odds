import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Both always stored lowercased, so each unique constraint is case-insensitive.
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  /* Sign-in reads an @ as "this is an email", so a username with one in it could
     never be used to log in -- and could shadow someone's email if it were. */
  (table) => [
    check(
      'users_username_has_no_at',
      sql`position('@' in ${table.username}) = 0`,
    ),
  ],
);

export const sessions = pgTable('sessions', {
  /* A hash of the token in the cookie, never the token itself, so a copy of this
     table does not hand out working sessions. */
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* One row per finished match -- a win, a draw, or a forfeit once the grace window
   ran out. Matches that never started, or that both players walked away from,
   never reach a result and are never written. */
export const matches = pgTable(
  'matches',
  {
    // The id the game server already gave the match, so a link to it stays valid.
    id: text('id').primaryKey(),
    gameId: text('game_id').notNull(),
    // The seat that won, or null for a draw.
    winner: text('winner', { enum: ['p0', 'p1'] }),
    reason: text('reason'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    check('matches_winner_is_a_seat', sql`${table.winner} in ('p0', 'p1')`),
  ],
);

export const matchPlayers = pgTable(
  'match_players',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    seat: text('seat', { enum: ['p0', 'p1'] }).notNull(),
    // As the game counts it; null for a game that keeps no score.
    score: integer('score'),
  },
  /* One account per match, as the game server already insists -- here so a bad
     write cannot record someone playing themselves. History is read per
     account, so that is the lookup that needs an index. */
  (table) => [
    primaryKey({ columns: [table.matchId, table.seat] }),
    unique('match_players_one_seat_each').on(table.matchId, table.userId),
    check('match_players_seat_is_a_seat', sql`${table.seat} in ('p0', 'p1')`),
    index('match_players_user_id_idx').on(table.userId),
  ],
);

export type User = typeof users.$inferSelect;
