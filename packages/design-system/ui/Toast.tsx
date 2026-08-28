"use client";

import type { ReactNode } from "react";
import { Info, TriangleAlert, Trophy, X, type LucideIcon } from "lucide-react";
import { cx } from "./cx";
import { Icon } from "./Icon";

export type ToastTone = "neutral" | "win" | "alert";

const TONES: Record<ToastTone, { className: string; icon: LucideIcon }> = {
  neutral: { className: "bg-eo-ink-900", icon: Info },
  win: { className: "bg-eo-blue-600", icon: Trophy },
  alert: { className: "bg-eo-red-500", icon: TriangleAlert },
};

export const Toast = ({
  tone = "neutral",
  message,
  action,
  onDismiss,
  className,
}: {
  tone?: ToastTone;
  message?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) => (
  <div
    role="status"
    className={cx(
      "inline-flex animate-eo-rise items-center gap-3 rounded-eo-pill px-4 py-3 font-eo-body text-eo-body-s font-semibold text-eo-on-color shadow-eo-lg",
      TONES[tone].className,
      className,
    )}
  >
    <Icon icon={TONES[tone].icon} size={18} />
    <span>{message}</span>
    {action}
    {onDismiss !== undefined && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-1 grid cursor-pointer place-items-center text-current opacity-70 hover:opacity-100"
      >
        <Icon icon={X} size={16} />
      </button>
    )}
  </div>
);
