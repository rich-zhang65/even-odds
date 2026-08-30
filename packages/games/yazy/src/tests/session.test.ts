import { describe, expect, it } from "vitest";
import { createSession } from "@even-odds/game-sdk";
import type { PlayerId, SessionEvent } from "@even-odds/game-sdk";
import { Yazy } from "../logic";
import { ALL_CATEGORIES, totalScore } from "../scoring";
import type { YazyAction, YazyState } from "../types";

type Emitted = { to: PlayerId; event: SessionEvent<YazyState> };

const playFullMatch = () => {
  const emitted: Emitted[] = [];
  const session = createSession(Yazy, {
    matchId: "m1",
    seed: 42,
    emit: (to, event) => emitted.push({ to, event }),
  });

  session.start();

  const rejected: string[] = [];
  const act = (action: YazyAction, by: PlayerId) => {
    const result = session.handleAction(action, by);
    if (!result.ok) rejected.push(`${by} ${action.type}: ${result.error}`);
  };

  for (const category of ALL_CATEGORIES) {
    for (const player of ["p0", "p1"] satisfies PlayerId[]) {
      if (session.snapshotFor(player).phase !== "playing") break;
      act({ type: "ROLL" }, player);
      act({ type: "SCORE", category }, player);
    }
  }

  return { session, emitted, rejected };
};

describe("Yazy over a TurnBasedSession", () => {
  it("drives a full 11-round match to game over with no socket", () => {
    const { session, emitted, rejected } = playFullMatch();

    expect(rejected).toEqual([]);

    const over = emitted.filter(e => e.event.type === "over");
    expect(over).toHaveLength(2);
    expect(over.map(e => e.to)).toEqual(["p0", "p1"]);

    const snapshot = session.snapshotFor("p0");
    expect(snapshot.phase).toBe("over");
    expect(snapshot.state.round).toBe(12);
    expect(snapshot.result).not.toBeNull();
  });

  it("declares the higher total score the winner", () => {
    const { session } = playFullMatch();
    const { state, result } = session.snapshotFor("p0");

    const p0 = totalScore(state.scores.p0);
    const p1 = totalScore(state.scores.p1);
    const expected = p0 === p1 ? { draw: true } : { winner: p0 > p1 ? "p0" : "p1" };

    expect(result).toEqual(expected);
  });

  it("pushes a state snapshot to both players on every action", () => {
    const { emitted } = playFullMatch();
    const states = emitted.filter(e => e.event.type === "state");

    // start + (roll + score) x 11 categories x 2 players, each fanned out to both seats
    expect(states).toHaveLength((1 + 11 * 2 * 2) * 2);
  });

  it("fills every category for both players", () => {
    const { session } = playFullMatch();
    const { state } = session.snapshotFor("p1");

    for (const category of ALL_CATEGORIES) {
      expect(state.scores.p0[category]).toBeTypeOf("number");
      expect(state.scores.p1[category]).toBeTypeOf("number");
    }
  });
});
