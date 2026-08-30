import Link from "next/link";
import { Flex, cx } from "@even-odds/design-system/ui";
import { PAGE_GUTTER } from "./PageContainer";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

export const PageHeader = () => (
  <div className="border-b border-eo-hairline bg-eo-card">
    {/* Same column and gutter as PageContainer, so the wordmark lines up with the
        content beneath it instead of sitting against the viewport edge. */}
    <Flex
      className={cx("mx-auto w-full max-w-(--eo-page-max) py-4", PAGE_GUTTER)}
      align="center"
      justify="space-between"
    >
      <Link href="/" aria-label="Even Odds home">
        <Wordmark />
      </Link>
      <ThemeToggle />
    </Flex>
  </div>
);
