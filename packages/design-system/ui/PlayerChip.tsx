import type { ReactNode } from "react";
import { cx } from "./cx";

export type PlayerSide = "red" | "blue" | "neutral";
export type PlayerStatus = "online" | "waiting" | "offline";

const SIDES: Record<PlayerSide, { avatar: string; soft: string }> = {
  red: { avatar: "border-eo-red-600 bg-eo-red-400", soft: "bg-eo-red-50" },
  blue: { avatar: "border-eo-blue-700 bg-eo-blue-500", soft: "bg-eo-blue-50" },
  neutral: { avatar: "border-eo-ink-700 bg-eo-ink-500", soft: "bg-eo-ink-100" },
};

const STATUS_DOTS: Record<PlayerStatus, string> = {
  online: "bg-eo-live",
  waiting: "bg-eo-waiting",
  offline: "bg-eo-offline",
};

const AVATARS: Record<"sm" | "md" | "lg", string> = {
  sm: "size-7 text-[13px]",
  md: "size-9 text-base",
  lg: "size-12 text-[22px]",
};

const DOTS: Record<"sm" | "md" | "lg", string> = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3.5",
};

export const PlayerChip = ({
  name,
  side = "neutral",
  status,
  size = "md",
  record,
  filled = false,
  className,
}: {
  name: string;
  side?: PlayerSide;
  status?: PlayerStatus;
  size?: "sm" | "md" | "lg";
  record?: ReactNode;
  filled?: boolean;
  className?: string;
}) => (
  <span
    className={cx(
      "inline-flex items-center gap-3 rounded-eo-pill",
      filled && cx("py-2 pr-4 pl-2", SIDES[side].soft),
      className,
    )}
  >
    <span
      className={cx(
        "relative grid shrink-0 place-items-center rounded-full border-2 font-eo-display font-semibold text-eo-on-color",
        SIDES[side].avatar,
        AVATARS[size],
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
      {status !== undefined && (
        <span
          className={cx(
            "absolute -right-px -bottom-px rounded-full border-2 border-eo-paper",
            STATUS_DOTS[status],
            DOTS[size],
          )}
        />
      )}
    </span>
    <span className="grid leading-tight">
      <span
        className={cx(
          "font-eo-display font-semibold text-eo-strong",
          size === "lg" ? "text-eo-body-l" : "text-[15px]",
        )}
      >
        {name}
      </span>
      {record !== undefined && (
        <span className="font-eo-body text-eo-caption text-eo-muted">{record}</span>
      )}
    </span>
  </span>
);
