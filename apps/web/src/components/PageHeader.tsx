import Link from 'next/link';
import { Button, Flex, cx } from '@even-odds/design-system/ui';
import { logOut } from '@/lib/authActions';
import { PAGE_GUTTER } from './PageContainer';
import { ThemeToggle } from './ThemeToggle';
import { Wordmark } from './Wordmark';

export const PageHeader = () => (
  <div className="border-b border-eo-hairline bg-eo-card">
    {/* Same column and gutter as PageContainer, so the wordmark lines up with the
        content beneath it instead of sitting against the viewport edge. */}
    <Flex
      className={cx('mx-auto w-full max-w-(--eo-page-max) py-4', PAGE_GUTTER)}
      align="center"
      justify="space-between"
    >
      <Link className="select-none" href="/" aria-label="Even Odds home">
        <Wordmark />
      </Link>
      <Flex align="center" gap="8px">
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
