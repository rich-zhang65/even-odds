import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GameCard } from "../GameCard";
import { PlayerChip } from "../PlayerChip";
import { ScoreBoard } from "../ScoreBoard";
import { Tabs } from "../Tabs";
import { VersusBanner } from "../VersusBanner";

describe("GameCard", () => {
  it("falls back to the versus field and a glyph when no artwork is supplied", () => {
    const html = renderToStaticMarkup(<GameCard name="Yazy" />);

    expect(html).toContain("bg-(image:--eo-versus)");
    expect(html).toContain("text-eo-on-color/90");
    expect(html).not.toContain("<img");
  });

  it("uses supplied artwork instead of the placeholder glyph", () => {
    const html = renderToStaticMarkup(<GameCard name="Yazy" art="/y.png" />);

    expect(html).toContain('src="/y.png"');
    expect(html).not.toContain("text-eo-on-color/90");
  });

  it("does not let the artwork be dragged out of the page", () => {
    // CSS covers Chromium and WebKit; Firefox only honours the attribute.
    expect(renderToStaticMarkup(<GameCard name="Yazy" art="/y.png" />)).toContain(
      'draggable="false"',
    );
  });

  it("drops the versus field behind artwork, so dimming cannot bleed it through", () => {
    const html = renderToStaticMarkup(<GameCard name="Yazy" art="/y.png" disabled />);

    expect(html).not.toContain("bg-(image:--eo-versus)");
    expect(html).toContain("bg-eo-card");
    expect(html).toContain("opacity-45");
  });

  it("backs the title with a pill only when it sits on artwork", () => {
    expect(renderToStaticMarkup(<GameCard name="Yazy" art="/y.png" />)).toContain("bg-eo-paper/85");
    expect(renderToStaticMarkup(<GameCard name="Yazy" />)).not.toContain("bg-eo-paper/85");
  });

  it("behaves like a control: washes on hover, sinks on press, never lifts", () => {
    const html = renderToStaticMarkup(<GameCard name="Yazy" />);

    expect(html).not.toContain("-translate-y-");
    expect(html).toContain("group-hover:bg-eo-ink-900/15");
    expect(html).toContain("active:translate-y-0.5");
  });

  it("draws its edge as a heavier bottom border, nothing offset", () => {
    const html = renderToStaticMarkup(<GameCard name="Yazy" />);

    // Offsetting anything -- a shadow or an element -- widens the band by
    // sqrt(2 * radius * depth) at the bottom corners. A border cannot.
    expect(html).toContain("border-b-4");
    expect(html).toContain("group-active:border-b-2");
    expect(html).not.toContain("shadow");
    expect(html).not.toContain("eo-edge-inverse");
  });

  it("stops washing on hover once it cannot be clicked", () => {
    const html = renderToStaticMarkup(<GameCard name="Yazy" disabled />);

    expect(html).not.toContain("group-hover:bg-eo-ink-900/15");
  });

  it("dims and disables a card that cannot be clicked", () => {
    const html = renderToStaticMarkup(<GameCard name="Yazy" disabled />);

    expect(html).toContain("disabled");
    expect(html).toContain("opacity-45");
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
      <ScoreBoard rounds={5} roundResults={["red", "blue", "draw"]} />,
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
      <Tabs tabs={["All", { value: "dice", label: "Dice games" }]} value="dice" />,
    );

    expect(html).toContain("Dice games");
  });
});

describe("VersusBanner", () => {
  it("names both sides and marks the centre", () => {
    const html = renderToStaticMarkup(
      <VersusBanner redName="Ada" blueName="Grace" label="Best of 5" />,
    );

    expect(html).toContain("Ada");
    expect(html).toContain("Grace");
    expect(html).toContain(">VS<");
    expect(html).toContain("Best of 5");
  });
});
