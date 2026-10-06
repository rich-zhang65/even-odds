import { PageHeader } from '@/components/PageHeader';
import { ScrollArea } from '@/components/ScrollArea';
import { requireUser } from '@/lib/session';

/* Everything except /login sits under this group, so this is where an expired or
   revoked session actually gets turned away. The URL is unchanged by the group.

   It also draws the header, once, above a scrolling area for the page: the
   header stays put and the scrollbar starts below it. */
const PrivateLayout = async ({ children }: LayoutProps<'/'>) => {
  await requireUser();
  return (
    <div className="flex h-full flex-col">
      <PageHeader />
      <ScrollArea>{children}</ScrollArea>
    </div>
  );
};

export default PrivateLayout;
