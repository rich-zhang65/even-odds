import type { ControlVariant } from "@even-odds/design-system/ui";
import type { PlayerId } from "../src/types";

export type SeatTheme = {
  name: string;
  soft: string;
  solid: string;
  pick: string;
  ink: string;
  accent: string;
  border: string;
  underline: string;
  edge: string;
  button: ControlVariant;
};

/* The one place a seat becomes a colour. Every value is a semantic token, never
   a raw ramp step: the ramps do not repoint in dark mode, so bg-eo-red-50 would
   stay pale on an ink page. */
export const SEATS: Record<PlayerId, SeatTheme> = {
  p0: {
    name: "Red",
    soft: "bg-eo-red-soft",
    solid: "bg-eo-red-solid",
    pick: "bg-eo-red-solid/20 hover:bg-eo-red-solid/35",
    ink: "text-eo-red-ink",
    accent: "text-eo-red-solid",
    border: "border-eo-red-solid",
    underline: "border-b-eo-red-solid",
    edge: "shadow-eo-edge-red",
    button: "red",
  },
  p1: {
    name: "Blue",
    soft: "bg-eo-blue-soft",
    solid: "bg-eo-blue-solid",
    pick: "bg-eo-blue-solid/20 hover:bg-eo-blue-solid/35",
    ink: "text-eo-blue-ink",
    accent: "text-eo-blue-solid",
    border: "border-eo-blue-solid",
    underline: "border-b-eo-blue-solid",
    edge: "shadow-eo-edge-blue",
    button: "primary",
  },
};

export const SEAT_ORDER: PlayerId[] = ["p0", "p1"];
