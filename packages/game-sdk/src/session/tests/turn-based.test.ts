import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTurnBasedSession } from "../turn-based";
import { createSession } from "../index";
import type { SessionEvent } from "../types";
import type { GameDefinition, PlayerId } from "../../types";

type RaceState = {
  scores: Record<PlayerId, number>;
  secret: Record<PlayerId, number>;
  turn: PlayerId;
};

type RaceAction = { type: "INC" };

const TARGET = 3;

// Minimal stand-in game — game-sdk must not depend on a game package.
const Race: GameDefinition<RaceState, RaceAction> = {
  meta: {
    id: "race",
    name: "Race",
    tagline: "First to three",
    estimatedMinutes: 1,
    mode: "turn-based",
    assets: { icon: null, sprites: {}, sounds: {} },
  },
  setup: (ctx) => ({
    scores: { p0: 0, p1: 0 },
    secret: { p0: 11, p1: 22 },
    turn: ctx.players[0],
  }),
  currentPlayer: (state) => state.turn,
  isLegal: (_state, action) => action.type === "INC",
  reduce: (state, _action, by) => ({
    ...state,
    scores: { ...state.scores, [by]: state.scores[by] + 1 },
    turn: by === "p0" ? "p1" : "p0",
  }),
  isTerminal: (state) => {
    if (state.scores.p0 >= TARGET) return { winner: "p0" };
    if (state.scores.p1 >= TARGET) return { winner: "p1" };
    return null;
  },
  playerView: (state, viewer) => ({
    ...state,
    secret: { ...state.secret, [viewer === "p0" ? "p1" : "p0"]: 0 },
  }),
};

type Emitted = { to: PlayerId; event: SessionEvent<RaceState> };

const newSession = (graceMs = 60_000) => {
  const emitted: Emitted[] = [];
  const session = createTurnBasedSession(Race, {
    matchId: "m1",
    seed: 1,
    graceMs,
    emit: (to, event) => emitted.push({ to, event }),
  });
  return { session, emitted };
};

const inc = (): RaceAction => ({ type: "INC" });

const eventsOfType = (emitted: Emitted[], type: SessionEvent<RaceState>["type"]) =>
  emitted.filter(e => e.event.type === type);

describe("TurnBasedSession — lifecycle", () => {
  it("starts in waiting and reports it in the snapshot", () => {
    const { session, emitted } = newSession();
    expect(session.snapshotFor("p0").phase).toBe("waiting");
    expect(emitted).toHaveLength(0);
  });

  it("start() moves to playing and pushes state to both players", () => {
    const { session, emitted } = newSession();
    session.start();

    expect(session.snapshotFor("p0").phase).toBe("playing");
    expect(emitted.map(e => e.to)).toEqual(["p0", "p1"]);
    expect(eventsOfType(emitted, "state")).toHaveLength(2);
  });

  it("start() is idempotent", () => {
    const { session, emitted } = newSession();
    session.start();
    session.start();
    expect(emitted).toHaveLength(2);
  });

  it("rejects actions before start", () => {
    const { session } = newSession();
    const result = session.handleAction(inc(), "p0");
    expect(result).toEqual({ ok: false, error: "match is waiting" });
  });
});

describe("TurnBasedSession — actions", () => {
  it("broadcasts state to both players after a legal action", () => {
    const { session, emitted } = newSession();
    session.start();
    emitted.length = 0;

    expect(session.handleAction(inc(), "p0")).toEqual({ ok: true });
    expect(emitted.map(e => e.to)).toEqual(["p0", "p1"]);
    expect(session.snapshotFor("p0").state.scores.p0).toBe(1);
    expect(session.snapshotFor("p0").currentPlayer).toBe("p1");
  });

  it("rejects an out-of-turn action and emits nothing", () => {
    const { session, emitted } = newSession();
    session.start();
    emitted.length = 0;

    const result = session.handleAction(inc(), "p1");
    expect(result).toEqual({ ok: false, error: "not your turn" });
    expect(emitted).toHaveLength(0);
  });

  it("emits over to both players when the game ends", () => {
    const { session, emitted } = newSession();
    session.start();
    for (let i = 0; i < TARGET; i++) {
      session.handleAction(inc(), "p0");
      if (session.snapshotFor("p0").phase === "playing") session.handleAction(inc(), "p1");
    }

    const over = eventsOfType(emitted, "over");
    expect(over).toHaveLength(2);
    expect(over.map(e => e.to)).toEqual(["p0", "p1"]);
    expect(over[0].event).toEqual({ type: "over", result: { winner: "p0" } });
    expect(session.snapshotFor("p0").phase).toBe("over");
  });

  it("rejects actions once the game is over", () => {
    const { session } = newSession();
    session.start();
    for (let i = 0; i < TARGET; i++) {
      session.handleAction(inc(), "p0");
      if (session.snapshotFor("p0").phase === "playing") session.handleAction(inc(), "p1");
    }
    expect(session.handleAction(inc(), "p1")).toEqual({ ok: false, error: "match is over" });
  });
});

describe("createSession — runtime selection", () => {
  it("builds a turn-based session for a turn-based game", () => {
    const session = createSession(Race, { matchId: "m1", seed: 1, emit: () => {} });
    session.start();
    expect(session.snapshotFor("p0").phase).toBe("playing");
  });

  it("refuses a realtime game until that runtime exists", () => {
    const realtimeRace: GameDefinition<RaceState, RaceAction> = {
      ...Race,
      meta: { ...Race.meta, id: "race-rt", mode: "realtime" },
    };
    expect(() => createSession(realtimeRace, { matchId: "m1", seed: 1, emit: () => {} }))
      .toThrow(/realtime sessions are not implemented yet \(game: race-rt\)/);
  });

  it("survives its methods being detached onto socket handlers", () => {
    const { session, emitted } = newSession();
    const { start, handleAction, onDisconnect } = session;

    start();
    expect(handleAction(inc(), "p0")).toEqual({ ok: true });
    onDisconnect("p1");

    expect(session.snapshotFor("p0").phase).toBe("paused");
    expect(emitted.some(e => e.event.type === "opponent")).toBe(true);
  });
});

describe("TurnBasedSession — player view", () => {
  it("masks the opponent's secret per viewer", () => {
    const { session } = newSession();
    session.start();

    expect(session.snapshotFor("p0").state.secret).toEqual({ p0: 11, p1: 0 });
    expect(session.snapshotFor("p1").state.secret).toEqual({ p0: 0, p1: 22 });
  });
});

describe("TurnBasedSession — disconnect", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("pauses the match and tells the opponent", () => {
    const { session, emitted } = newSession();
    session.start();
    emitted.length = 0;

    session.onDisconnect("p0");
    expect(session.snapshotFor("p0").phase).toBe("paused");
    expect(emitted[0]).toEqual({ to: "p1", event: { type: "opponent", connected: false } });
  });

  it("rejects actions while paused", () => {
    const { session } = newSession();
    session.start();
    session.onDisconnect("p1");
    expect(session.handleAction(inc(), "p0")).toEqual({ ok: false, error: "match is paused" });
  });

  it("resumes on reconnect within the grace window", () => {
    const { session, emitted } = newSession();
    session.start();
    session.onDisconnect("p0");
    emitted.length = 0;

    vi.advanceTimersByTime(59_000);
    session.onReconnect("p0");

    expect(session.snapshotFor("p0").phase).toBe("playing");
    expect(emitted[0]).toEqual({ to: "p1", event: { type: "opponent", connected: true } });

    vi.advanceTimersByTime(60_000);
    expect(session.snapshotFor("p0").phase).toBe("playing");
  });

  it("forfeits to the opponent once the grace window expires", () => {
    const { session, emitted } = newSession();
    session.start();
    session.onDisconnect("p0");
    emitted.length = 0;

    vi.advanceTimersByTime(60_000);

    expect(session.snapshotFor("p0").phase).toBe("over");
    expect(session.snapshotFor("p0").result).toEqual({
      winner: "p1",
      reason: "opponent disconnected",
    });
    expect(eventsOfType(emitted, "over")).toHaveLength(2);
  });

  it("does not forfeit a match that already ended", () => {
    const { session, emitted } = newSession();
    session.start();
    session.onDisconnect("p0");
    session.stop();
    emitted.length = 0;

    vi.advanceTimersByTime(60_000);
    expect(emitted).toHaveLength(0);
  });

  it("honours a custom grace window", () => {
    const { session } = newSession(5_000);
    session.start();
    session.onDisconnect("p1");

    vi.advanceTimersByTime(4_999);
    expect(session.snapshotFor("p0").phase).toBe("paused");

    vi.advanceTimersByTime(1);
    expect(session.snapshotFor("p0").result).toEqual({
      winner: "p0",
      reason: "opponent disconnected",
    });
  });
});
