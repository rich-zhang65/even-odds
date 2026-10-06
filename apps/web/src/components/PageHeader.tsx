import Link from 'next/link';
import { Button, Flex, cx } from '@even-odds/design-system/ui';
import { logOut } from '@/lib/authActions';
import { NavTabs } from './NavTabs';
import { PAGE_GUTTER } from './PageContainer';
import { ThemeToggle } from './ThemeToggle';
import { Wordmark } from './Wordmark';

export const PageHeader = () => (
  /* Drawn once by the signed-in layout, above the scrolling page, so it stays
     in reach however far a page scrolls. */
  <div className="shrink-0 border-b border-eo-hairline bg-eo-card">
    {/* Same column and gutter as PageContainer, so the wordmark lines up with the
        content beneath it instead of sitting against the viewport edge. */}
    <Flex
      className={cx(
        'mx-auto h-18 w-full max-w-(--eo-page-max) gap-6 max-sm:gap-3',
        PAGE_GUTTER,
      )}
      align="center"
    >
      <Link
        className="shrink-0 select-none"
        href="/"
        aria-label="Even Odds home"
      >
        <Wordmark />
      </Link>
      <NavTabs />
      <Flex className="ml-auto shrink-0 gap-4 max-sm:gap-1" align="center">
        <ThemeToggle />
        <form action={logOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </Flex>
    </Flex>
  </div>
);
