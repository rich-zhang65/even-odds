import type { GameAction, GameResult, PlayerId } from "../types";

export type SessionPhase = "waiting" | "playing" | "paused" | "over";

/* Two runtimes, two shapes, discriminated by the same `mode` GameMeta already
   uses. Spelled out in full rather than a shared base intersected with the
   differences -- which are more than one, and go both ways. */
export type TurnBasedSnapshot<S> = {
  mode: "turn-based";
  matchId: string;
  phase: SessionPhase;
  state: S;
  currentPlayer: PlayerId;
  result: GameResult | null;
};

/* No currentPlayer: nobody is on turn, so the field is absent rather than null.

   The timebase is here and only here. `tick` lets a client order or discard
   snapshots that arrive out of sequence, and `at` lets it render behind the
   server and interpolate between the two most recent ones. Turn-based needs
   neither: it pushes once per action down an ordered connection, and has
   nothing to interpolate between. */
export type RealtimeSnapshot<S> = {
  mode: "realtime";
  matchId: string;
  phase: SessionPhase;
  state: S;
  tick: number;
  at: number;
  result: GameResult | null;
};

export type Snapshot<S> = TurnBasedSnapshot<S> | RealtimeSnapshot<S>;

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
