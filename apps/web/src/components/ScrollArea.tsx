'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/* The part of the page under the header that scrolls, so the scrollbar runs
   beside the content rather than up through the header. It outlives a
   navigation -- the layout holding it stays mounted -- so it is keyed on the
   path, and each page starts at its top rather than wherever the last one was
   left. */
export const ScrollArea = ({ children }: { children: ReactNode }) => (
  <div className="min-h-0 flex-1 overflow-y-auto" key={usePathname()}>
    {children}
  </div>
);
