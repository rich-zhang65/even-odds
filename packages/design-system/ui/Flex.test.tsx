import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Flex } from "./Flex";

describe("Flex", () => {
  it("is a bare flex row until told otherwise", () => {
    expect(renderToStaticMarkup(<Flex>x</Flex>)).toContain('class="flex grow-0 shrink"');
  });

  it("maps every prop to a utility", () => {
    const html = renderToStaticMarkup(
      <Flex direction="column" align="center" justify="space-between" wrap="wrap" grow={1} shrink={0} alignSelf="end">
        x
      </Flex>
    );

    for (const utility of [
      "flex-col",
      "items-center",
      "justify-between",
      "flex-wrap",
      "grow",
      "shrink-0",
      "self-end",
    ]) {
      expect(html).toContain(utility);
    }
  });

  it("treats the flex- prefixed spellings as aliases", () => {
    expect(renderToStaticMarkup(<Flex align="flex-start" justify="flex-end">x</Flex>)).toBe(
      renderToStaticMarkup(<Flex align="start" justify="end">x</Flex>)
    );
  });

  it("takes gap and basis as CSS lengths", () => {
    const html = renderToStaticMarkup(<Flex gap="30px" basis="18ch">x</Flex>);

    expect(html).toContain('style="gap:30px;flex-basis:18ch"');
  });

  it("appends className last so callers can add responsive overrides", () => {
    const html = renderToStaticMarkup(<Flex direction="row" className="max-md:flex-col" />);

    expect(html.indexOf("flex-row")).toBeLessThan(html.indexOf("max-md:flex-col"));
  });
});
