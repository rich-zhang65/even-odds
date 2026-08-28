import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export const Icon = ({
  icon: Glyph,
  size = 20,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) => <Glyph aria-hidden="true" size={size} className={cx("shrink-0", className)} />;
