import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { Db } from './client';
import { hashPassword, verifyPassword } from './password';
import { sessions, users } from './schema';

export const SESSION_DAYS = 30;

export type SignedIn = { id: string; email: string; username: string };

/* The row key for a token. The token lives only in the cookie; a copy of the
   sessions table therefore holds nothing that can be presented as one. */
export const sessionIdFor = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/* Verified against when the login matches nobody, so an unknown account costs
   the same scrypt as a wrong password and response time does not reveal which
   accounts exist. */
const DECOY = hashPassword('decoy');

/* A fresh token and its expiry, or null for any mismatch -- an unknown account
   and a wrong password look the same from outside.

   Either identifier works. An @ means an email; usernames are never given one,
   so the two cannot collide and there is only ever one row to match. */
export const signIn = async (
  db: Db,
  login: string,
  password: string,
): Promise<{ token: string; expiresAt: Date } | null> => {
  const key = login.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(key.includes('@') ? eq(users.email, key) : eq(users.username, key));

  const matches = await verifyPassword(
    password,
    user?.passwordHash ?? (await DECOY),
  );
  if (user === undefined || !matches) return null;

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db
    .insert(sessions)
    .values({ id: sessionIdFor(token), userId: user.id, expiresAt });

  return { token, expiresAt };
};

export const userForToken = async (
  db: Db,
  token: string,
): Promise<SignedIn | null> => {
  const [row] = await db
    .select({ id: users.id, email: users.email, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, sessionIdFor(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  return row ?? null;
};

export const signOut = async (db: Db, token: string): Promise<void> => {
  await db.delete(sessions).where(eq(sessions.id, sessionIdFor(token)));
};
