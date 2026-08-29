import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Dialog } from "../Dialog";
import { Toast } from "../Toast";
import { Tooltip } from "../Tooltip";

describe("Dialog", () => {
  it("renders as a native dialog so Escape and focus trapping come for free", () => {
    const html = renderToStaticMarkup(<Dialog open title="Rematch?" />);

    expect(html).toMatch(/^<dialog/);
    expect(html).toContain("Rematch?");
  });

  it("offers a close affordance only when it can be closed", () => {
    expect(renderToStaticMarkup(<Dialog open title="Rematch?" />)).not.toContain(
      'aria-label="Close"'
    );
    expect(renderToStaticMarkup(<Dialog open title="Rematch?" onClose={() => {}} />)).toContain(
      'aria-label="Close"'
    );
  });
});

describe("Toast", () => {
  it("announces itself and carries a tone-specific colour", () => {
    const html = renderToStaticMarkup(<Toast tone="win" message="You win" />);

    expect(html).toContain('role="status"');
    expect(html).toContain("bg-eo-blue-600");
  });

  it("shows the dismiss control only when a handler is given", () => {
    expect(renderToStaticMarkup(<Toast message="Saved" />)).not.toContain('aria-label="Dismiss"');
    expect(renderToStaticMarkup(<Toast message="Saved" onDismiss={() => {}} />)).toContain(
      'aria-label="Dismiss"'
    );
  });
});

describe("Tooltip", () => {
  it("keeps the label in the markup and reveals it on hover or focus", () => {
    const html = renderToStaticMarkup(<Tooltip label="Copy link">trigger</Tooltip>);

    expect(html).toContain('role="tooltip"');
    expect(html).toContain("Copy link");
    expect(html).toContain("group-hover:opacity-100");
    expect(html).toContain("group-focus-within:opacity-100");
  });

  it("flips the offset for bottom placement", () => {
    expect(renderToStaticMarkup(<Tooltip label="x" placement="bottom" />)).toContain(
      "top-[calc(100%+8px)]"
    );
    expect(renderToStaticMarkup(<Tooltip label="x" />)).toContain("bottom-[calc(100%+8px)]");
  });
});
