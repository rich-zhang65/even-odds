import { createServer } from 'node:http';
import { io as connectClient } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { sessionTokenFrom } from '@even-odds/db/cookie';
import type { GameResult, PlayerId, Snapshot } from '@even-odds/game-sdk';
import { ALL_CATEGORIES } from '@even-odds/yazy';
import type { YazyState } from '@even-odds/yazy';
import { attachSocketServer } from '../server';

type CreateOk = { matchId: string; you: PlayerId };
type JoinOk = { matchId: string; you: PlayerId; reconnected: boolean };
type ErrAck = { error: string };
type ActionAck = { ok: true } | ErrAck;
type StatePayload = { snapshot: Snapshot<YazyState> };
type OverPayload = { result: GameResult };
type OpponentPayload = { connected: boolean };

const clients: Socket[] = [];
const teardowns: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  for (const teardown of teardowns.splice(0)) await teardown();
});

const startServer = async (graceMs?: number): Promise<string> => {
  const http = createServer();
  /* The real cookie parsing, with the database swapped for "the session token is
     the username": every account a test names exists, and no cookie is nobody. */
  const io = attachSocketServer(http, {
    graceMs,
    identify: async (cookieHeader) => {
      const token = sessionTokenFrom(cookieHeader);
      return token === null ? null : { id: token, username: token };
    },
  });
  await new Promise<void>((resolve) => http.listen(0, () => resolve()));

  const address = http.address();
  if (address === null || typeof address === 'string')
    throw new Error('no port bound');

  teardowns.push(
    () => new Promise<void>((resolve) => io.close(() => resolve())),
  );
  return `http://127.0.0.1:${address.port}`;
};

let strangers = 0;

/* Signed in as `as`, or as a fresh account of its own when no name is given, so
   two sockets are two different people unless a test says otherwise. */
const connect = async (url: string, as?: string): Promise<Socket> => {
  const socket = connectClient(url, {
    transports: ['websocket'],
    forceNew: true,
    extraHeaders: {
      cookie: `eo_session=${as ?? `stranger-${(strangers += 1)}`}`,
    },
  });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
  return socket;
};

const ask = <T>(socket: Socket, event: string, payload?: unknown): Promise<T> =>
  new Promise<T>((resolve) => {
    socket.emit(event, payload, (res: T) => resolve(res));
  });

const waitFor = <T>(socket: Socket, event: string): Promise<T> =>
  new Promise<T>((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });

const waitUntil = <T>(
  socket: Socket,
  event: string,
  matches: (payload: T) => boolean,
): Promise<T> =>
  new Promise<T>((resolve) => {
    const handler = (payload: T) => {
      if (!matches(payload)) return;
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

const waitForPhase = (socket: Socket, phase: string): Promise<StatePayload> =>
  waitUntil<StatePayload>(
    socket,
    'game:state',
    (p) => p.snapshot.phase === phase,
  );

const openMatch = async (url: string) => {
  const a = await connect(url, 'alice');
  const created = await ask<CreateOk>(a, 'match:create', { gameId: 'yazy' });

  const b = await connect(url, 'bob');
  // Both seats must settle on "playing" — awaiting only one leaves the other's
  // opening snapshot in flight, where it can satisfy a later phase listener.
  const started = Promise.all([
    waitForPhase(a, 'playing'),
    waitForPhase(b, 'playing'),
  ]);
  const joined = await ask<JoinOk>(b, 'match:join', {
    matchId: created.matchId,
  });
  await started;

  return { a, b, created, joined };
};

describe('server — match lifecycle', () => {
  it('seats two players and starts the match', async () => {
    const url = await startServer();
    const { created, joined } = await openMatch(url);

    expect(created.you).toBe('p0');
    expect(created.matchId).toHaveLength(10);
    expect(joined.you).toBe('p1');
    expect(joined.reconnected).toBe(false);
  });

  it('pushes match:state naming the occupied seats', async () => {
    const url = await startServer();
    const a = await connect(url);
    const created = await ask<CreateOk>(a, 'match:create', { gameId: 'yazy' });

    const b = await connect(url);
    const seated = waitFor<{ seats: { p0: boolean; p1: boolean } }>(
      a,
      'match:state',
    );
    await ask<JoinOk>(b, 'match:join', { matchId: created.matchId });

    expect(await seated).toMatchObject({ seats: { p0: true, p1: true } });
  });

  it('hands a seat back to the account that holds it', async () => {
    const url = await startServer();
    const a = await connect(url);
    const created = await ask<CreateOk>(a, 'match:create', { gameId: 'yazy' });

    const rejoined = await ask<JoinOk>(a, 'match:join', {
      matchId: created.matchId,
    });
    expect(rejoined).toMatchObject({ you: 'p0', reconnected: true });

    const b = await connect(url);
    const joined = await ask<JoinOk>(b, 'match:join', {
      matchId: created.matchId,
    });
    expect(joined.you).toBe('p1');
  });

  it('opens a fresh match for a socket whose previous match has finished', async () => {
    const url = await startServer(100);
    const { a, b, created } = await openMatch(url);

    const finished = waitForPhase(a, 'over');
    b.disconnect();
    await finished;

    const second = await ask<CreateOk>(a, 'match:create', { gameId: 'yazy' });
    const waiting = waitForPhase(a, 'waiting');
    await ask<JoinOk>(a, 'match:join', { matchId: second.matchId });

    expect(second.matchId).not.toBe(created.matchId);
    expect((await waiting).snapshot.matchId).toBe(second.matchId);
  });

  it('refuses a third player gracefully', async () => {
    const url = await startServer();
    const { created } = await openMatch(url);

    const c = await connect(url);
    const result = await ask<ErrAck>(c, 'match:join', {
      matchId: created.matchId,
    });
    expect(result).toEqual({ error: 'full' });
  });

  it('reports an unknown match and an unknown game', async () => {
    const url = await startServer();
    const a = await connect(url);

    expect(await ask<ErrAck>(a, 'match:join', { matchId: 'nope' })).toEqual({
      error: 'notfound',
    });
    expect(await ask<ErrAck>(a, 'match:create', { gameId: 'chess' })).toEqual({
      error: 'unknown-game',
    });
  });

  it('rejects malformed payloads before they reach a game', async () => {
    const url = await startServer();
    const a = await connect(url);

    expect(await ask<ErrAck>(a, 'match:create', {})).toEqual({
      error: 'bad-payload',
    });
    expect(await ask<ErrAck>(a, 'match:join', { matchId: 42 })).toEqual({
      error: 'bad-payload',
    });
    expect(await ask<ErrAck>(a, 'game:action', { nope: true })).toEqual({
      error: 'bad-payload',
    });
  });
});

describe('server — accounts', () => {
  it('refuses a socket that is not signed in', async () => {
    const url = await startServer();
    const socket = connectClient(url, {
      transports: ['websocket'],
      forceNew: true,
    });
    clients.push(socket);

    const refused = await new Promise<Error>((resolve) =>
      socket.once('connect_error', resolve),
    );

    expect(refused.message).toBe('unauthorized');
    expect(socket.connected).toBe(false);
  });

  it('refuses a session the server does not recognise', async () => {
    const url = await startServer();
    const socket = connectClient(url, {
      transports: ['websocket'],
      forceNew: true,
      extraHeaders: { cookie: 'theme=dark' },
    });
    clients.push(socket);

    const refused = await new Promise<Error>((resolve) =>
      socket.once('connect_error', resolve),
    );
    expect(refused.message).toBe('unauthorized');
  });

  /* The same account in a second tab gets its own seat back rather than the
     empty one, so nobody can end up playing themselves. */
  it('will not seat one account twice', async () => {
    const url = await startServer();
    const a = await connect(url, 'alice');
    const created = await ask<CreateOk>(a, 'match:create', { gameId: 'yazy' });

    const secondTab = await connect(url, 'alice');
    const again = await ask<JoinOk>(secondTab, 'match:join', {
      matchId: created.matchId,
    });

    expect(again).toMatchObject({ you: 'p0', reconnected: true });

    const b = await connect(url, 'bob');
    const joined = await ask<JoinOk>(b, 'match:join', {
      matchId: created.matchId,
    });
    expect(joined).toMatchObject({ you: 'p1', reconnected: false });
  });

  it('will not let another account take a seat that is held', async () => {
    const url = await startServer();
    const { b, created } = await openMatch(url);
    b.disconnect();

    const intruder = await connect(url, 'mallory');
    const refused = await ask<ErrAck>(intruder, 'match:join', {
      matchId: created.matchId,
    });

    expect(refused).toEqual({ error: 'full' });
  });
});

describe('server — play', () => {
  it('rejects an action from the player who is not on turn', async () => {
    const url = await startServer();
    const { b } = await openMatch(url);
    expect(await ask<ActionAck>(b, 'game:action', { type: 'ROLL' })).toEqual({
      error: 'not your turn',
    });
  });

  it('rejects an action from a socket with no seat', async () => {
    const url = await startServer();
    await openMatch(url);
    const stranger = await connect(url);
    expect(
      await ask<ActionAck>(stranger, 'game:action', { type: 'ROLL' }),
    ).toEqual({
      error: 'not in a match',
    });
  });

  it('plays a full match between two clients and declares a winner', async () => {
    const url = await startServer();
    const { a, b } = await openMatch(url);

    const overA = waitFor<OverPayload>(a, 'game:over');
    const overB = waitFor<OverPayload>(b, 'game:over');
    const seats: Record<PlayerId, Socket> = { p0: a, p1: b };

    for (const category of ALL_CATEGORIES) {
      for (const player of ['p0', 'p1'] as const) {
        const socket = seats[player];
        expect(
          await ask<ActionAck>(socket, 'game:action', { type: 'ROLL' }),
        ).toEqual({ ok: true });
        expect(
          await ask<ActionAck>(socket, 'game:action', {
            type: 'SCORE',
            category,
          }),
        ).toEqual({
          ok: true,
        });
      }
    }

    const [resultA, resultB] = await Promise.all([overA, overB]);
    expect(resultA).toEqual(resultB);
    expect(resultA.result).toBeDefined();
  }, 20_000);
});

describe('server — disconnect and reconnect', () => {
  it('pauses the match and restores it when the same account comes back', async () => {
    const url = await startServer();
    const { a, b, created } = await openMatch(url);

    const opponentGone = waitFor<OpponentPayload>(a, 'match:opponent');
    const paused = waitForPhase(a, 'paused');
    b.disconnect();

    expect(await opponentGone).toEqual({ connected: false });
    expect((await paused).snapshot.phase).toBe('paused');

    // A brand-new socket -- a refresh, another tab -- signed in as the same account.
    const c = await connect(url, 'bob');
    const resumed = waitForPhase(c, 'playing');
    const rejoined = await ask<JoinOk>(c, 'match:join', {
      matchId: created.matchId,
    });

    expect(rejoined).toMatchObject({ you: 'p1', reconnected: true });
    expect((await resumed).snapshot.phase).toBe('playing');
  });

  it('takes a player back to the match they walked away from', async () => {
    const url = await startServer();
    const { a, created } = await openMatch(url);
    await ask<CreateOk>(a, 'match:create', { gameId: 'yazy' });

    const resumed = waitForPhase(a, 'playing');
    const back = await ask<JoinOk>(a, 'match:join', {
      matchId: created.matchId,
    });

    expect(back).toMatchObject({ you: 'p0', reconnected: true });
    expect((await resumed).snapshot.matchId).toBe(created.matchId);
  });

  it('tells the opponent when a player walks off to start another match', async () => {
    const url = await startServer(100);
    const { a, b } = await openMatch(url);

    const dropped = waitFor<OpponentPayload>(b, 'match:opponent');
    const over = waitFor<OverPayload>(b, 'game:over');
    await ask<CreateOk>(a, 'match:create', { gameId: 'yazy' });

    expect(await dropped).toEqual({ connected: false });
    expect(await over).toEqual({
      result: { winner: 'p1', reason: 'opponent disconnected' },
    });
  });

  it('forfeits to the opponent when the grace window expires', async () => {
    const url = await startServer(100);
    const { a, b } = await openMatch(url);

    const over = waitFor<OverPayload>(a, 'game:over');
    b.disconnect();

    expect(await over).toEqual({
      result: { winner: 'p0', reason: 'opponent disconnected' },
    });
  });
});
