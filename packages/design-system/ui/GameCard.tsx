"use client";

import type { MouseEvent, ReactNode } from "react";
import { Gamepad2, Users } from "lucide-react";
import { Badge } from "./Badge";
import { cx } from "./cx";
import { Icon } from "./Icon";

export type GameCardSize = "sm" | "md" | "lg";

const ART_HEIGHTS: Record<GameCardSize, string> = {
  sm: "h-24",
  md: "h-37",
  lg: "h-50",
};

export const GameCard = ({
  name,
  icon,
  players = "1v1",
  live = false,
  art,
  size = "md",
  onClick,
  className,
}: {
  name: string;
  icon?: ReactNode;
  players?: string;
  live?: boolean;
  art?: ReactNode;
  size?: GameCardSize;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      "block w-full cursor-pointer overflow-hidden rounded-eo-lg border-2 border-eo-ink-900 bg-eo-card text-left shadow-eo-edge-ink transition-[transform,box-shadow] duration-(--eo-duration-fast) ease-eo-out hover:-translate-y-[3px] hover:shadow-[0_6px_0_var(--color-eo-ink-900)]",
      className,
    )}
  >
    <span
      className={cx(
        "relative grid place-items-center bg-(image:--eo-versus)",
        ART_HEIGHTS[size],
      )}
    >
      {art ??
        icon ?? (
          <Icon icon={Gamepad2} size={size === "sm" ? 32 : 48} className="text-eo-on-color/90" />
        )}
      {live && (
        <span className="absolute top-3 left-3">
          <Badge tone="live" dot>
            Live
          </Badge>
        </span>
      )}
    </span>
    <span className="flex items-center justify-between gap-3 p-4">
      <span
        className={cx(
          "font-eo-display text-eo-strong",
          size === "sm" ? "text-eo-button" : "text-eo-title",
        )}
      >
        {name}
      </span>
      <span className="inline-flex items-center gap-1 font-eo-body text-eo-caption text-eo-muted">
        <Icon icon={Users} size={14} />
        {players}
      </span>
    </span>
  </button>
);
