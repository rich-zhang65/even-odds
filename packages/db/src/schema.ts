import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

export type User = typeof users.$inferSelect;
