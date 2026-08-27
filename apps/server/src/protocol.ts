import { z } from "zod";
import type { GameResult, PlayerId, Snapshot } from "@even-odds/game-sdk";

// Envelope validation only. Action semantics are the game's job, via isLegal.
export const matchCreateSchema = z.object({ gameId: z.string().min(1) });

export const matchJoinSchema = z.object({
  matchId: z.string().min(1),
  token: z.string().min(1).optional(),
});

export const gameActionSchema = z.looseObject({ type: z.string().min(1) });

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

export type ServerToClientEvents = {
  "match:state": (payload: MatchStatePayload) => void;
  "game:state": (payload: { snapshot: Snapshot<unknown> }) => void;
  "game:over": (payload: { result: GameResult }) => void;
  "match:opponent": (payload: { connected: boolean }) => void;
};

export type ClientToServerEvents = {
  "match:create": (payload: unknown, ack: (res: CreateAck) => void) => void;
  "match:join": (payload: unknown, ack: (res: JoinAck) => void) => void;
  "game:action": (payload: unknown, ack: (res: ActionAck) => void) => void;
  "match:leave": () => void;
};
