import { describe, expect, it } from "vitest";
import { createRealtimeSession } from "../realtime";
import { createSession } from "../index";
import type { Cancel, Scheduler } from "../scheduler";
import type { RealtimeSnapshot, SessionEvent, Snapshot } from "../types";
import type { GameDefinition, PlayerId } from "../../types";

/* A scheduler with no clock behind it. Time only moves when a test says so, so a
   whole match runs in microseconds and never waits on a real timer. */
const manualScheduler = () => {
  let now = 0;
  const repeating: (() => void)[] = [];
  const delayed: { at: number; run: () => void }[] = [];

  const scheduler: Scheduler = {
    now: () => now,
    every: (_ms, run): Cancel => {
      repeating.push(run);
      return () => {
        const i = repeating.indexOf(run);
        if (i !== -1) repeating.splice(i, 1);
      };
    },
    after: (ms, run): Cancel => {
      const job = { at: now + ms, run };
      delayed.push(job);
      return () => {
        const i = delayed.indexOf(job);
        if (i !== -1) delayed.splice(i, 1);
      };
    },
  };

  const advance = (ms: number): void => {
    now += ms;
    for (const job of [...delayed]) {
      if (job.at > now) continue;
      delayed.splice(delayed.indexOf(job), 1);
      job.run();
    }
    for (const run of [...repeating]) run();
  };

  return { scheduler, advance };
};

type DriftState = { x: number; vx: number; nudges: Record<PlayerId, number> };
type DriftAction = { type: "NUDGE" };

const STEP_MS = 1000 / 60;

/* Drifts right at a fixed rate until it passes 100, so position is a pure
   function of how many ticks have run and a wrong count is obvious. */
const Drift: GameDefinition<DriftState, DriftAction> = {
  meta: {
    id: "drift",
    name: "Drift",
    tagline: "Moves on its own",
    estimatedMinutes: 1,
    mode: "realtime",
    assets: { icon: null, sprites: {}, sounds: {} },
  },
  tickRateHz: 60,
  setup: () => ({ x: 0, vx: 1, nudges: { p0: 0, p1: 0 } }),
  currentPlayer: () => "p0",
  // One nudge per player per match, so a second one queued alongside the first is
  // legal on arrival and illegal by the time the tick reaches it.
  isLegal: (state, _action, by) => state.nudges[by] === 0,
  reduce: (state, _action, by) => ({
    ...state,
    nudges: { ...state.nudges, [by]: state.nudges[by] + 1 },
  }),
  tick: (state) => ({ ...state, x: state.x + state.vx }),
  isTerminal: (state) => (state.x > 100 ? { winner: "p0" } : null),
};

type Emitted = { to: PlayerId; event: SessionEvent<DriftState> };

const newSession = (graceMs = 60_000) => {
  const emitted: Emitted[] = [];
  const { scheduler, advance } = manualScheduler();
  const session = createRealtimeSession(Drift, {
    matchId: "m1",
    seed: 1,
    graceMs,
    scheduler,
    emit: (to, event) => emitted.push({ to, event }),
  });
  const steps = (n: number): void => {
    for (let i = 0; i < n; i++) advance(STEP_MS);
  };

  return { session, emitted, advance, steps };
};

const realtime = (snapshot: Snapshot<DriftState>): RealtimeSnapshot<DriftState> => {
  if (snapshot.mode !== "realtime") throw new Error(`unexpected ${snapshot.mode} snapshot`);
  return snapshot;
};

const look = (session: ReturnType<typeof newSession>["session"]) =>
  realtime(session.snapshotFor("p0"));

describe("RealtimeSession — the loop", () => {
  it("does not tick until it is started", () => {
    const { session, advance } = newSession();

    advance(STEP_MS * 10);

    expect(look(session).tick).toBe(0);
    expect(look(session).state.x).toBe(0);
  });

  it("banks elapsed time and spends it in whole steps", () => {
    const { session, advance } = newSession();
    session.start();

    // Two and a half steps of time buys exactly two ticks; the half is kept.
    advance(STEP_MS * 2.5);
    expect(look(session).tick).toBe(2);

    // Another half step completes the third.
    advance(STEP_MS * 0.5);
    expect(look(session).tick).toBe(3);
  });

  it("advances the same way whatever shape the elapsed time arrives in", () => {
    const even = newSession();
    const jittery = newSession();
    even.session.start();
    jittery.session.start();

    for (let i = 0; i < 12; i++) even.advance(STEP_MS);
    jittery.advance(STEP_MS * 7);
    jittery.advance(STEP_MS * 0.5);
    jittery.advance(STEP_MS * 4.5);

    expect(look(jittery.session).tick).toBe(look(even.session).tick);
    expect(look(jittery.session).state.x).toBe(look(even.session).state.x);
  });

  it("broadcasts at a third of the tick rate, not on every tick", () => {
    const { session, emitted, steps } = newSession();
    session.start();
    emitted.length = 0;

    steps(6);

    // 6 ticks at 60Hz against a 20Hz broadcast is 2 rounds, to both players.
    expect(emitted.filter((e) => e.event.type === "state")).toHaveLength(4);
  });

  it("stamps each snapshot from the scheduler's clock", () => {
    const { session, advance } = newSession();
    session.start();

    advance(500);

    expect(look(session).at).toBe(500);
  });
});

describe("RealtimeSession — input", () => {
  it("holds input for the next tick rather than applying it on arrival", () => {
    const { session, advance } = newSession();
    session.start();

    expect(session.handleAction({ type: "NUDGE" }, "p0")).toEqual({ ok: true });
    expect(look(session).state.nudges.p0).toBe(0);

    advance(STEP_MS);
    expect(look(session).state.nudges.p0).toBe(1);
  });

  it("takes input from both players in the same tick", () => {
    const { session, advance } = newSession();
    session.start();

    session.handleAction({ type: "NUDGE" }, "p0");
    session.handleAction({ type: "NUDGE" }, "p1");
    advance(STEP_MS);

    expect(look(session).state.nudges).toEqual({ p0: 1, p1: 1 });
  });

  it("re-judges legality at the tick, against state the drain is moving", () => {
    const { session, steps } = newSession();
    session.start();

    // Both legal on arrival. The first makes the second illegal before it is read.
    expect(session.handleAction({ type: "NUDGE" }, "p0")).toEqual({ ok: true });
    expect(session.handleAction({ type: "NUDGE" }, "p0")).toEqual({ ok: true });
    steps(1);

    expect(look(session).state.nudges.p0).toBe(1);
  });

  it("refuses input once the match is not playing", () => {
    const { session } = newSession();

    expect(session.handleAction({ type: "NUDGE" }, "p0")).toEqual({
      ok: false,
      error: "match is waiting",
    });
  });
});

describe("RealtimeSession — interruptions", () => {
  it("stops simulating while a player is away", () => {
    const { session, advance } = newSession();
    session.start();
    advance(STEP_MS * 3);
    const frozen = look(session).state.x;

    session.onDisconnect("p1");
    advance(STEP_MS * 30);

    expect(look(session).phase).toBe("paused");
    expect(look(session).state.x).toBe(frozen);
  });

  it("resumes without fast-forwarding through the time nobody was playing", () => {
    const { session, advance } = newSession();
    session.start();
    session.onDisconnect("p1");
    advance(STEP_MS * 100);
    const frozen = look(session).tick;

    session.onReconnect("p1");
    advance(STEP_MS);

    expect(look(session).tick).toBe(frozen + 1);
  });

  it("forfeits once the grace window runs out", () => {
    const { session, emitted, advance } = newSession(1_000);
    session.start();
    session.onDisconnect("p1");

    advance(1_000);

    expect(look(session).result).toEqual({
      winner: "p0",
      reason: "opponent disconnected",
    });
    expect(emitted.some((e) => e.event.type === "over")).toBe(true);
  });

  it("ends the match when the game says so, and stops ticking", () => {
    const { session, emitted, steps } = newSession();
    session.start();

    steps(101);
    const settled = look(session).tick;
    steps(50);

    expect(look(session).phase).toBe("over");
    expect(look(session).result).toEqual({ winner: "p0" });
    expect(look(session).tick).toBe(settled);
    expect(emitted.filter((e) => e.event.type === "over")).toHaveLength(2);
  });

  it("stops the loop when the session is stopped", () => {
    const { session, advance } = newSession();
    session.start();
    advance(STEP_MS * 2);
    const frozen = look(session).tick;

    session.stop();
    advance(STEP_MS * 20);

    expect(look(session).tick).toBe(frozen);
  });
});

describe("createSession — realtime selection", () => {
  it("builds a realtime session for a realtime game", () => {
    const session = createSession(Drift, { matchId: "m1", seed: 1, emit: () => undefined });
    expect(realtime(session.snapshotFor("p0")).mode).toBe("realtime");
    session.stop();
  });
});
