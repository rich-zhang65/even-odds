import type { GameAction, PlayerId, Session } from '@even-odds/game-sdk';

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

type CreateResponse =
  | { ok: true; matchId: string; you: PlayerId; token: string }
  | { ok: false; error: 'unknown-game' };

type JoinResponse =
  | {
      ok: true;
      matchId: string;
      you: PlayerId;
      token: string;
      reconnected: boolean;
    }
  | { ok: false; error: 'notfound' | 'full' };

type ActionResponse = { ok: true } | { ok: false; error: string };

export type MatchRegistry = {
  getMatch(matchId: string): Match | null;
  createMatch(gameId: string, socketId: string): CreateResponse;
  joinMatch(matchId: string, socketId: string, token?: string): JoinResponse;
  submitAction(socketId: string, action: GameAction): ActionResponse;
  resume(socketId: string): void;
  startIfReady(socketId: string): void;
  leaveOthers(socketId: string, keep: string): Match[];
  release(socketId: string): Match | null;
};

export type RegistryOptions = { graceMs?: number };
