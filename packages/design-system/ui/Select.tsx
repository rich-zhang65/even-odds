"use client";

import type { ChangeEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "./cx";

export type SelectOption = { value: string; label: string };

export const Select = ({
  label,
  options = [],
  value,
  onChange,
  disabled = false,
  className,
}: {
  label?: string;
  options?: (string | SelectOption)[];
  value?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
}) => (
  <label className={cx("block", className)}>
    {label !== undefined && (
      <span className="mb-2 block font-eo-display text-eo-label text-eo-strong">{label}</span>
    )}
    <span
      className={cx(
        "relative flex h-(--eo-control-md) items-center rounded-eo-md border-2 border-eo-control-line focus-within:border-eo-focus focus-within:shadow-eo-focus",
        disabled ? "bg-eo-sunken" : "bg-eo-card",
      )}
    >
      <select
        className="h-full flex-1 cursor-pointer appearance-none border-none bg-transparent pr-10 pl-4 font-eo-body text-eo-body-m text-eo-strong outline-none disabled:cursor-not-allowed"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {options.map((option) => {
          const { value: optionValue, label: optionLabel } =
            typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 text-eo-muted"
        aria-hidden="true"
        size={18}
      />
    </span>
  </label>
);
