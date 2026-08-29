import { describe, expect, it } from "vitest";
import { createEngine } from "../engine";
import type { GameDefinition, GameAction, PlayerId } from "../types";

type CountState = { count: number; turn: PlayerId; done: boolean };
type CountAction = GameAction & { type: "INCREMENT" };

const countGame: GameDefinition<CountState, CountAction> = {
  meta: {
    id: "count",
    name: "Count",
    tagline: "",
    estimatedMinutes: 1,
    mode: "turn-based",
    assets: { icon: null, sprites: {}, sounds: {} },
  },
  setup: (): CountState => ({ count: 0, turn: "p0", done: false }),
  currentPlayer: (s) => s.turn,
  isLegal: (s, a) => a.type === "INCREMENT" && !s.done,
  reduce: (s): CountState => ({
    count: s.count + 1,
    turn: s.turn === "p0" ? "p1" : "p0",
    done: s.count + 1 >= 4,
  }),
  isTerminal: (s) => (s.done ? { winner: s.turn === "p0" ? "p1" : "p0" } : null),
};

describe("createEngine", () => {
  it("same seed produces identical state after same actions", () => {
    const action: CountAction = { type: "INCREMENT" };

    const e1 = createEngine(countGame, { matchId: "m1", seed: 42 });
    const e2 = createEngine(countGame, { matchId: "m1", seed: 42 });

    e1.dispatch(action, "p0");
    e1.dispatch(action, "p1");
    e2.dispatch(action, "p0");
    e2.dispatch(action, "p1");

    expect(e1.state).toEqual(e2.state);
  });

  it("rejects action from wrong player", () => {
    const e = createEngine(countGame, { matchId: "m", seed: 1 });
    const result = e.dispatch({ type: "INCREMENT" }, "p1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not your turn");
  });

  it("rejects action after game is over", () => {
    const e = createEngine(countGame, { matchId: "m", seed: 1 });
    e.dispatch({ type: "INCREMENT" }, "p0");
    e.dispatch({ type: "INCREMENT" }, "p1");
    e.dispatch({ type: "INCREMENT" }, "p0");
    e.dispatch({ type: "INCREMENT" }, "p1");
    const result = e.dispatch({ type: "INCREMENT" }, "p0");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("match is over");
  });

  it("reports terminal result", () => {
    const e = createEngine(countGame, { matchId: "m", seed: 1 });
    expect(e.result()).toBeNull();
    e.dispatch({ type: "INCREMENT" }, "p0");
    e.dispatch({ type: "INCREMENT" }, "p1");
    e.dispatch({ type: "INCREMENT" }, "p0");
    e.dispatch({ type: "INCREMENT" }, "p1");
    expect(e.result()).not.toBeNull();
  });
});
