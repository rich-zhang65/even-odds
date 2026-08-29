"use client";

import type { MouseEvent, ReactNode } from "react";
import { cx } from "./cx";
import {
  CONTROL_DISABLED,
  CONTROL_HEIGHTS,
  CONTROL_MOTION,
  CONTROL_PRESS,
  CONTROL_VARIANTS,
  type ControlSize,
  type ControlVariant,
} from "./tokens";

const PADDING: Record<ControlSize, string> = {
  sm: "gap-2 px-4 text-eo-label",
  md: "gap-2 px-5 text-eo-button",
  lg: "gap-3 px-8 text-eo-title",
};

export const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  children,
  onClick,
  type = "button",
  className,
}: {
  variant?: ControlVariant;
  size?: ControlSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}) => (
  <button
    className={cx(
      "inline-flex items-center justify-center whitespace-nowrap rounded-eo-md font-eo-display enabled:cursor-pointer",
      CONTROL_VARIANTS[variant],
      CONTROL_HEIGHTS[size],
      PADDING[size],
      CONTROL_PRESS,
      CONTROL_MOTION,
      CONTROL_DISABLED,
      fullWidth ? "w-full" : "w-auto",
      className,
    )}
    type={type}
    disabled={disabled || loading}
    onClick={onClick}
  >
    {loading ? (
      <span className="size-3.5 animate-eo-spin rounded-full border-2 border-current border-t-transparent" />
    ) : (
      iconLeft
    )}
    {children}
    {iconRight}
  </button>
);
