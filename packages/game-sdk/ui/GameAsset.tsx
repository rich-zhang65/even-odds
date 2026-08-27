import type { ReactNode } from "react";
import type { AssetManifest } from "../src/types";
import { resolveSprite } from "../src/assets";

export const GameAsset = (props: {
  manifest: AssetManifest;
  slot: string;
  fallback: ReactNode;
  alt?: string;
  className?: string;
}) => {
  const src = resolveSprite(props.manifest, props.slot);
  if (src === null) return <>{props.fallback}</>;

  return <img src={src} alt={props.alt ?? props.slot} className={props.className} />;
};
