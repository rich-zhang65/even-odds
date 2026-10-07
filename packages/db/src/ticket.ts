import { createHmac, timingSafeEqual } from 'node:crypto';

/* A ticket into the game server. The web app and the game server live on
   unrelated sites once deployed (vercel.app, onrender.com), so the browser
   will not send the sign-in cookie to the game server. Instead the web app,
   which can read the cookie, hands the signed-in user a ticket naming them,
   and the game server checks it. It is signed with a secret only the two
   servers know, and it expires within a minute: long enough to connect, short
   enough that a copy is worth little. The cookie itself never leaves the web
   app. Its own subpath export, like the cookie's, so the game server does not
   pull in a database client with it. */

export const TICKET_TTL_MS = 60_000;

export type TicketHolder = { id: string; username: string };

const signature = (secret: string, body: string): string =>
  createHmac('sha256', secret).update(body).digest('base64url');

export const issueTicket = (
  secret: string,
  holder: TicketHolder,
  now: number,
): string => {
  const body = Buffer.from(
    JSON.stringify({ ...holder, exp: now + TICKET_TTL_MS }),
  ).toString('base64url');
  return `${body}.${signature(secret, body)}`;
};

/* Who a ticket was issued to, or null for anything forged, expired or not a
   ticket at all. It arrives from a client, so nothing about it is assumed. */
export const readTicket = (
  secret: string,
  ticket: unknown,
  now: number,
): TicketHolder | null => {
  if (typeof ticket !== 'string') return null;
  const parts = ticket.split('.');
  if (parts.length !== 2) return null;
  const [body, given] = parts;
  if (body === undefined || given === undefined || body === '') return null;

  // Compared in constant time, so the check cannot leak how close a guess was.
  const expected = Buffer.from(signature(secret, body));
  const offered = Buffer.from(given);
  if (offered.length !== expected.length || !timingSafeEqual(offered, expected))
    return null;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof claims !== 'object' ||
    claims === null ||
    !('id' in claims) ||
    !('username' in claims) ||
    !('exp' in claims)
  )
    return null;
  const { id, username, exp } = claims;
  if (
    typeof id !== 'string' ||
    typeof username !== 'string' ||
    typeof exp !== 'number'
  )
    return null;

  return now < exp ? { id, username } : null;
};

/* The shared secret. Production must set SOCKET_SECRET on both servers, to the
   same value; local development falls back to a fixed one so it runs with no
   setup. */
export const ticketSecret = (): string => {
  const secret = process.env.SOCKET_SECRET;
  if (secret !== undefined && secret !== '') return secret;
  if (process.env.NODE_ENV === 'production')
    throw new Error('SOCKET_SECRET must be set in production.');
  return 'even-odds local development only';
};
