import { describe, expect, it } from "vitest";
import { scoreCategory, upperSectionTotal, totalScore, ALL_CATEGORIES } from "./scoring";
import type { Category } from "./types";

describe("scoreCategory — upper section", () => {
  it("counts matching faces only", () => {
    expect(scoreCategory("ones",   [1, 1, 2, 3, 4], false)).toBe(2);
    expect(scoreCategory("twos",   [2, 2, 2, 3, 4], false)).toBe(6);
    expect(scoreCategory("threes", [3, 3, 3, 3, 1], false)).toBe(12);
    expect(scoreCategory("fours",  [1, 2, 3, 4, 5], false)).toBe(4);
    expect(scoreCategory("fives",  [5, 5, 5, 5, 5], false)).toBe(25);
    expect(scoreCategory("sixes",  [1, 2, 3, 4, 5], false)).toBe(0);
  });
});

describe("scoreCategory — lower section", () => {
  it("three of a kind: sum of all dice if 3+ of same", () => {
    expect(scoreCategory("threeOfAKind", [3, 3, 3, 1, 2], false)).toBe(12);
    expect(scoreCategory("threeOfAKind", [1, 2, 3, 4, 5], false)).toBe(0);
  });

  it("four of a kind: sum of all dice if 4+ of same", () => {
    expect(scoreCategory("fourOfAKind", [4, 4, 4, 4, 2], false)).toBe(18);
    expect(scoreCategory("fourOfAKind", [3, 3, 3, 1, 2], false)).toBe(0);
  });

  it("full house: 25 for 3+2", () => {
    expect(scoreCategory("fullHouse", [2, 2, 3, 3, 3], false)).toBe(25);
    expect(scoreCategory("fullHouse", [1, 1, 1, 1, 2], false)).toBe(0);
    expect(scoreCategory("fullHouse", [1, 2, 3, 4, 5], false)).toBe(0);
  });

  it("straight: 40 for 5 consecutive", () => {
    expect(scoreCategory("straight", [1, 2, 3, 4, 5], false)).toBe(40);
    expect(scoreCategory("straight", [2, 3, 4, 5, 6], false)).toBe(40);
    expect(scoreCategory("straight", [1, 2, 3, 4, 6], false)).toBe(0);
    expect(scoreCategory("straight", [1, 2, 3, 4, 4], false)).toBe(0);
  });

  it("yahtzee: 50 for all same, 0 otherwise", () => {
    expect(scoreCategory("yahtzee", [5, 5, 5, 5, 5], false)).toBe(50);
    expect(scoreCategory("yahtzee", [5, 5, 5, 5, 4], false)).toBe(0);
  });
});

describe("scoreCategory — joker rules", () => {
  it("joker grants full house and straight at face value", () => {
    expect(scoreCategory("fullHouse", [4, 4, 4, 4, 4], true)).toBe(25);
    expect(scoreCategory("straight",  [4, 4, 4, 4, 4], true)).toBe(40);
  });

  it("joker grants three/four of a kind as sum", () => {
    expect(scoreCategory("threeOfAKind", [4, 4, 4, 4, 4], true)).toBe(20);
    expect(scoreCategory("fourOfAKind",  [4, 4, 4, 4, 4], true)).toBe(20);
  });
});

describe("upper bonus", () => {
  it("no bonus below 63", () => {
    const scores: Partial<Record<Category, number>> = {
      ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
    };
    expect(upperSectionTotal(scores)).toBe(62);
  });

  it("bonus at exactly 63", () => {
    const scores: Partial<Record<Category, number>> = {
      ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
    };
    expect(upperSectionTotal(scores)).toBe(63);
    expect(totalScore(scores, 0)).toBe(63 + 35);
  });

  it("bonus above 63", () => {
    const scores: Partial<Record<Category, number>> = {
      ones: 5, twos: 10, threes: 9, fours: 12, fives: 15, sixes: 18,
    };
    expect(upperSectionTotal(scores)).toBe(69);
    expect(totalScore(scores, 0)).toBe(69 + 35);
  });
});

describe("totalScore", () => {
  it("includes yahtzee bonus", () => {
    const scores: Partial<Record<Category, number>> = { threeOfAKind: 20 };
    expect(totalScore(scores, 100)).toBe(120);
  });

  it("all categories filled, no bonus", () => {
    const scores = Object.fromEntries(ALL_CATEGORIES.map(c => [c, 0])) as Record<Category, number>;
    scores.threeOfAKind = 30;
    expect(totalScore(scores, 0)).toBe(30);
  });
});
