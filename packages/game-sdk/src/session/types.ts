import type { GameAction, GameResult, PlayerId } from "../types";

export type SessionPhase = "waiting" | "playing" | "paused" | "over";

export type Snapshot<S> = {
  matchId: string;
  phase: SessionPhase;
  state: S;
  currentPlayer: PlayerId;
  result: GameResult | null;
};

export type SessionEvent<S> =
  | { type: "state"; snapshot: Snapshot<S> }
  | { type: "over"; result: GameResult }
  | { type: "opponent"; connected: boolean };

export type SessionEmit<S> = (to: PlayerId, event: SessionEvent<S>) => void;

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SessionOptions<S> = {
  matchId: string;
  seed: number;
  now?: number;
  graceMs?: number;
  emit: SessionEmit<S>;
};

export type Session<S, A extends GameAction> = {
  start(): void;
  handleAction(action: A, by: PlayerId): ActionResult;
  onDisconnect(player: PlayerId): void;
  onReconnect(player: PlayerId): void;
  snapshotFor(viewer: PlayerId): Snapshot<S>;
  stop(): void;
};

