import { issueTicket, ticketSecret } from '@even-odds/db/ticket';
import { currentUser } from '@/lib/session';

/* A ticket into the game server for whoever is signed in, fetched each time the
   socket connects. The sign-in cookie stays here; the ticket is what crosses to
   the game server, which is on another site once deployed. Never cached: each
   one expires within a minute. */
export const GET = async () => {
  const user = await currentUser();
  if (user === null)
    return Response.json({ error: 'unauthorized' }, { status: 401 });

  return Response.json(
    {
      ticket: issueTicket(
        ticketSecret(),
        { id: user.id, username: user.username },
        Date.now(),
      ),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
};
