import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "red" | "blue" | "live" | "waiting" | "ink";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-eo-ink-100 text-eo-body",
  red: "bg-eo-red-100 text-eo-red-700",
  blue: "bg-eo-blue-100 text-eo-blue-700",
  live: "bg-[#dcf5e8] text-[#0b6b41]",
  waiting: "bg-[#fdefd9] text-[#8a5510]",
  ink: "bg-eo-ink-900 text-eo-on-color",
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
