"use client";

import type { MouseEvent, ReactNode } from "react";
import { cx } from "./cx";

export type CardTone = "plain" | "outlined" | "red" | "blue" | "inverse";

const TONES: Record<CardTone, string> = {
  plain: "border border-eo-hairline bg-eo-card",
  outlined: "border-2 border-eo-ink-900 bg-eo-card",
  red: "border-2 border-eo-red-200 bg-(image:--eo-red-wash)",
  blue: "border-2 border-eo-blue-200 bg-(image:--eo-blue-wash)",
  inverse: "bg-eo-inverse text-eo-on-color",
};

export const Card = ({
  tone = "plain",
  interactive = false,
  children,
  onClick,
  className,
}: {
  tone?: CardTone;
  interactive?: boolean;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  className?: string;
}) => (
  <div
    onClick={onClick}
    className={cx(
      "rounded-eo-lg p-6 shadow-eo-sm",
      TONES[tone],
      interactive &&
        "cursor-pointer transition-[transform,box-shadow] duration-(--eo-duration-base) ease-eo-out hover:-translate-y-px hover:shadow-eo-lg",
      className,
    )}
  >
    {children}
  </div>
);
