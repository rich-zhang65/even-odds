import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createDb, userForToken } from '@even-odds/db';
import type { Db, SignedIn } from '@even-odds/db';
import { SESSION_COOKIE } from './sessionCookie';

/* One pool per server process. Dev reloads this module on every edit, and a
   fresh pool each time would leave the old ones holding connections open. */
declare global {
  var evenOddsDb: Db | undefined;
}
export const db = (globalThis.evenOddsDb ??= createDb(
  process.env.DATABASE_URL ?? '',
));

/* The real check, against the sessions table. The proxy only looks for the
   cookie; this is what decides whether it is any good. Cached per request, so
   a layout and a page asking both cost one query. */
export const currentUser = cache(async (): Promise<SignedIn | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token === undefined ? null : userForToken(db, token);
});

export const requireUser = async (): Promise<SignedIn> => {
  const user = await currentUser();
  if (user === null) redirect('/login');
  return user;
};
