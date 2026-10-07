import { after } from 'next/server';
import { SERVER_URL } from './serverUrl';

/* The game server is on a free plan that sleeps after fifteen quiet minutes and
   takes about a minute to wake. Pinging it as the home page goes out starts
   that minute while the player is still choosing a game, rather than after
   they have chosen. After the response, so the page is not held up; and any
   failure is ignored, since the point is only to knock. */
export const wakeGameServer = (): void => {
  after(async () => {
    await fetch(SERVER_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    }).catch(() => undefined);
  });
};
