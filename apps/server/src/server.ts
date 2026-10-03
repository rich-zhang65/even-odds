import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { createRegistry } from './matches';
import {
  gameActionSchema,
  matchCreateSchema,
  matchJoinSchema,
} from './protocol';
import type {
  ClientToServerEvents,
  MatchStatePayload,
  ServerToClientEvents,
} from './protocol';
import type { Match, Player, Seat, ServerOptions } from './types';

type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents<unknown>,
  Record<string, never>,
  { player: Player }
>;

export const attachSocketServer = (
  http: HttpServer,
  opts: ServerOptions,
): SocketServer => {
  const io: SocketServer = new Server(http, { cors: { origin: '*' } });

  /* Nobody reaches a match without an account. The browser sends the login
     cookie with the handshake on its own -- ports do not count towards a
     cookie's site, so localhost:3000's reaches :4000 -- and a socket that
     cannot be identified never connects at all. */
  io.use((socket, next) => {
    opts
      .identify(socket.handshake.headers.cookie)
      .then((player) => {
        if (player === null) {
          next(new Error('unauthorized'));
          return;
        }
        socket.data.player = player;
        next();
      })
      .catch(next);
  });

  const registry = createRegistry(
    (socketId, event) => {
      const socket = io.sockets.sockets.get(socketId);

      if (!socket) return;

      switch (event.type) {
        case 'state':
          socket.emit('game:state', { snapshot: event.snapshot });
          return;
        case 'over':
          socket.emit('game:over', { result: event.result });
          return;
        case 'opponent':
          socket.emit('match:opponent', { connected: event.connected });
          return;
        default:
          return event satisfies never;
      }
    },
    { graceMs: opts.graceMs, record: opts.record },
  );

  const isConnected = (seat: Seat | null): boolean =>
    seat !== null && seat.socketId !== null;

  const broadcastMatchState = (match: Match): void => {
    const payload: MatchStatePayload = {
      matchId: match.id,
      gameId: match.gameId,
      seats: {
        p0: isConnected(match.seats.p0),
        p1: isConnected(match.seats.p1),
      },
    };
    for (const player of ['p0', 'p1'] as const) {
      const socketId = match.seats[player]?.socketId;
      if (socketId)
        io.sockets.sockets.get(socketId)?.emit('match:state', payload);
    }
  };

  io.on('connection', (socket) => {
    socket.on('match:create', (raw, ack) => {
      const parsed = matchCreateSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ error: 'bad-payload' });
        return;
      }

      const result = registry.createMatch(
        parsed.data.gameId,
        socket.id,
        socket.data.player.id,
      );
      if (!result.ok) {
        ack({ error: result.error });
        return;
      }

      for (const left of registry.leaveOthers(socket.id, result.matchId)) {
        broadcastMatchState(left);
      }

      ack({ matchId: result.matchId, you: result.you });
      const match = registry.getMatch(result.matchId);
      if (match) broadcastMatchState(match);
    });

    socket.on('match:join', (raw, ack) => {
      const parsed = matchJoinSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ error: 'bad-payload' });
        return;
      }

      const result = registry.joinMatch(
        parsed.data.matchId,
        socket.id,
        socket.data.player.id,
      );
      if (!result.ok) {
        ack({ error: result.error });
        return;
      }

      for (const left of registry.leaveOthers(socket.id, result.matchId)) {
        broadcastMatchState(left);
      }

      ack({
        matchId: result.matchId,
        you: result.you,
        reconnected: result.reconnected,
      });

      const match = registry.getMatch(result.matchId);
      if (match) broadcastMatchState(match);
      if (result.reconnected) {
        registry.resume(socket.id);
        return;
      }
      registry.startIfReady(socket.id);
    });

    socket.on('game:action', (raw, ack) => {
      const parsed = gameActionSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ error: 'bad-payload' });
        return;
      }
      const outcome = registry.submitAction(socket.id, parsed.data);
      ack(outcome.ok ? { ok: true } : { error: outcome.error });
    });

    socket.on('match:leave', () => {
      const match = registry.release(socket.id);
      if (match) broadcastMatchState(match);
    });

    socket.on('disconnect', () => {
      const match = registry.release(socket.id);
      if (match) broadcastMatchState(match);
    });
  });

  return io;
};
