import type { ReactNode } from "react";
import { cx } from "./cx";

export const Tooltip = ({
  label,
  placement = "top",
  children,
  className,
}: {
  label: string;
  placement?: "top" | "bottom";
  children?: ReactNode;
  className?: string;
}) => (
  <span className={cx("group relative inline-flex", className)}>
    {children}
    <span
      role="tooltip"
      className={cx(
        "pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-eo-xs bg-eo-ink-900 px-2.5 py-1.5 font-eo-body text-eo-caption whitespace-nowrap text-eo-on-color opacity-0 shadow-eo-md transition-opacity duration-(--eo-duration-fast) ease-eo-out group-hover:opacity-100 group-focus-within:opacity-100",
        placement === "bottom" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]",
      )}
    >
      {label}
    </span>
  </span>
);
