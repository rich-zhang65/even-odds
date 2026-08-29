import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Swords } from "lucide-react";
import { Icon } from "./Icon";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { IconButton } from "./IconButton";
import { Tag } from "./Tag";

describe("Button", () => {
  it("defaults to a non-submitting primary button", () => {
    const html = renderToStaticMarkup(<Button>Play</Button>);

    expect(html).toContain('type="button"');
    expect(html).toContain("bg-eo-blue-solid");
    expect(html).not.toContain('disabled=""');
  });

  it("blocks interaction while loading and swaps the left icon for a spinner", () => {
    const html = renderToStaticMarkup(
      <Button loading iconLeft={<span data-icon="left" />}>
        Play
      </Button>
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain("animate-eo-spin");
    expect(html).not.toContain('data-icon="left"');
  });

  it("keeps the pressable edge and press offset on every filled variant", () => {
    for (const variant of ["primary", "red", "ink"] as const) {
      const html = renderToStaticMarkup(<Button variant={variant}>Go</Button>);

      expect(html).toContain("shadow-eo-edge-");
      expect(html).toContain("active:translate-y-0.5");
    }
  });
});

describe("Card", () => {
  it("lifts only when interactive", () => {
    expect(renderToStaticMarkup(<Card>flat</Card>)).not.toContain("hover:-translate-y-px");
    expect(renderToStaticMarkup(<Card interactive>lifts</Card>)).toContain("hover:-translate-y-px");
  });
});

describe("Badge", () => {
  it("renders the status dot only when asked", () => {
    expect(renderToStaticMarkup(<Badge tone="live">live</Badge>)).not.toContain("bg-current");
    expect(renderToStaticMarkup(<Badge tone="live" dot>live</Badge>)).toContain("bg-current");
  });
});

describe("Tag", () => {
  it("is disabled until it is given a handler", () => {
    expect(renderToStaticMarkup(<Tag>All</Tag>)).toContain('disabled=""');
    expect(renderToStaticMarkup(<Tag onClick={() => {}}>All</Tag>)).not.toContain('disabled=""');
  });

  it("shows a zero count rather than hiding it", () => {
    expect(renderToStaticMarkup(<Tag count={0}>Puzzle</Tag>)).toContain(">0<");
  });
});

describe("IconButton", () => {
  it("carries its accessible name and hides the glyph from assistive tech", () => {
    const html = renderToStaticMarkup(<IconButton icon={<Icon icon={Swords} />} label="Start match" />);

    expect(html).toContain('aria-label="Start match"');
    expect(html).toContain('aria-hidden="true"');
  });
});
