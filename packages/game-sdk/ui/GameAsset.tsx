import type { ReactNode } from 'react';
import { resolveSprite } from '../src/assets';
import type { AssetManifest } from '../src/types';

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

  return (
    <img className={className} src={src} alt={alt ?? slot} draggable={false} />
  );
};
