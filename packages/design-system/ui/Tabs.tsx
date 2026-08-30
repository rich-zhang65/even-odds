"use client";

import { cx } from "./cx";

export type TabOption = { value: string; label: string };

export const Tabs = ({
  tabs = [],
  value,
  onChange,
  size = "md",
  className,
}: {
  tabs?: (string | TabOption)[];
  value?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
}) => {
  const items = tabs.map((tab) => (typeof tab === "string" ? { value: tab, label: tab } : tab));
  const active = value ?? items[0]?.value;

  return (
    <div
      className={cx("inline-flex gap-1 rounded-eo-pill bg-eo-sunken p-1", className)}
      role="tablist"
    >
      {items.map((tab) => (
        <button
          key={tab.value}
          className={cx(
            "cursor-pointer rounded-eo-pill px-5 font-eo-display transition-colors duration-(--eo-duration-fast) ease-eo-out",
            size === "sm" ? "h-8.5 text-[13px]" : "h-10 text-[15px]",
            tab.value === active
              ? "bg-eo-card text-eo-strong shadow-eo-sm"
              : "bg-transparent text-eo-muted",
          )}
          type="button"
          role="tab"
          aria-selected={tab.value === active}
          onClick={() => onChange?.(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
