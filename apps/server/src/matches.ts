import { nanoid } from 'nanoid';
import { createSession } from '@even-odds/game-sdk';
import type { PlayerId, SessionEvent } from '@even-odds/game-sdk';
import { getGameDefinition } from './games';
import type { MatchRegistry, Match, Seat, RegistryOptions } from './types';

const SEATS: readonly PlayerId[] = ['p0', 'p1'];

export const createRegistry = (
  deliverEvent: (socketId: string, event: SessionEvent<unknown>) => void,
  opts: RegistryOptions = {},
): MatchRegistry => {
  const matches = new Map<string, Match>();

  const getSeatFromSocket = (match: Match, socketId: string): Seat | null => {
    for (const player of SEATS) {
      const seat = match.seats[player];
      if (seat?.socketId === socketId) return seat;
    }
    return null;
  };

  // Tens of matches at most, so a scan beats an index that can fall out of sync.
  const locateMatchAndSeat = (
    socketId: string,
  ): { match: Match; seat: Seat } | null => {
    for (const match of matches.values()) {
      const seat = getSeatFromSocket(match, socketId);
      if (seat) return { match, seat };
    }
    return null;
  };

  const seated = (match: Match): boolean =>
    SEATS.every((player) => match.seats[player] !== null);

  const vacate = (match: Match, seat: Seat): void => {
    seat.socketId = null;
    match.session.onDisconnect(seat.player);
  };

  return {
    getMatch(matchId) {
      return matches.get(matchId) ?? null;
    },

    createMatch(gameId, socketId) {
      const gameDef = getGameDefinition(gameId);
      if (!gameDef) return { ok: false, error: 'unknown-game' };

      const id = nanoid(10);
      const seats: Record<PlayerId, Seat | null> = { p0: null, p1: null };
      const session = createSession(gameDef, {
        matchId: id,
        seed: Math.floor(Math.random() * 2 ** 31),
        graceMs: opts.graceMs,
        emit: (to, event) => {
          const socketId = seats[to]?.socketId;
          if (socketId) deliverEvent(socketId, event);
        },
      });

      const seat: Seat = { player: 'p0', token: nanoid(16), socketId };
      seats.p0 = seat;
      matches.set(id, { id, gameId, session, seats });

      return { ok: true, matchId: id, you: 'p0', token: seat.token };
    },

    joinMatch(matchId, socketId, token) {
      const match = matches.get(matchId);
      if (!match) return { ok: false, error: 'notfound' };

      const held = getSeatFromSocket(match, socketId);
      if (held) {
        return {
          ok: true,
          matchId,
          you: held.player,
          token: held.token,
          reconnected: true,
        };
      }

      if (token) {
        for (const player of SEATS) {
          const seat = match.seats[player];
          if (seat?.token !== token) continue;
          seat.socketId = socketId;
          return { ok: true, matchId, you: player, token, reconnected: true };
        }
      }

      const open = SEATS.find((player) => match.seats[player] === null);
      if (open === undefined) return { ok: false, error: 'full' };

      match.seats[open] = { player: open, token: nanoid(16), socketId };
      const joined = match.seats[open];
      return {
        ok: true,
        matchId,
        you: open,
        token: joined.token,
        reconnected: false,
      };
    },

    // Split from join() so the caller can ack first — otherwise a player receives
    // game:state before it knows which seat it is.
    resume(socketId) {
      const found = locateMatchAndSeat(socketId);
      if (!found) return;
      found.match.session.onReconnect(found.seat.player);
    },

    startIfReady(socketId) {
      const found = locateMatchAndSeat(socketId);
      if (!found) return;
      if (seated(found.match)) found.match.session.start();
    },

    submitAction(socketId, action) {
      const found = locateMatchAndSeat(socketId);
      if (!found) return { ok: false, error: 'not in a match' };
      return found.match.session.handleAction(action, found.seat.player);
    },

    // One socket holds one seat, so locate() can never answer with a match the
    // player has already walked away from.
    leaveOthers(socketId, keep) {
      const left: Match[] = [];
      for (const match of matches.values()) {
        if (match.id === keep) continue;
        const seat = getSeatFromSocket(match, socketId);
        if (!seat) continue;
        vacate(match, seat);
        left.push(match);
      }
      return left;
    },

    release(socketId) {
      const found = locateMatchAndSeat(socketId);
      if (!found) return null;
      vacate(found.match, found.seat);
      return found.match;
    },
  };
};
