export type ControlSize = "sm" | "md" | "lg";
export type ControlVariant = "primary" | "red" | "ink" | "outline" | "ghost";

export const CONTROL_PRESS = "enabled:active:translate-y-0.5 enabled:active:shadow-none";
export const CONTROL_MOTION =
  "transition-[transform,box-shadow,background-color] duration-(--eo-duration-fast) ease-eo-out";
export const CONTROL_DISABLED = "disabled:cursor-not-allowed disabled:opacity-45";

export const CONTROL_VARIANTS: Record<ControlVariant, string> = {
  primary: "bg-eo-blue-solid text-eo-on-color shadow-eo-edge-blue enabled:hover:bg-eo-blue-solid-hover",
  red: "bg-eo-red-solid text-eo-on-color shadow-eo-edge-red enabled:hover:bg-eo-red-solid-hover",
  ink: "bg-eo-inverse text-eo-on-inverse shadow-eo-edge-ink-soft enabled:hover:bg-eo-inverse-hover",
  outline: "border-2 border-eo-strong bg-eo-card text-eo-strong shadow-eo-edge-ink enabled:hover:bg-eo-sunken",
  ghost: "bg-transparent text-eo-body enabled:hover:bg-eo-sunken",
};

export const CONTROL_HEIGHTS: Record<ControlSize, string> = {
  sm: "h-(--eo-control-sm)",
  md: "h-(--eo-control-md)",
  lg: "h-(--eo-control-lg)",
};
