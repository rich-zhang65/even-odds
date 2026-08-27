import type { AssetManifest } from "./types";

// A slot with no path resolves to null, which is what makes the procedural
// fallback render. Filling in a path is the whole swap — no component edit.
export const resolveSprite = (manifest: AssetManifest, slot: string): string | null =>
  manifest.sprites[slot] ?? null;
