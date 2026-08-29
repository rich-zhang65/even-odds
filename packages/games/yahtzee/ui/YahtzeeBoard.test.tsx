import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { YahtzeeBoard } from "./YahtzeeBoard";
import type { Category, YahtzeeState } from "../src/types";

type Scores = Partial<Record<Category, number>>;

const snapshotOf = (overrides: {
  dice?: number[];
  rollsLeft?: number;
  turn?: PlayerId;
  p0?: Scores;
  p1?: Scores;
  phase?: Snapshot<YahtzeeState>["phase"];
  result?: Snapshot<YahtzeeState>["result"];
}): Snapshot<YahtzeeState> => {
  const turn = overrides.turn ?? "p0";
  const state: YahtzeeState = {
    dice: overrides.dice ?? [3, 3, 3, 3, 3],
    held: [false, false, false, false, false],
    rollsLeft: overrides.rollsLeft ?? 2,
    turn,
    round: 1,
    scores: { p0: overrides.p0 ?? {}, p1: overrides.p1 ?? {} },
  };

  return {
    matchId: "m1",
    phase: overrides.phase ?? "playing",
    state,
    currentPlayer: turn,
    result: overrides.result ?? null,
  };
};

const render = (snapshot: Snapshot<YahtzeeState>, seat: PlayerId | null) =>
  renderToStaticMarkup(
    <YahtzeeBoard snapshot={snapshot} seat={seat} onAction={() => {}} />,
  );

const cell = (html: string, label: string): { tag: string; text: string } => {
  const found = html.match(new RegExp(`<button([^>]*aria-label="${label}"[^>]*)>([^<]*)</button>`));
  if (found === null) throw new Error(`no cell for ${label}`);
  return { tag: found[1], text: found[2] };
};

describe("YahtzeeBoard", () => {
  it("gives every category a cell for each player", () => {
    const html = render(snapshotOf({}), "p0");

    for (const label of ["Ones", "Sixes", "Full House", "Straight", "Yahtzee"]) {
      expect(() => cell(html, `${label}, Red`)).not.toThrow();
      expect(() => cell(html, `${label}, Blue`)).not.toThrow();
    }
  });

  it("previews a score only in the viewer's own column", () => {
    const html = render(snapshotOf({ dice: [3, 3, 3, 3, 3] }), "p0");

    const red = cell(html, "Yahtzee, Red");
    const blue = cell(html, "Yahtzee, Blue");

    expect(red.text).toBe("50");
    expect(red.tag).not.toContain("disabled");
    expect(blue.text).toBe("");
    expect(blue.tag).toContain("disabled");
  });

  it("previews nothing to the player waiting for their turn", () => {
    const html = render(snapshotOf({ turn: "p1" }), "p0");

    const red = cell(html, "Yahtzee, Red");
    expect(red.text).toBe("");
    expect(red.tag).toContain("disabled");
  });

  it("offers nothing before the dice are rolled", () => {
    const html = render(snapshotOf({ rollsLeft: 3 }), "p0");

    expect(cell(html, "Yahtzee, Red").tag).toContain("disabled");
  });

  it("keeps a scored zero visible instead of blanking the cell", () => {
    const html = render(snapshotOf({ p0: { ones: 0 } }), "p0");

    expect(cell(html, "Ones, Red").text).toBe("0");
  });

  it("closes a category once it has been scored", () => {
    const html = render(snapshotOf({ p0: { yahtzee: 50 } }), "p0");

    const red = cell(html, "Yahtzee, Red");
    expect(red.text).toBe("50");
    expect(red.tag).toContain("disabled");
  });

  // With the turn badge gone, colour is the only thing that says whose turn it is.
  it("underlines the acting player's column and paints the roll button to match", () => {
    const red = render(snapshotOf({ turn: "p0" }), "p0");
    expect(red).toContain("border-b-eo-red-solid");
    expect(red).not.toContain("border-b-eo-blue-solid");
    expect(red).toContain("bg-eo-red-solid");

    const blue = render(snapshotOf({ turn: "p1" }), "p0");
    expect(blue).toContain("border-b-eo-blue-solid");
    expect(blue).not.toContain("border-b-eo-red-solid");
    expect(blue).toContain("bg-eo-blue-solid");
  });

  it("drops the turn underline once the game is over", () => {
    const html = render(snapshotOf({ result: { draw: true }, phase: "over" }), "p0");

    expect(html).not.toContain("border-b-eo-red-solid");
    expect(html).not.toContain("border-b-eo-blue-solid");
  });

  it("labels the button for the acting player at every stage of the turn", () => {
    for (const rollsLeft of [3, 2, 1, 0]) {
      expect(render(snapshotOf({ rollsLeft }), "p0")).toContain("Roll");
    }
  });

  // A label naming the opponent was wide enough to shove the roll pips around.
  it("leaves the button wordless for the player who cannot act", () => {
    for (const rollsLeft of [2, 0]) {
      expect(render(snapshotOf({ turn: "p1", rollsLeft }), "p0")).not.toContain("Roll");
    }
  });

  it("leaves the button wordless once the game is over", () => {
    expect(render(snapshotOf({ result: { draw: true }, phase: "over" }), "p0")).not.toContain(
      "Roll",
    );
  });
});
