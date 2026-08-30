import Link from "next/link";
import { Flex } from "@even-odds/design-system/ui";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

export const PageHeader = () => (
  <Flex
    className="border-b border-eo-hairline bg-eo-card px-8 py-4 max-md:px-4"
    align="center"
    justify="space-between"
  >
    <Link href="/" aria-label="Even Odds home">
      <Wordmark />
    </Link>
    <ThemeToggle />
  </Flex>
);
