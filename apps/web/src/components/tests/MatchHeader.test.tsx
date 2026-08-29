import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GameResult, PlayerId } from "@even-odds/game-sdk";
import { MatchHeader } from "../MatchHeader";

const render = (
  seat: PlayerId | null,
  result: GameResult | null = null,
  totals: Record<PlayerId, number> = { p0: 164, p1: 174 },
) =>
  renderToStaticMarkup(
    <MatchHeader title="Yahtzee" totals={totals} seat={seat} result={result} onExit={() => {}} />,
  );

describe("MatchHeader", () => {
  it("shows the running score with both seats named", () => {
    const html = render("p0");

    expect(html).toContain("Red");
    expect(html).toContain("Blue");
    expect(html).toContain(">164<");
    expect(html).toContain(">174<");
  });

  it("marks whichever seat is the viewer, and neither for a spectator", () => {
    expect(render("p0")).toContain("You");
    expect(render("p1")).toContain("You");
    expect(render(null)).not.toContain("You");
  });

  it("hides the banner until there is a result", () => {
    const html = render("p0");

    expect(html).not.toContain("wins");
    expect(html).not.toContain("Draw");
  });

  // Both seats read the same banner, so a screenshot means the same to either.
  it("names the winner by seat, not relative to the viewer", () => {
    for (const seat of ["p0", "p1"] as const) {
      const html = render(seat, { winner: "p0" });

      expect(html).toContain("Red wins");
      expect(html).toContain("164–174");
      expect(html).not.toContain("You win");
    }
  });

  it("calls a tie a draw", () => {
    const html = render("p0", { draw: true });

    expect(html).toContain("Draw");
    expect(html).not.toContain("wins");
  });

  it("carries the reason a match ended early", () => {
    expect(render("p0", { winner: "p1", reason: "opponent forfeited" })).toContain(
      "opponent forfeited",
    );
  });

  it("paints the banner in the winning seat's colour", () => {
    expect(render("p0", { winner: "p0" })).toContain("bg-eo-red-solid");
    expect(render("p0", { winner: "p1" })).toContain("bg-eo-blue-solid");
    expect(render("p0", { draw: true })).toContain("bg-eo-inverse");
  });
});
