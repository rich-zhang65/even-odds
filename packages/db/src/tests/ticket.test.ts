import { describe, expect, it } from 'vitest';
import { TICKET_TTL_MS, issueTicket, readTicket } from '../ticket';

const SECRET = 'a test secret, not the real one';
const holder = { id: 'u1', username: 'richard' };
const now = 1_000_000;

describe('game tickets', () => {
  it('reads back who it was issued to', () => {
    const ticket = issueTicket(SECRET, holder, now);

    expect(readTicket(SECRET, ticket, now + 1000)).toEqual(holder);
  });

  it('stops working once it expires', () => {
    const ticket = issueTicket(SECRET, holder, now);

    expect(readTicket(SECRET, ticket, now + TICKET_TTL_MS - 1)).toEqual(holder);
    expect(readTicket(SECRET, ticket, now + TICKET_TTL_MS)).toBeNull();
  });

  /* The whole point: a ticket names its holder, so one edited to name someone
     else, or made without the secret, must be refused. */
  it('refuses a ticket edited to name someone else', () => {
    const [, signature] = issueTicket(SECRET, holder, now).split('.');
    const forged = Buffer.from(
      JSON.stringify({ id: 'u2', username: 'victoria', exp: now + 60_000 }),
    ).toString('base64url');

    expect(readTicket(SECRET, `${forged}.${signature}`, now)).toBeNull();
  });

  it('refuses a ticket signed with another secret', () => {
    const ticket = issueTicket('someone else entirely', holder, now);

    expect(readTicket(SECRET, ticket, now)).toBeNull();
  });

  it('refuses anything that is not a ticket', () => {
    for (const junk of [undefined, null, 42, '', 'abc', 'a.b.c', '.', 'x.']) {
      expect(readTicket(SECRET, junk, now)).toBeNull();
    }
  });
});
