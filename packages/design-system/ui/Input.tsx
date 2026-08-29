"use client";

import type { ChangeEvent, ReactNode } from "react";
import { cx } from "./cx";
import { CONTROL_HEIGHTS, type ControlSize } from "./tokens";

export const Input = ({
  label,
  hint,
  error,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  size = "md",
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "search" | "url";
  disabled?: boolean;
  size?: ControlSize;
  className?: string;
}) => (
  <label className={cx("block", className)}>
    {label !== undefined && (
      <span className="mb-2 block font-eo-display text-eo-label text-eo-strong">{label}</span>
    )}
    <span
      className={cx(
        "flex items-center gap-3 rounded-eo-md border-2 px-4 transition-[border-color,box-shadow] duration-(--eo-duration-fast) ease-eo-out",
        CONTROL_HEIGHTS[size],
        disabled ? "bg-eo-sunken" : "bg-eo-card",
        error === undefined
          ? "border-eo-control-line focus-within:border-eo-focus focus-within:shadow-eo-focus"
          : "border-eo-red-line",
      )}
    >
      {icon !== undefined && <span className="text-eo-faint [&_svg]:size-4.5">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={onChange === undefined}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error !== undefined}
        className="min-w-0 flex-1 border-none bg-transparent font-eo-body text-eo-body-m text-eo-strong outline-none"
      />
    </span>
    {(error ?? hint) !== undefined && (
      <span
        className={cx(
          "mt-2 block font-eo-body text-eo-body-s",
          error === undefined ? "text-eo-muted" : "text-eo-red-ink",
        )}
      >
        {error ?? hint}
      </span>
    )}
  </label>
);
