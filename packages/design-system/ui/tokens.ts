export type ControlSize = "sm" | "md" | "lg";
export type ControlVariant = "primary" | "red" | "ink" | "outline" | "ghost";

export const CONTROL_PRESS = "active:translate-y-0.5 active:shadow-none";
export const CONTROL_MOTION =
  "transition-[transform,box-shadow,background-color] duration-(--eo-duration-fast) ease-eo-out";
export const CONTROL_DISABLED = "disabled:cursor-not-allowed disabled:opacity-45";

export const CONTROL_VARIANTS: Record<ControlVariant, string> = {
  primary: "bg-eo-blue-500 text-eo-on-color shadow-eo-edge-blue hover:bg-eo-blue-400",
  red: "bg-eo-red-400 text-eo-on-color shadow-eo-edge-red hover:bg-eo-red-300",
  ink: "bg-eo-ink-900 text-eo-on-color shadow-eo-edge-ink-soft hover:bg-eo-ink-800",
  outline: "border-2 border-eo-ink-900 bg-eo-card text-eo-strong shadow-eo-edge-ink hover:bg-eo-ink-50",
  ghost: "bg-transparent text-eo-body hover:bg-eo-ink-100",
};

export const CONTROL_HEIGHTS: Record<ControlSize, string> = {
  sm: "h-(--eo-control-sm)",
  md: "h-(--eo-control-md)",
  lg: "h-(--eo-control-lg)",
};
