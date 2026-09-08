import { describe, expect, it } from "vitest";
import type { PlayerId } from "@even-odds/game-sdk";
import { aimedAt, seenBy } from "../perspective";
import { PADDLE, TABLE } from "../../src/types";

/* Where each player's paddle actually sits on the server's one table. */
const PADDLE_Y: Record<PlayerId, number> = {
  p0: TABLE.height - PADDLE.inset,
  p1: PADDLE.inset,
};

const OPPONENT: Record<PlayerId, PlayerId> = { p0: "p1", p1: "p0" };

describe("Pong — perspective", () => {
  it("leaves the table alone for p0 and for anyone watching", () => {
    expect(seenBy("p0", { x: 30, y: 20 })).toEqual({ x: 30, y: 20 });
    expect(seenBy(null, { x: 30, y: 20 })).toEqual({ x: 30, y: 20 });
    expect(aimedAt("p0", 30)).toBe(30);
    expect(aimedAt(null, 30)).toBe(30);
  });

  it("turns the table around for p1 rather than mirroring it", () => {
    expect(seenBy("p1", { x: 30, y: 20 })).toEqual({ x: 70, y: 180 });

    // A reflection would have left x where it was; both axes have to turn.
    expect(seenBy("p1", { x: 30, y: 20 }).x).not.toBe(30);
  });

  /* The point of the whole thing: whoever you are, you are at the bottom of the
     screen and your opponent is at the top. */
  it("puts your own paddle at the bottom and your opponent's at the top", () => {
    for (const seat of ["p0", "p1"] as const) {
      const mine = seenBy(seat, { x: TABLE.width / 2, y: PADDLE_Y[seat] });
      const theirs = seenBy(seat, { x: TABLE.width / 2, y: PADDLE_Y[OPPONENT[seat]] });

      expect(mine.y).toBeGreaterThan(TABLE.height / 2);
      expect(theirs.y).toBeLessThan(TABLE.height / 2);
    }
  });

  it("draws your paddle back under the cursor that aimed it", () => {
    for (const seat of ["p0", "p1"] as const) {
      const cursor = 20;
      const onTable = aimedAt(seat, cursor);

      expect(seenBy(seat, { x: onTable, y: PADDLE_Y[seat] }).x).toBe(cursor);
    }
  });

  it("keeps the two seats looking at the same ball from opposite ends", () => {
    const ball = { x: 25, y: 60 };
    const forP0 = seenBy("p0", ball);
    const forP1 = seenBy("p1", ball);

    expect(forP0.x + forP1.x).toBe(TABLE.width);
    expect(forP0.y + forP1.y).toBe(TABLE.height);
  });
});
