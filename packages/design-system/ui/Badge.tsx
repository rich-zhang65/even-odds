import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "red" | "blue" | "live" | "waiting" | "ink";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-eo-sunken text-eo-body",
  red: "bg-eo-red-soft text-eo-red-ink",
  blue: "bg-eo-blue-soft text-eo-blue-ink",
  live: "bg-eo-live-soft text-eo-live-ink",
  waiting: "bg-eo-waiting-soft text-eo-waiting-ink",
  ink: "bg-eo-inverse text-eo-on-inverse",
};

export const Badge = ({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children?: ReactNode;
  className?: string;
}) => (
  <span
    className={cx(
      "inline-flex items-center gap-2 rounded-eo-pill px-2.5 py-1.5 font-eo-body text-eo-caption tracking-eo-caps uppercase",
      TONES[tone],
      className,
    )}
  >
    {dot && <span className="size-1.5 rounded-full bg-current" />}
    {children}
  </span>
);
