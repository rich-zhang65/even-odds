import type { GameResult, PlayerId } from "./types";
import type { Snapshot } from "./session/types";

export type SeatFlags = { p0: boolean; p1: boolean };

export type MatchStatePayload = {
  matchId: string;
  gameId: string;
  seats: SeatFlags;
};

export type CreateAck =
  | { matchId: string; you: PlayerId; token: string }
  | { error: string };

export type JoinAck =
  | { matchId: string; you: PlayerId; token: string; reconnected: boolean }
  | { error: string };

export type ActionAck = { ok: true } | { error: string };

export type ServerToClientEvents<S> = {
  "match:state": (payload: MatchStatePayload) => void;
  "game:state": (payload: { snapshot: Snapshot<S> }) => void;
  "game:over": (payload: { result: GameResult }) => void;
  "match:opponent": (payload: { connected: boolean }) => void;
};

export type ClientToServerEvents = {
  "match:create": (payload: unknown, ack: (res: CreateAck) => void) => void;
  "match:join": (payload: unknown, ack: (res: JoinAck) => void) => void;
  "game:action": (payload: unknown, ack: (res: ActionAck) => void) => void;
  "match:leave": () => void;
};
