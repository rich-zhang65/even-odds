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

const WIDTHS: Record<ControlSize, string> = {
  sm: "w-(--eo-control-sm)",
  md: "w-(--eo-control-md)",
  lg: "w-(--eo-control-lg)",
};

// Sized here rather than on the glyph so the icon can be a plain node and
// still cross a server/client boundary.
const GLYPHS: Record<ControlSize, string> = {
  sm: "[&_svg]:size-4.5",
  md: "[&_svg]:size-5.5",
  lg: "[&_svg]:size-5.5",
};

export const IconButton = ({
  icon,
  label,
  size = "md",
  variant = "outline",
  disabled = false,
  onClick,
  className,
}: {
  icon: ReactNode;
  label: string;
  size?: ControlSize;
  variant?: ControlVariant;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) => (
  <button
    className={cx(
      "inline-flex cursor-pointer items-center justify-center rounded-eo-md",
      CONTROL_VARIANTS[variant],
      CONTROL_HEIGHTS[size],
      WIDTHS[size],
      GLYPHS[size],
      CONTROL_PRESS,
      CONTROL_MOTION,
      CONTROL_DISABLED,
      className,
    )}
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >
    {icon}
  </button>
);
