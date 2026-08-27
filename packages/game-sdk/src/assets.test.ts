import { describe, expect, it } from "vitest";
import { resolveSprite } from "./assets";
import type { AssetManifest } from "./types";

const empty: AssetManifest = {
  icon: null,
  sprites: { "die-1": null, "die-2": null },
  sounds: {},
};

describe("resolveSprite", () => {
  it("returns null for a declared but unfilled slot", () => {
    expect(resolveSprite(empty, "die-1")).toBeNull();
  });

  it("returns null for a slot the manifest never declared", () => {
    expect(resolveSprite(empty, "die-9")).toBeNull();
  });

  it("returns the path once a slot is filled, with no other change", () => {
    const filled: AssetManifest = {
      ...empty,
      sprites: { ...empty.sprites, "die-1": "/sprites/die-1.svg" },
    };

    expect(resolveSprite(filled, "die-1")).toBe("/sprites/die-1.svg");
    expect(resolveSprite(filled, "die-2")).toBeNull();
  });
});
