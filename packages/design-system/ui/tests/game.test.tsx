import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GameCard } from "../GameCard";
import { PlayerChip } from "../PlayerChip";
import { ScoreBoard } from "../ScoreBoard";
import { Tabs } from "../Tabs";
import { VersusBanner } from "../VersusBanner";

describe("GameCard", () => {
  it("falls back to the versus field when no artwork is supplied", () => {
    const html = renderToStaticMarkup(<GameCard name="Yahtzee" />);

    expect(html).toContain("bg-(image:--eo-versus)");
    expect(html).toContain("text-eo-on-color/90");
  });

  it("uses supplied artwork instead of the placeholder glyph", () => {
    const html = renderToStaticMarkup(<GameCard name="Yahtzee" art={<img src="/y.png" alt="" />} />);

    expect(html).toContain('src="/y.png"');
    expect(html).not.toContain("text-eo-on-color/90");
  });

  it("lets a game supply its own placeholder glyph", () => {
    const html = renderToStaticMarkup(<GameCard name="Yahtzee" icon={<span data-glyph="die" />} />);

    expect(html).toContain('data-glyph="die"');
    expect(html).not.toContain("text-eo-on-color/90");
  });

  it("flags a live game", () => {
    expect(renderToStaticMarkup(<GameCard name="Yahtzee" />)).not.toContain("Live");
    expect(renderToStaticMarkup(<GameCard name="Yahtzee" live />)).toContain("Live");
  });
});

describe("PlayerChip", () => {
  it("derives the avatar initial from the name", () => {
    expect(renderToStaticMarkup(<PlayerChip name="  ada" />)).toContain(">A<");
  });

  it("shows a status dot only when a status is given", () => {
    expect(renderToStaticMarkup(<PlayerChip name="Ada" />)).not.toContain("bg-eo-live");
    expect(renderToStaticMarkup(<PlayerChip name="Ada" status="online" />)).toContain("bg-eo-live");
  });
});

describe("ScoreBoard", () => {
  it("renders one pip per round, unplayed rounds included", () => {
    const html = renderToStaticMarkup(
      <ScoreBoard rounds={5} roundResults={["red", "blue", "draw"]} />
    );

    expect(html.match(/rounded-full/g)).toHaveLength(5);
    expect(html).toContain("bg-eo-hairline");
  });

  it("omits the pip row entirely when the match is not by rounds", () => {
    expect(renderToStaticMarkup(<ScoreBoard />)).not.toContain("rounded-full");
  });
});

describe("Tabs", () => {
  it("selects the first tab when no value is controlled", () => {
    const html = renderToStaticMarkup(<Tabs tabs={["All", "Dice"]} />);

    expect(html).toContain('aria-selected="true"');
    expect(html.indexOf('aria-selected="true"')).toBeLessThan(html.indexOf("Dice"));
  });

  it("accepts bare strings and value/label pairs alike", () => {
    const html = renderToStaticMarkup(
      <Tabs tabs={["All", { value: "dice", label: "Dice games" }]} value="dice" />
    );

    expect(html).toContain("Dice games");
  });
});

describe("VersusBanner", () => {
  it("names both sides and marks the centre", () => {
    const html = renderToStaticMarkup(<VersusBanner redName="Ada" blueName="Grace" label="Best of 5" />);

    expect(html).toContain("Ada");
    expect(html).toContain("Grace");
    expect(html).toContain(">VS<");
    expect(html).toContain("Best of 5");
  });
});
