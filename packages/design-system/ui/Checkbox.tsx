"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "./cx";

export const Checkbox = ({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: {
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}) => (
  <label
    className={cx(
      "flex gap-3",
      description === undefined ? "items-center" : "items-start",
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      className,
    )}
  >
    <input
      className="peer sr-only"
      type="checkbox"
      checked={checked}
      onChange={onChange}
      readOnly={onChange === undefined}
      disabled={disabled}
    />
    <span
      className={cx(
        "grid size-6 shrink-0 place-items-center rounded-eo-xs border-2 transition-colors duration-(--eo-duration-fast) ease-eo-out peer-focus-visible:shadow-eo-focus",
        checked ? "border-eo-blue-line bg-eo-blue-solid" : "border-eo-control-line bg-eo-card",
      )}
    >
      {checked && <Check className="text-eo-on-color" aria-hidden="true" size={16} />}
    </span>
    <span>
      <span className="block font-eo-body text-eo-body-m text-eo-strong">{label}</span>
      {description !== undefined && (
        <span className="block font-eo-body text-eo-body-s text-eo-muted">{description}</span>
      )}
    </span>
  </label>
);
