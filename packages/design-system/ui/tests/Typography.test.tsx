import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Typography } from "../Typography";

describe("Typography", () => {
  it("renders body copy in a div by default", () => {
    expect(renderToStaticMarkup(<Typography>copy</Typography>)).toBe(
      '<div class="font-eo-body text-eo-body-m">copy</div>'
    );
  });

  it("stays a div whatever the variant, since the step of the scale says nothing about the element", () => {
    for (const variant of ["display-xl", "title", "caption", "score"] as const) {
      expect(renderToStaticMarkup(<Typography variant={variant}>x</Typography>)).toContain("<div");
    }
  });

  it("takes the element from the caller when the markup has to carry meaning", () => {
    const html = renderToStaticMarkup(
      <Typography variant="display-l" element="h1">
        Yazy
      </Typography>
    );

    expect(html).toContain("<h1");
    expect(html).toContain("text-eo-display-l");
  });

  it("pairs the display family with the display scale, and the body family with the rest", () => {
    for (const variant of ["display-xl", "display-l", "display-m", "display-s", "title", "label", "button"] as const) {
      expect(renderToStaticMarkup(<Typography variant={variant}>x</Typography>)).toContain("font-eo-display");
    }

    for (const variant of ["body-l", "body-m", "body-s", "caption", "score", "stat"] as const) {
      expect(renderToStaticMarkup(<Typography variant={variant}>x</Typography>)).toContain("font-eo-body");
    }
  });

  it("lines up the numerals on the score and stat variants", () => {
    expect(renderToStaticMarkup(<Typography variant="score">21</Typography>)).toContain("tabular-nums");
    expect(renderToStaticMarkup(<Typography variant="stat">21</Typography>)).toContain("tabular-nums");
  });

  it("appends className last so callers keep the override", () => {
    expect(renderToStaticMarkup(<Typography variant="title" className="text-eo-muted">x</Typography>)).toContain(
      'class="font-eo-display text-eo-title tracking-eo-tight text-eo-muted"'
    );
  });

  it("inherits its colour until a colorVariant asks for one, so it can sit on an inverse surface", () => {
    expect(renderToStaticMarkup(<Typography>x</Typography>)).not.toContain("text-eo-strong");
    expect(renderToStaticMarkup(<Typography colorVariant="strong">x</Typography>)).toContain("text-eo-strong");
    expect(renderToStaticMarkup(<Typography colorVariant="red">x</Typography>)).toContain("text-eo-red-ink");
    expect(renderToStaticMarkup(<Typography colorVariant="on-inverse">x</Typography>)).toContain(
      "text-eo-on-inverse"
    );
  });

  it("overrides the weight the scale carries only when asked", () => {
    expect(renderToStaticMarkup(<Typography variant="body-m">x</Typography>)).not.toContain("font-bold");
    expect(renderToStaticMarkup(<Typography variant="body-m" bold>x</Typography>)).toContain("font-bold");
  });

  it("carries an id through for aria-labelledby", () => {
    expect(renderToStaticMarkup(<Typography variant="title" id="round-heading">x</Typography>)).toContain(
      'id="round-heading"'
    );
  });
});
