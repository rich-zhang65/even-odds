"use client";

import type { MouseEvent, ReactNode } from "react";
import { cx } from "./cx";

export type CardTone = "plain" | "outlined" | "red" | "blue" | "inverse";

const TONES: Record<CardTone, string> = {
  plain: "border border-eo-hairline bg-eo-card",
  outlined: "border-2 border-eo-strong bg-eo-card",
  red: "border-2 border-eo-red-hairline bg-(image:--eo-red-wash)",
  blue: "border-2 border-eo-blue-hairline bg-(image:--eo-blue-wash)",
  inverse: "bg-eo-inverse text-eo-on-inverse",
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
    className={cx(
      "rounded-eo-lg p-6 shadow-eo-sm",
      TONES[tone],
      interactive &&
        "cursor-pointer transition-[transform,box-shadow] duration-(--eo-duration-base) ease-eo-out hover:-translate-y-px hover:shadow-eo-lg",
      className,
    )}
    onClick={onClick}
  >
    {children}
  </div>
);
