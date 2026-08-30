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
  <div className={cx("group pb-0.5", className)}>
    <button
      className={cx(
        "relative block aspect-square w-full overflow-hidden rounded-eo-lg text-left transition-[translate] duration-(--eo-duration-fast) ease-eo-out enabled:cursor-pointer enabled:active:translate-y-0.5",
        // The versus field is what a card without art looks like, not a layer under
        // one: artwork dimmed to 45% would let the gradient bleed through it.
        art === undefined ? "bg-(image:--eo-versus)" : "bg-eo-card",
      )}
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
          <img className="size-full object-cover" src={art} alt="" draggable={false} />
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

      {/* The outline rides on top of the art rather than being a border on the
          button. A border makes overflow clip children at the padding-box curve
          while the border paints to the border-box curve: two separately
          antialiased arcs meeting only on the corners, with the background showing
          through the gap between them.

          Its heavier bottom is the edge. Nothing is offset, so the sqrt(2 * radius
          * depth) corner widening that every shadow and every displaced element has
          simply cannot arise -- a border follows the contour and tapers into the
          sides through the arcs. Press thins it, the way a Button drops its
          shadow. */}
      <span
        className={cx(
          "pointer-events-none absolute inset-0 rounded-eo-lg border-2 border-b-4 border-eo-strong transition-colors duration-(--eo-duration-fast) ease-eo-out group-active:border-b-2",
          // A raw ramp step on purpose. The wash sits on artwork, which does not
          // repoint in dark mode, so eo-strong inverted to near-white and vanished
          // against a light PNG. Darkening reads on both themes and on the gradient.
          !disabled && "group-hover:bg-eo-ink-900/15",
        )}
      />
    </button>
  </div>
);
