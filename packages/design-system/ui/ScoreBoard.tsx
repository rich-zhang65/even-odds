import type { ReactNode } from "react";
import { cx } from "./cx";

export type RoundResult = "red" | "blue" | "draw";

const PIPS: Record<RoundResult, string> = {
  red: "bg-eo-red-400",
  blue: "bg-eo-blue-500",
  draw: "bg-eo-ink-400",
};

const Side = ({
  label,
  score,
  big,
  className,
}: {
  label: string;
  score: number;
  big: boolean;
  className: string;
}) => (
  <span className={cx("grid justify-items-center gap-0.5", big ? "min-w-30" : "min-w-22")}>
    <span className="font-eo-body text-eo-caption tracking-eo-caps text-eo-muted uppercase">
      {label}
    </span>
    <span
      className={cx("font-eo-body tabular-nums", big ? "text-[56px] font-extrabold" : "text-eo-score", className)}
    >
      {score}
    </span>
  </span>
);

export const ScoreBoard = ({
  redName = "Red",
  blueName = "Blue",
  redScore = 0,
  blueScore = 0,
  rounds = 0,
  roundResults = [],
  timer,
  size = "md",
  className,
}: {
  redName?: string;
  blueName?: string;
  redScore?: number;
  blueScore?: number;
  rounds?: number;
  roundResults?: RoundResult[];
  timer?: ReactNode;
  size?: "md" | "lg";
  className?: string;
}) => (
  <div
    className={cx(
      "inline-grid justify-items-center gap-3 rounded-eo-lg border-2 border-eo-ink-900 bg-eo-card shadow-eo-edge-ink",
      size === "lg" ? "px-8 py-5" : "px-6 py-4",
      className,
    )}
  >
    <div className="flex items-center gap-5">
      <Side label={redName} score={redScore} big={size === "lg"} className="text-eo-red-600" />
      <span className="font-eo-display text-eo-label tracking-eo-caps text-eo-faint uppercase">vs</span>
      <Side label={blueName} score={blueScore} big={size === "lg"} className="text-eo-blue-600" />
    </div>
    {timer !== undefined && (
      <span className="font-eo-body text-eo-stat tabular-nums text-eo-strong">{timer}</span>
    )}
    {rounds > 0 && (
      <div className="flex gap-1.5">
        {Array.from({ length: rounds }, (_, round) => (
          <span
            key={round}
            className={cx("size-2.5 rounded-full", PIPS[roundResults[round]] ?? "bg-eo-ink-200")}
          />
        ))}
      </div>
    )}
  </div>
);
