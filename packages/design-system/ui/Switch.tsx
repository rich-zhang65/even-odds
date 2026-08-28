"use client";

import type { ChangeEvent, ReactNode } from "react";
import { cx } from "./cx";

export const Switch = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  className,
}: {
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}) => (
  <label
    className={cx(
      "inline-flex items-center gap-3",
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      className,
    )}
  >
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={onChange}
      readOnly={onChange === undefined}
      disabled={disabled}
      className="peer sr-only"
    />
    <span
      className={cx(
        "h-7 w-12 shrink-0 rounded-eo-pill p-[3px] transition-colors duration-(--eo-duration-base) ease-eo-out peer-focus-visible:shadow-eo-focus",
        checked ? "bg-eo-blue-500" : "bg-eo-ink-300",
      )}
    >
      <span
        className={cx(
          "block size-5.5 rounded-full bg-eo-paper shadow-eo-sm transition-transform duration-(--eo-duration-base) ease-eo-bounce",
          checked && "translate-x-5",
        )}
      />
    </span>
    {label !== undefined && (
      <span className="font-eo-body text-eo-body-m text-eo-strong">{label}</span>
    )}
  </label>
);
