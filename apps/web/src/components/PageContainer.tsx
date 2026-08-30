import type { ReactNode } from "react";
import { cx } from "@even-odds/design-system/ui";

/* One gutter for every page, shared with PageHeader so the two line up. It grows
   with the viewport but never drops below 20px, which is the part that matters:
   the containers this replaced fell to 12px and 16px on phones, exactly where
   there was least room to spare. Horizontal runs wider than vertical -- a page is
   read down its length, so the side margins are what frame it. */
export const PAGE_GUTTER = "px-[clamp(20px,4vw,40px)]";

export const PageContainer = ({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) => (
  <div className={cx("mx-auto w-full max-w-(--eo-page-max) flex-1 py-7", PAGE_GUTTER, className)}>
    {children}
  </div>
);
