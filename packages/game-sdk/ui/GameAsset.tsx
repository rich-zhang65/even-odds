import type { ReactNode } from "react";
import type { AssetManifest } from "../src/types";
import { resolveSprite } from "../src/assets";

export const GameAsset = ({
  manifest,
  slot,
  fallback,
  alt,
  className,
}: {
  manifest: AssetManifest;
  slot: string;
  fallback: ReactNode;
  alt?: string;
  className?: string;
}) => {
  const src = resolveSprite(manifest, slot);
  if (src === null) return <>{fallback}</>;

  return <img src={src} alt={alt ?? slot} className={className} />;
};
