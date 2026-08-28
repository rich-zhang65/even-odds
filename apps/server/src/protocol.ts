import { z } from "zod";

// Envelope validation only. Action semantics are the game's job, via isLegal.
export const matchCreateSchema = z.object({ gameId: z.string().min(1) });

export const matchJoinSchema = z.object({
  matchId: z.string().min(1),
  token: z.string().min(1).optional(),
});

export const gameActionSchema = z.looseObject({ type: z.string().min(1) });

export type {
  SeatFlags,
  MatchStatePayload,
  CreateAck,
  JoinAck,
  ActionAck,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@even-odds/game-sdk";
