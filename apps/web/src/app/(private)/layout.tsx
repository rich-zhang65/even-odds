import { requireUser } from '@/lib/session';

/* Everything except /login sits under this group, so this is where an expired or
   revoked session actually gets turned away. The URL is unchanged by the group. */
const PrivateLayout = async ({ children }: LayoutProps<'/'>) => {
  await requireUser();
  return children;
};

export default PrivateLayout;
