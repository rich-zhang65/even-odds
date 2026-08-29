import { describe, expect, it } from "vitest";
import { createRandom } from "../random";

describe("createRandom", () => {
  it("produces identical sequences from the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const rollsA = Array.from({ length: 20 }, () => a.int(1, 6));
    const rollsB = Array.from({ length: 20 }, () => b.int(1, 6));
    expect(rollsA).toEqual(rollsB);
  });

  it("produces different sequences from different seeds", () => {
    const a = createRandom(1);
    const b = createRandom(2);
    const rollsA = Array.from({ length: 10 }, () => a.int(1, 6));
    const rollsB = Array.from({ length: 10 }, () => b.int(1, 6));
    expect(rollsA).not.toEqual(rollsB);
  });

  it("int stays within bounds", () => {
    const r = createRandom(99);
    for (let i = 0; i < 1000; i++) {
      const n = r.int(1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  it("dice returns correct count and bounds", () => {
    const r = createRandom(7);
    const roll = r.dice(5, 6);
    expect(roll).toHaveLength(5);
    roll.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    });
  });

  it("shuffle returns all original elements", () => {
    const r = createRandom(13);
    const items = [1, 2, 3, 4, 5];
    const shuffled = r.shuffle(items);
    expect(shuffled).toHaveLength(items.length);
    expect(shuffled.sort()).toEqual([...items].sort());
  });
});
