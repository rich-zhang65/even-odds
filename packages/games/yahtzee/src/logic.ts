import type { GameDefinition, PlayerId } from "@even-odds/game-sdk";
import type { YahtzeeState, YahtzeeAction, Category } from "./types";
import {
  scoreCategory,
  ALL_CATEGORIES,
  UPPER_CATEGORIES,
  LOWER_CATEGORIES,
} from "./scoring";
import { assets } from "./assets";

const FACE_TO_UPPER: Record<number, Category> = {
  1: "ones", 2: "twos", 3: "threes", 4: "fours", 5: "fives", 6: "sixes",
};

const isJokerSituation = (state: YahtzeeState, by: PlayerId): boolean =>
  state.dice.every(d => d === state.dice[0]) && state.scores[by]["yahtzee"] === 50;

export const legalScoringCategories = (state: YahtzeeState, by: PlayerId): Category[] => {
  const playerScores = state.scores[by];

  if (isJokerSituation(state, by)) {
    const upperCat = FACE_TO_UPPER[state.dice[0] ?? 1];
    if (playerScores[upperCat] === undefined) return [upperCat];

    const openLower = LOWER_CATEGORIES.filter(c => playerScores[c] === undefined);
    if (openLower.length > 0) return openLower;

    return UPPER_CATEGORIES.filter(c => playerScores[c] === undefined);
  }

  return ALL_CATEGORIES.filter(c => playerScores[c] === undefined);
};

export const previewScore = (state: YahtzeeState, by: PlayerId, category: Category): number =>
  scoreCategory(category, state.dice, isJokerSituation(state, by));

export const Yahtzee: GameDefinition<YahtzeeState, YahtzeeAction> = {
  meta: {
    id: "yahtzee",
    name: "Yahtzee",
    tagline: "Roll your way to victory",
    estimatedMinutes: 15,
    mode: "turn-based",
    assets,
  },

  setup: (ctx) => ({
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 3,
    turn: ctx.players[0],
    round: 1,
    scores: { p0: {}, p1: {} },
    yahtzeeBonus: { p0: 0, p1: 0 },
  }),

  currentPlayer: (state) => state.turn,

  isLegal: (state, action, by) => {
    if (state.turn !== by) return false;

    switch (action.type) {
      case "ROLL":
        return state.rollsLeft > 0;
      case "TOGGLE_HOLD":
        return state.rollsLeft < 3 && action.index >= 0 && action.index < 5;
      case "SCORE":
        return (
          state.rollsLeft < 3 &&
          legalScoringCategories(state, by).includes(action.category)
        );
    }
  },

  reduce: (state, action, by, ctx) => {
    switch (action.type) {
      case "ROLL": {
        const dice = state.dice.map((d, i) =>
          state.held[i] ? d : ctx.random.int(1, 6)
        );
        return { ...state, dice, rollsLeft: state.rollsLeft - 1 };
      }

      case "TOGGLE_HOLD": {
        const held = state.held.map((h, i) => (i === action.index ? !h : h));
        return { ...state, held };
      }

      case "SCORE": {
        const joker = isJokerSituation(state, by);
        const points = scoreCategory(action.category, state.dice, joker);
        const rolledAnotherYahtzee = state.dice.every(d => d === state.dice[0]);
        const bonusPoints =
          rolledAnotherYahtzee && state.scores[by]["yahtzee"] === 50 ? 100 : 0;

        const nextTurn: PlayerId = by === "p0" ? "p1" : "p0";
        const nextRound = by === "p1" ? state.round + 1 : state.round;

        return {
          ...state,
          dice: [1, 1, 1, 1, 1],
          held: [false, false, false, false, false],
          rollsLeft: 3,
          turn: nextTurn,
          round: nextRound,
          scores: { ...state.scores, [by]: { ...state.scores[by], [action.category]: points } },
          yahtzeeBonus: { ...state.yahtzeeBonus, [by]: state.yahtzeeBonus[by] + bonusPoints },
        };
      }
    }
  },

  isTerminal: (state) => {
    const allFilled = (scores: Partial<Record<Category, number>>) =>
      ALL_CATEGORIES.every(cat => scores[cat] !== undefined);

    if (!allFilled(state.scores.p0) || !allFilled(state.scores.p1)) return null;

    const s0 = ALL_CATEGORIES.reduce((acc, c) => acc + (state.scores.p0[c] ?? 0), 0) +
      (UPPER_CATEGORIES.reduce((a, c) => a + (state.scores.p0[c] ?? 0), 0) >= 63 ? 35 : 0) +
      state.yahtzeeBonus.p0;
    const s1 = ALL_CATEGORIES.reduce((acc, c) => acc + (state.scores.p1[c] ?? 0), 0) +
      (UPPER_CATEGORIES.reduce((a, c) => a + (state.scores.p1[c] ?? 0), 0) >= 63 ? 35 : 0) +
      state.yahtzeeBonus.p1;

    if (s0 > s1) return { winner: "p0" };
    if (s1 > s0) return { winner: "p1" };
    return { draw: true };
  },
};
