import type { Category } from "./types";

export type CategoryInfo = {
  label: string;
  description: string;
};

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  ones:         { label: "Ones",           description: "Sum of all 1s" },
  twos:         { label: "Twos",           description: "Sum of all 2s" },
  threes:       { label: "Threes",         description: "Sum of all 3s" },
  fours:        { label: "Fours",          description: "Sum of all 4s" },
  fives:        { label: "Fives",          description: "Sum of all 5s" },
  sixes:        { label: "Sixes",          description: "Sum of all 6s" },
  threeOfAKind: { label: "3 of a Kind",    description: "Sum of all dice (need 3 of same)" },
  fourOfAKind:  { label: "4 of a Kind",    description: "Sum of all dice (need 4 of same)" },
  fullHouse:    { label: "Full House",     description: "25 pts — 3 of one, 2 of another" },
  straight:     { label: "Straight",       description: "40 pts — 5 consecutive numbers" },
  yahtzee:      { label: "Yahtzee",        description: "50 pts — all 5 dice the same" },
};

const sum = (dice: number[]): number => dice.reduce((acc, d) => acc + d, 0);

const countFaces = (dice: number[]): Map<number, number> => {
  const counts = new Map<number, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
};

const maxCount = (counts: Map<number, number>): number =>
  Math.max(0, ...counts.values());

const isYahtzee = (dice: number[]): boolean => dice.every(d => d === dice[0]);

const isFullHouse = (counts: Map<number, number>): boolean => {
  const vals = [...counts.values()].sort((a, b) => a - b);
  return vals.length === 2 && vals[0] === 2 && vals[1] === 3;
};

const hasStraight = (dice: number[]): boolean => {
  const unique = new Set(dice);
  return (
    [1, 2, 3, 4, 5].every(n => unique.has(n)) ||
    [2, 3, 4, 5, 6].every(n => unique.has(n))
  );
};

export const scoreCategory = (category: Category, dice: number[], isJoker: boolean): number => {
  const counts = countFaces(dice);
  const total = sum(dice);

  switch (category) {
    case "ones":         return dice.filter(d => d === 1).length;
    case "twos":         return dice.filter(d => d === 2).length * 2;
    case "threes":       return dice.filter(d => d === 3).length * 3;
    case "fours":        return dice.filter(d => d === 4).length * 4;
    case "fives":        return dice.filter(d => d === 5).length * 5;
    case "sixes":        return dice.filter(d => d === 6).length * 6;
    case "threeOfAKind": return (isJoker || maxCount(counts) >= 3) ? total : 0;
    case "fourOfAKind":  return (isJoker || maxCount(counts) >= 4) ? total : 0;
    case "fullHouse":    return (isJoker || isFullHouse(counts)) ? 25 : 0;
    case "straight":     return (isJoker || hasStraight(dice)) ? 40 : 0;
    case "yahtzee":      return isYahtzee(dice) ? 50 : 0;
  }
};

export const UPPER_CATEGORIES: Category[] = [
  "ones", "twos", "threes", "fours", "fives", "sixes",
];

export const LOWER_CATEGORIES: Category[] = [
  "threeOfAKind", "fourOfAKind", "fullHouse", "straight", "yahtzee",
];

export const ALL_CATEGORIES: Category[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];

export const totalScore = (scores: Partial<Record<Category, number>>): number =>
  ALL_CATEGORIES.reduce((acc, cat) => acc + (scores[cat] ?? 0), 0);
