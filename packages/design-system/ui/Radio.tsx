"use client";

import type { ChangeEvent, ReactNode } from "react";
import { cx } from "./cx";

export const Radio = ({
  name,
  value,
  checked = false,
  onChange,
  label,
  disabled = false,
  className,
}: {
  name: string;
  value?: string;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}) => (
  <label
    className={cx(
      "flex items-center gap-3",
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      className,
    )}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      readOnly={onChange === undefined}
      disabled={disabled}
      className="peer sr-only"
    />
    <span
      className={cx(
        "grid size-6 shrink-0 place-items-center rounded-full border-2 bg-eo-card peer-focus-visible:shadow-eo-focus",
        checked ? "border-eo-blue-600" : "border-eo-ink-300",
      )}
    >
      {checked && <span className="size-3 rounded-full bg-eo-blue-500" />}
    </span>
    <span className="font-eo-body text-eo-body-m text-eo-strong">{label}</span>
  </label>
);
