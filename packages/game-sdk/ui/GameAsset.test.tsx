import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GameAsset } from "./GameAsset";
import type { AssetManifest } from "../src/types";

const manifest = (path: string | null): AssetManifest => ({
  icon: null,
  sprites: { "die-3": path },
  sounds: {},
});

const fallback = <span data-procedural="die-3" />;

describe("GameAsset", () => {
  it("renders the procedural fallback while the slot is empty", () => {
    const html = renderToStaticMarkup(
      <GameAsset manifest={manifest(null)} slot="die-3" fallback={fallback} />
    );

    expect(html).toBe('<span data-procedural="die-3"></span>');
  });

  it("swaps to the sprite when the manifest names a path, with no component edit", () => {
    const html = renderToStaticMarkup(
      <GameAsset manifest={manifest("/sprites/die-3.svg")} slot="die-3" fallback={fallback} />
    );

    expect(html).toContain('src="/sprites/die-3.svg"');
    expect(html).not.toContain("data-procedural");
  });

  it("falls back for a slot the manifest never declared", () => {
    const html = renderToStaticMarkup(
      <GameAsset manifest={manifest("/sprites/die-3.svg")} slot="die-6" fallback={fallback} />
    );

    expect(html).toBe('<span data-procedural="die-3"></span>');
  });

  it("labels the sprite for screen readers", () => {
    const html = renderToStaticMarkup(
      <GameAsset
        manifest={manifest("/sprites/die-3.svg")}
        slot="die-3"
        alt="Die showing 3"
        fallback={fallback}
      />
    );

    expect(html).toContain('alt="Die showing 3"');
  });
});
