import type { PlayerId } from "@even-odds/game-sdk";

export type Category =
  | "ones" | "twos" | "threes" | "fours" | "fives" | "sixes"
  | "threeOfAKind" | "fourOfAKind" | "fullHouse" | "straight" | "yazy";

export type YazyState = {
  dice: number[];
  held: boolean[];
  rollsLeft: number;
  turn: PlayerId;
  round: number;
  scores: Record<PlayerId, Partial<Record<Category, number>>>;
};

export type YazyAction =
  | { type: "ROLL" }
  | { type: "TOGGLE_HOLD"; index: number }
  | { type: "SCORE"; category: Category };
