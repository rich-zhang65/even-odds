import type { GameAction, PlayerId, Session } from '@even-odds/game-sdk';

/* Who is behind a socket, resolved from their session when it connects. */
export type Player = { id: string; username: string };

/* A seat belongs to an account, not to a tab. Whoever signs in as that account
   gets it back, from any browser, and nobody else can take it. */
export type Seat = {
  player: PlayerId;
  userId: string;
  socketId: string | null;
};

export type Match = {
  id: string;
  gameId: string;
  session: Session<unknown, GameAction>;
  seats: Record<PlayerId, Seat | null>;
};

type CreateResponse =
  | { ok: true; matchId: string; you: PlayerId }
  | { ok: false; error: 'unknown-game' };

type JoinResponse =
  | {
      ok: true;
      matchId: string;
      you: PlayerId;
      reconnected: boolean;
    }
  | { ok: false; error: 'notfound' | 'full' };

type ActionResponse = { ok: true } | { ok: false; error: string };

export type MatchRegistry = {
  getMatch(matchId: string): Match | null;
  createMatch(gameId: string, socketId: string, userId: string): CreateResponse;
  joinMatch(matchId: string, socketId: string, userId: string): JoinResponse;
  submitAction(socketId: string, action: GameAction): ActionResponse;
  resume(socketId: string): void;
  startIfReady(socketId: string): void;
  leaveOthers(socketId: string, keep: string): Match[];
  release(socketId: string): Match | null;
};

export type RegistryOptions = { graceMs?: number };

export type ServerOptions = {
  graceMs?: number;
  /* Turns a handshake's Cookie header into an account, or null to refuse the
     socket. Injected, so production asks the database and tests do not need one. */
  identify: (cookieHeader: string | undefined) => Promise<Player | null>;
};
