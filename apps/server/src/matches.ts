import { nanoid } from "nanoid";
import { createSession } from "@even-odds/game-sdk";
import type { GameAction, PlayerId, Session, SessionEvent, Snapshot } from "@even-odds/game-sdk";
import { getGame } from "./games";

const SEATS: readonly PlayerId[] = ["p0", "p1"];

export type Seat = {
  player: PlayerId;
  token: string;
  socketId: string | null;
};

export type Match = {
  id: string;
  gameId: string;
  session: Session<unknown, GameAction>;
  seats: Record<PlayerId, Seat | null>;
};

export type Deliver = (socketId: string, event: SessionEvent<unknown>) => void;

export type CreateResult =
  | { ok: true; matchId: string; you: PlayerId; token: string }
  | { ok: false; error: "unknown-game" };

export type JoinResult =
  | { ok: true; matchId: string; you: PlayerId; token: string; reconnected: boolean }
  | { ok: false; error: "notfound" | "full" };

export type ActionOutcome = { ok: true } | { ok: false; error: string };

export type MatchRegistry = {
  create(gameId: string, socketId: string): CreateResult;
  join(matchId: string, socketId: string, token?: string): JoinResult;
  activate(socketId: string, reconnected: boolean): void;
  action(socketId: string, action: GameAction): ActionOutcome;
  leaveOthers(socketId: string, keep: string): Match[];
  release(socketId: string): Match | null;
  matchFor(socketId: string): Match | null;
  get(matchId: string): Match | null;
  snapshot(matchId: string, viewer: PlayerId): Snapshot<unknown> | null;
  size(): number;
};

export const createRegistry = (
  deliver: Deliver,
  opts: { graceMs?: number } = {}
): MatchRegistry => {
  const matches = new Map<string, Match>();

  const seatOf = (match: Match, socketId: string): Seat | null => {
    for (const player of SEATS) {
      const seat = match.seats[player];
      if (seat?.socketId === socketId) return seat;
    }
    return null;
  };

  // Tens of matches at most, so a scan beats an index that can fall out of sync.
  const locate = (socketId: string): { match: Match; seat: Seat } | null => {
    for (const match of matches.values()) {
      const seat = seatOf(match, socketId);
      if (seat) return { match, seat };
    }
    return null;
  };

  const seated = (match: Match): boolean => SEATS.every(player => match.seats[player] !== null);

  const vacate = (match: Match, seat: Seat): void => {
    seat.socketId = null;
    match.session.onDisconnect(seat.player);
  };

  return {
    create(gameId, socketId) {
      const def = getGame(gameId);
      if (!def) return { ok: false, error: "unknown-game" };

      const id = nanoid(10);
      const seats: Record<PlayerId, Seat | null> = { p0: null, p1: null };
      const session = createSession(def, {
        matchId: id,
        seed: Math.floor(Math.random() * 2 ** 31),
        graceMs: opts.graceMs,
        emit: (to, event) => {
          const socketId = seats[to]?.socketId;
          if (socketId) deliver(socketId, event);
        },
      });

      const seat: Seat = { player: "p0", token: nanoid(16), socketId };
      seats.p0 = seat;
      matches.set(id, { id, gameId, session, seats });

      return { ok: true, matchId: id, you: "p0", token: seat.token };
    },

    join(matchId, socketId, token) {
      const match = matches.get(matchId);
      if (!match) return { ok: false, error: "notfound" };

      // A socket that already holds a seat re-joins into it, never into the other
      // one — otherwise a creator whose token is missing takes both seats.
      const held = seatOf(match, socketId);
      if (held) {
        return { ok: true, matchId, you: held.player, token: held.token, reconnected: true };
      }

      if (token) {
        for (const player of SEATS) {
          const seat = match.seats[player];
          if (seat?.token !== token) continue;
          seat.socketId = socketId;
          return { ok: true, matchId, you: player, token, reconnected: true };
        }
      }

      const open = SEATS.find(player => match.seats[player] === null);
      if (open === undefined) return { ok: false, error: "full" };

      match.seats[open] = { player: open, token: nanoid(16), socketId };
      const joined = match.seats[open];
      return { ok: true, matchId, you: open, token: joined.token, reconnected: false };
    },

    // Split from join() so the caller can ack first — otherwise a player receives
    // game:state before it knows which seat it is.
    activate(socketId, reconnected) {
      const found = locate(socketId);
      if (!found) return;
      if (reconnected) {
        found.match.session.onReconnect(found.seat.player);
        return;
      }
      if (seated(found.match)) found.match.session.start();
    },

    action(socketId, action) {
      const found = locate(socketId);
      if (!found) return { ok: false, error: "not in a match" };
      return found.match.session.handleAction(action, found.seat.player);
    },

    // One socket holds one seat, so locate() can never answer with a match the
    // player has already walked away from.
    leaveOthers(socketId, keep) {
      const left: Match[] = [];
      for (const match of matches.values()) {
        if (match.id === keep) continue;
        const seat = seatOf(match, socketId);
        if (!seat) continue;
        vacate(match, seat);
        left.push(match);
      }
      return left;
    },

    release(socketId) {
      const found = locate(socketId);
      if (!found) return null;
      vacate(found.match, found.seat);
      return found.match;
    },

    matchFor(socketId) {
      return locate(socketId)?.match ?? null;
    },

    get(matchId) {
      return matches.get(matchId) ?? null;
    },

    snapshot(matchId, viewer) {
      return matches.get(matchId)?.session.snapshotFor(viewer) ?? null;
    },

    size() {
      return matches.size;
    },
  };
};
