import { describe, expect, it } from "vitest";
import { aimedAt, seenBy } from "../perspective";
import type { PlayerId } from "../../src/types";

/* Deliberately not square, so a transform that swapped the two axes or reused
   one dimension for both would fail rather than coincide. */
const FIELD = { width: 100, height: 200 };

const INSET = 5;
const NEAR_EDGE: Record<PlayerId, number> = {
  p0: FIELD.height - INSET,
  p1: INSET,
};

const OPPONENT: Record<PlayerId, PlayerId> = { p0: "p1", p1: "p0" };

describe("perspective", () => {
  it("leaves the field alone for p0 and for anyone watching", () => {
    expect(seenBy("p0", { x: 30, y: 20 }, FIELD)).toEqual({ x: 30, y: 20 });
    expect(seenBy(null, { x: 30, y: 20 }, FIELD)).toEqual({ x: 30, y: 20 });
    expect(aimedAt("p0", 30, FIELD)).toBe(30);
    expect(aimedAt(null, 30, FIELD)).toBe(30);
  });

  it("turns the field around for p1 rather than mirroring it", () => {
    expect(seenBy("p1", { x: 30, y: 20 }, FIELD)).toEqual({ x: 70, y: 180 });

    // A reflection would have left x where it was; both axes have to turn.
    expect(seenBy("p1", { x: 30, y: 20 }, FIELD).x).not.toBe(30);
  });

  /* The point of the whole thing: whoever you are, you are at the bottom of the
     screen and your opponent is at the top. */
  it("puts your own end at the bottom and your opponent's at the top", () => {
    for (const seat of ["p0", "p1"] as const) {
      const mine = seenBy(seat, { x: FIELD.width / 2, y: NEAR_EDGE[seat] }, FIELD);
      const theirs = seenBy(seat, { x: FIELD.width / 2, y: NEAR_EDGE[OPPONENT[seat]] }, FIELD);

      expect(mine.y).toBeGreaterThan(FIELD.height / 2);
      expect(theirs.y).toBeLessThan(FIELD.height / 2);
    }
  });

  it("draws your piece back under the cursor that aimed it", () => {
    for (const seat of ["p0", "p1"] as const) {
      const cursor = 20;
      const onField = aimedAt(seat, cursor, FIELD);

      expect(seenBy(seat, { x: onField, y: NEAR_EDGE[seat] }, FIELD).x).toBe(cursor);
    }
  });

  it("keeps the two seats looking at the same point from opposite ends", () => {
    const point = { x: 25, y: 60 };
    const forP0 = seenBy("p0", point, FIELD);
    const forP1 = seenBy("p1", point, FIELD);

    expect(forP0.x + forP1.x).toBe(FIELD.width);
    expect(forP0.y + forP1.y).toBe(FIELD.height);
  });

  it("works for a field of any shape", () => {
    const wide = { width: 300, height: 80 };

    expect(seenBy("p1", { x: 10, y: 10 }, wide)).toEqual({ x: 290, y: 70 });
    expect(aimedAt("p1", 10, wide)).toBe(290);
  });
});
