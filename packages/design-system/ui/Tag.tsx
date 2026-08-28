"use client";

import type { MouseEvent, ReactNode } from "react";
import { cx } from "./cx";

export const Tag = ({
  selected = false,
  count,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  count?: number;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={onClick === undefined}
    className={cx(
      "inline-flex h-8.5 items-center gap-2 rounded-eo-pill border px-4 font-eo-display text-eo-label transition-colors duration-(--eo-duration-fast) ease-eo-out",
      selected
        ? "border-eo-ink-900 bg-eo-ink-900 text-eo-on-color"
        : "border-eo-hairline bg-eo-card text-eo-body",
      onClick === undefined ? "cursor-default" : "cursor-pointer",
      onClick !== undefined && !selected && "hover:bg-eo-ink-100",
      className,
    )}
  >
    {children}
    {count !== undefined && <span className="text-eo-caption opacity-60">{count}</span>}
  </button>
);
