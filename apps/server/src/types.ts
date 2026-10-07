import type { FinishedMatch } from '@even-odds/db';
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
  // Set when both seats fill and play begins; null for a match still waiting.
  startedAt: Date | null;
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

/* Handed every match that reaches a result, once. Fire and forget: a failed
   write is logged by whoever supplies this and never reaches the players. */
export type RecordMatch = (finished: FinishedMatch) => void;

export type RegistryOptions = { graceMs?: number; record?: RecordMatch };

export type ServerOptions = {
  graceMs?: number;
  /* The one website allowed to open a game connection, such as the deployed
     web app's address. Left out, any may: local development and tests. */
  origin?: string;
  record?: RecordMatch;
  /* Turns the ticket a client offered -- untouched, so it may be anything at
     all -- into an account, or null to refuse the socket. Injected, so tests
     choose their own secret. */
  identify: (ticket: unknown) => Promise<Player | null>;
};
