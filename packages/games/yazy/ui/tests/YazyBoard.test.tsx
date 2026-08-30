import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { YazyBoard } from "../YazyBoard";
import type { Category, YazyState } from "../../src/types";

type Scores = Partial<Record<Category, number>>;

const snapshotOf = (overrides: {
  dice?: number[];
  rollsLeft?: number;
  turn?: PlayerId;
  p0?: Scores;
  p1?: Scores;
  phase?: Snapshot<YazyState>["phase"];
  result?: Snapshot<YazyState>["result"];
}): Snapshot<YazyState> => {
  const turn = overrides.turn ?? "p0";
  const state: YazyState = {
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

const render = (snapshot: Snapshot<YazyState>, seat: PlayerId | null) =>
  renderToStaticMarkup(<YazyBoard snapshot={snapshot} seat={seat} onAction={() => {}} />);

const cell = (html: string, label: string): { tag: string; text: string } => {
  const found = html.match(new RegExp(`<button([^>]*aria-label="${label}"[^>]*)>([^<]*)</button>`));
  if (found === null) throw new Error(`no cell for ${label}`);
  return { tag: found[1], text: found[2] };
};

describe("YazyBoard", () => {
  it("washes a cell only once it is taken, so a column reads filled versus empty", () => {
    // Red is up, so Blue's column is the one with nothing open in it.
    const html = render(snapshotOf({ turn: "p0", p1: { ones: 3 } }), "p1");

    // Taken: seat wash, seat ink, heavy.
    expect(cell(html, "Ones, Blue").tag).toContain("bg-eo-blue-soft");
    expect(cell(html, "Ones, Blue").tag).toContain("font-extrabold");

    // Untaken, and not the acting player's: no wash at all.
    expect(cell(html, "Twos, Blue").tag).toContain("bg-eo-card");
    expect(cell(html, "Twos, Blue").tag).not.toContain("bg-eo-blue-soft");
  });

  it("lights the acting player's open rows for both players, from the turn's start", () => {
    // rollsLeft 3 -- the turn has begun and nothing has been rolled yet.
    const fresh = snapshotOf({ turn: "p0", rollsLeft: 3 });

    for (const viewer of ["p0", "p1"] as const) {
      const open = cell(render(fresh, viewer), "Yazy, Red");
      expect(open.tag).toContain("bg-eo-red-solid"); // tinted for whoever is looking
      expect(open.text).toBe(""); // but nothing to read yet
      expect(open.tag).toContain("disabled"); // SCORE is illegal at rollsLeft 3
    }

    // The waiting player's own column stays plain.
    expect(cell(render(fresh, "p1"), "Yazy, Blue").tag).toContain("bg-eo-card");
  });

  it("shows the acting player's preview to their opponent as well", () => {
    const html = render(snapshotOf({ turn: "p0", dice: [3, 3, 3, 3, 3] }), "p1");

    const red = cell(html, "Yazy, Red");
    expect(red.text).toBe("50");
    expect(red.tag).toContain("disabled"); // visible, but not the watcher's to score
  });

  it("renders a preview muted, so it cannot pass for a committed score", () => {
    const html = render(snapshotOf({ p0: { ones: 3 } }), "p0");

    const preview = cell(html, "Twos, Red");
    expect(preview.tag).toContain("text-eo-faint");
    expect(preview.tag).not.toContain("font-extrabold");

    expect(cell(html, "Ones, Red").tag).toContain("text-eo-red-ink");
  });

  it("gives every category a cell for each player", () => {
    const html = render(snapshotOf({}), "p0");

    for (const label of ["Ones", "Sixes", "Full House", "Straight", "Yazy"]) {
      expect(() => cell(html, `${label}, Red`)).not.toThrow();
      expect(() => cell(html, `${label}, Blue`)).not.toThrow();
    }
  });

  it("previews a score only in the acting player's column", () => {
    const html = render(snapshotOf({ dice: [3, 3, 3, 3, 3] }), "p0");

    const red = cell(html, "Yazy, Red");
    const blue = cell(html, "Yazy, Blue");

    expect(red.text).toBe("50");
    expect(red.tag).not.toContain("disabled");
    expect(blue.text).toBe("");
    expect(blue.tag).toContain("disabled");
  });

  it("previews nothing to the player waiting for their turn", () => {
    const html = render(snapshotOf({ turn: "p1" }), "p0");

    const red = cell(html, "Yazy, Red");
    expect(red.text).toBe("");
    expect(red.tag).toContain("disabled");
  });

  it("offers nothing before the dice are rolled", () => {
    const html = render(snapshotOf({ rollsLeft: 3 }), "p0");

    expect(cell(html, "Yazy, Red").tag).toContain("disabled");
  });

  it("keeps a scored zero visible instead of blanking the cell", () => {
    const html = render(snapshotOf({ p0: { ones: 0 } }), "p0");

    expect(cell(html, "Ones, Red").text).toBe("0");
  });

  it("closes a category once it has been scored", () => {
    const html = render(snapshotOf({ p0: { yazy: 50 } }), "p0");

    const red = cell(html, "Yazy, Red");
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
