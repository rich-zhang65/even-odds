'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@even-odds/design-system/ui';

/* Play covers the lobby and every match, since a match is where Play leads. */
const TABS = [
  {
    href: '/',
    label: 'Play',
    current: (path: string) => path === '/' || path.startsWith('/play/'),
  },
  {
    href: '/history',
    label: 'History',
    current: (path: string) => path.startsWith('/history'),
  },
];

/* The site's sections, beside the wordmark. Each tab fills the header's full
   height, so the active one's underline sits on the header's bottom edge --
   overlapping its hairline by a pixel -- rather than floating above it. */
export const NavTabs = () => {
  const path = usePathname();

  return (
    <nav className="flex gap-2 self-stretch max-sm:gap-0" aria-label="Sections">
      {TABS.map((tab) => {
        const current = tab.current(path);
        return (
          <Link
            className={cx(
              '-mb-px flex items-center border-b-[3px] px-3 pt-[3px] max-sm:px-2 font-eo-display text-eo-label transition-colors duration-(--eo-duration-fast)',
              current
                ? 'border-eo-red-solid text-eo-strong'
                : 'border-transparent text-eo-muted hover:text-eo-strong',
            )}
            key={tab.href}
            href={tab.href}
            aria-current={current ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
