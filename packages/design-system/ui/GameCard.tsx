"use client";

import type { MouseEvent } from "react";
import { Dice5, type LucideIcon } from "lucide-react";
import { cx } from "./cx";
import { Icon } from "./Icon";

/* The title pill sits on top of artwork we know nothing about, so it holds a raw
   paper/ink pair rather than a semantic surface: repointing it in dark mode would
   put dark text on dark art. Without artwork the versus field is the background,
   and the name is simply white on it. */
export const GameCard = ({
  name,
  icon = Dice5,
  art,
  disabled = false,
  onClick,
  className,
}: {
  name: string;
  icon?: LucideIcon;
  art?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) => (
  <div className={cx("group relative pb-0.5", className)}>
    {/* The edge is a real element rather than a shadow. A zero-blur shadow can only
        land on whole pixels, so growing one during the lift rendered as visible 1px
        steps trailing the motion -- box-shadow and drop-shadow both did it. This
        never moves: the card slides off it, and a transform is all that animates.
        Hover lives on the group so the card cannot lift out from under the cursor. */}
    <span className="absolute inset-0 rounded-eo-lg bg-eo-strong" />

    <button
      className="relative block h-50 w-full overflow-hidden rounded-eo-lg border-2 border-eo-strong bg-(image:--eo-versus) text-left transition-[translate] duration-(--eo-duration-fast) ease-eo-out enabled:cursor-pointer enabled:group-hover:-translate-y-[3px] enabled:active:translate-y-0.5"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <span className={cx("absolute inset-0", disabled && "opacity-45")}>
        {art === undefined ? (
          <span className="grid size-full place-items-center">
            <Icon className="text-eo-on-color/90" icon={icon} size={48} />
          </span>
        ) : (
          <img className="size-full object-cover" src={art} alt="" />
        )}
        <span
          className={cx(
            "absolute bottom-3 left-3 rounded-eo-pill font-eo-display text-eo-title font-bold tracking-eo-tight",
            art === undefined ? "text-eo-on-color" : "bg-eo-paper/85 px-3 py-0.5 text-eo-ink-900",
          )}
        >
          {name}
        </span>
      </span>
    </button>
  </div>
);
