import type { RandomAPI } from "./types";

const mulberry32 = (seed: number): (() => number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const createRandom = (seed: number): RandomAPI => {
  const next = mulberry32(seed);

  return {
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    dice(count, sides) {
      return Array.from({ length: count }, () => 1 + Math.floor(next() * sides));
    },
    shuffle<T>(items: readonly T[]): T[] {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
};
