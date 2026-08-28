import { cx } from "@even-odds/design-system/ui";

export const Wordmark = ({ className }: { className?: string }) => (
  <span
    className={cx(
      "font-eo-display text-eo-title font-bold tracking-eo-tight lowercase text-eo-strong",
      className,
    )}
  >
    even<span className="text-eo-red-400">.</span>odds
  </span>
);
