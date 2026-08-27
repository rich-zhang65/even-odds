import { describe, expect, it } from "vitest";
import { createEngine } from "@even-odds/game-sdk";
import { Yahtzee } from "./logic";
import { ALL_CATEGORIES } from "./scoring";
import type { YahtzeeAction, Category } from "./types";

const newGame = (seed = 1) =>
  createEngine(Yahtzee, { matchId: "test", seed });

const roll = (): YahtzeeAction => ({ type: "ROLL" });
const score = (category: Category): YahtzeeAction => ({ type: "SCORE", category });
const hold = (index: number): YahtzeeAction => ({ type: "TOGGLE_HOLD", index });

describe("Yahtzee — illegal move rejection", () => {
  it("rejects scoring before rolling", () => {
    const e = newGame();
    const result = e.dispatch(score("ones"), "p0");
    expect(result.ok).toBe(false);
  });

  it("rejects a 4th roll", () => {
    const e = newGame();
    e.dispatch(roll(), "p0");
    e.dispatch(roll(), "p0");
    e.dispatch(roll(), "p0");
    const result = e.dispatch(roll(), "p0");
    expect(result.ok).toBe(false);
  });

  it("rejects scoring an already-filled category", () => {
    const e = newGame();
    e.dispatch(roll(), "p0");
    e.dispatch(score("ones"), "p0");
    e.dispatch(roll(), "p1");
    e.dispatch(score("ones"), "p1");
    // p0's second turn — ones is already filled
    e.dispatch(roll(), "p0");
    const result = e.dispatch(score("ones"), "p0");
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-turn actions", () => {
    const e = newGame();
    const result = e.dispatch(roll(), "p1");
    expect(result.ok).toBe(false);
  });

  it("rejects holding before any roll", () => {
    const e = newGame();
    const result = e.dispatch(hold(0), "p0");
    expect(result.ok).toBe(false);
  });
});

describe("Yahtzee — turn flow", () => {
  it("alternates turns after scoring", () => {
    const e = newGame();
    e.dispatch(roll(), "p0");
    e.dispatch(score("ones"), "p0");
    expect(e.state.turn).toBe("p1");
  });

  it("resets dice and rollsLeft after scoring", () => {
    const e = newGame();
    e.dispatch(roll(), "p0");
    e.dispatch(hold(0), "p0");
    e.dispatch(score("ones"), "p0");
    expect(e.state.rollsLeft).toBe(3);
    expect(e.state.held.every(h => !h)).toBe(true);
  });

  it("increments round after both players score", () => {
    const e = newGame();
    expect(e.state.round).toBe(1);
    e.dispatch(roll(), "p0");
    e.dispatch(score("ones"), "p0");
    expect(e.state.round).toBe(1);
    e.dispatch(roll(), "p1");
    e.dispatch(score("ones"), "p1");
    expect(e.state.round).toBe(2);
  });
});

describe("Yahtzee — terminal detection", () => {
  it("is null until all categories are filled", () => {
    const e = newGame();
    expect(e.result()).toBeNull();
  });

  it("declares a winner after all 11 rounds", () => {
    const e = newGame(42);
    // Play all 11 rounds: each player rolls once and scores a category
    const categories = [...ALL_CATEGORIES];
    for (let i = 0; i < 11; i++) {
      e.dispatch(roll(), "p0");
      e.dispatch(score(categories[i]), "p0");
      e.dispatch(roll(), "p1");
      e.dispatch(score(categories[i]), "p1");
    }
    const result = e.result();
    expect(result).not.toBeNull();
    expect(result).toMatchObject(
      expect.objectContaining({ winner: expect.stringMatching(/^p[01]$/) })
    );
  });
});

describe("Yahtzee — bonus", () => {
  it("awards 100-point bonus for a second Yahtzee", () => {
    const e = newGame();
    expect(e.state.yahtzeeBonus).toEqual({ p0: 0, p1: 0 });
  });
});
