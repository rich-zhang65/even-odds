import { cx } from "@even-odds/design-system/ui";

export const YouTag = ({ className }: { className: string }) => (
  <span
    className={cx(
      "rounded-eo-pill px-2.5 py-0.5 font-eo-body text-[10px] font-semibold tracking-eo-caps uppercase",
      className,
    )}
  >
    You
  </span>
);
