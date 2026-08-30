import type { ElementType, ReactNode } from "react";
import { cx } from "./cx";

export type TypographyVariant =
  | "display-xl"
  | "display-l"
  | "display-m"
  | "display-s"
  | "title"
  | "label"
  | "button"
  | "body-l"
  | "body-m"
  | "body-s"
  | "caption"
  | "score"
  | "stat";

export type TypographyColorVariant =
  | "strong"
  | "body"
  | "muted"
  | "faint"
  | "red"
  | "blue"
  | "live"
  | "waiting"
  | "link"
  | "on-color"
  | "on-inverse";

const VARIANTS: Record<TypographyVariant, string> = {
  "display-xl": "font-eo-display text-eo-display-xl tracking-eo-tight",
  "display-l": "font-eo-display text-eo-display-l tracking-eo-tight",
  "display-m": "font-eo-display text-eo-display-m tracking-eo-tight",
  "display-s": "font-eo-display text-eo-display-s tracking-eo-tight",
  title: "font-eo-display text-eo-title tracking-eo-tight",
  label: "font-eo-display text-eo-label",
  button: "font-eo-display text-eo-button",
  "body-l": "font-eo-body text-eo-body-l",
  "body-m": "font-eo-body text-eo-body-m",
  "body-s": "font-eo-body text-eo-body-s",
  caption: "font-eo-body text-eo-caption",
  score: "font-eo-body text-eo-score tabular-nums",
  stat: "font-eo-body text-eo-stat tabular-nums",
};

const COLOR_VARIANTS: Record<TypographyColorVariant, string> = {
  strong: "text-eo-strong",
  body: "text-eo-body",
  muted: "text-eo-muted",
  faint: "text-eo-faint",
  red: "text-eo-red-ink",
  blue: "text-eo-blue-ink",
  live: "text-eo-live-ink",
  waiting: "text-eo-waiting-ink",
  link: "text-eo-link",
  "on-color": "text-eo-on-color",
  "on-inverse": "text-eo-on-inverse",
};

export const Typography = ({
  variant = "body-m",
  colorVariant,
  bold = false,
  element = "div",
  children,
  className,
  id,
}: {
  variant?: TypographyVariant;
  colorVariant?: TypographyColorVariant;
  bold?: boolean;
  element?: ElementType;
  children?: ReactNode;
  className?: string;
  id?: string;
}) => {
  const Element = element;

  return (
    <Element
      className={cx(
        VARIANTS[variant],
        colorVariant !== undefined && COLOR_VARIANTS[colorVariant],
        bold && "font-bold",
        className,
      )}
      id={id}
    >
      {children}
    </Element>
  );
};
