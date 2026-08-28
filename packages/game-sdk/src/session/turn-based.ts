import { createEngine } from "../engine";
import type { GameAction, GameDefinition, GameResult, PlayerId } from "../types";
import type { Session, SessionEvent, SessionOptions, SessionPhase, Snapshot } from "./types";

const OPPONENT: Record<PlayerId, PlayerId> = { p0: "p1", p1: "p0" };

const DEFAULT_GRACE_MS = 60_000;

export const createTurnBasedSession = <S, A extends GameAction>(
  def: GameDefinition<S, A>,
  opts: SessionOptions<S>
): Session<S, A> => {
  const engine = createEngine(def, {
    matchId: opts.matchId,
    seed: opts.seed,
    now: opts.now,
  });
  const graceMs = opts.graceMs ?? DEFAULT_GRACE_MS;
  const connected: Record<PlayerId, boolean> = { p0: false, p1: false };

  let phase: SessionPhase = "waiting";
  let forfeit: GameResult | null = null;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;

  const snapshotFor = (viewer: PlayerId): Snapshot<S> => ({
    matchId: engine.context.matchId,
    phase,
    state: def.playerView?.(engine.state, viewer) ?? engine.state,
    currentPlayer: def.currentPlayer(engine.state),
    result: forfeit ?? engine.result(),
  });

  const broadcast = (event: SessionEvent<S>): void => {
    for (const player of engine.context.players) {
      opts.emit(player, event);
    }
  };

  const broadcastState = (): void => {
    for (const player of engine.context.players) {
      opts.emit(player, { type: "state", snapshot: snapshotFor(player) });
    }
  };

  const clearGrace = (): void => {
    if (graceTimer === null) return;
    clearTimeout(graceTimer);
    graceTimer = null;
  };

  const forfeitBy = (player: PlayerId): void => {
    graceTimer = null;
    if (phase === "over") return;
    const result: GameResult = { winner: OPPONENT[player], reason: "opponent disconnected" };
    phase = "over";
    forfeit = result;
    broadcastState();
    broadcast({ type: "over", result });
  };

  return {
    start: () => {
      if (phase !== "waiting") return;
      connected.p0 = true;
      connected.p1 = true;
      phase = "playing";
      broadcastState();
    },

    handleAction: (action, by) => {
      if (phase !== "playing") return { ok: false, error: `match is ${phase}` };

      const dispatched = engine.dispatch(action, by);
      if (!dispatched.ok) return { ok: false, error: dispatched.error };

      const terminal = engine.result();
      if (terminal) {
        clearGrace();
        phase = "over";
        broadcastState();
        broadcast({ type: "over", result: terminal });
        return { ok: true };
      }

      broadcastState();
      return { ok: true };
    },

    onDisconnect: (player) => {
      if (phase === "over") return;
      connected[player] = false;
      opts.emit(OPPONENT[player], { type: "opponent", connected: false });

      if (phase !== "playing") return;
      phase = "paused";
      broadcastState();
      graceTimer = setTimeout(() => forfeitBy(player), graceMs);
    },

    onReconnect: (player) => {
      if (phase === "over") return;
      connected[player] = true;
      clearGrace();
      opts.emit(OPPONENT[player], { type: "opponent", connected: true });

      if (phase === "paused" && connected.p0 && connected.p1) {
        phase = "playing";
      }
      broadcastState();
    },

    snapshotFor,

    stop: () => {
      clearGrace();
      phase = "over";
    },
  };
};
