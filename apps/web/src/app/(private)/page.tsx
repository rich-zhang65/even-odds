import { historyFor, recentGames } from '@even-odds/db';
import { db, requireUser } from '@/lib/session';
import { wakeGameServer } from '@/lib/wake';
import { Lobby } from './Lobby';

/* As many as fill one row at the page's full width: 5 x 208px cards and their
   gaps are the 1120px PageContainer leaves. */
const RECENT = 5;

const Home = async () => {
  const user = await requireUser();
  wakeGameServer();
  const past = await historyFor(db, user.id);

  return <Lobby recent={recentGames(past, RECENT)} />;
};

export default Home;
