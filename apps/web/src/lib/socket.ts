import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@even-odds/game-sdk';
import { SERVER_URL } from './serverUrl';

/* One connection carries every match, so it cannot be typed to one game's state.
   What comes down it is narrowed once, in useMatch, by the page that knows which
   game it is showing. */
export type MatchSocket = Socket<
  ServerToClientEvents<unknown>,
  ClientToServerEvents
>;

/* A ticket from the web app, fetched afresh for every connection attempt,
   reconnects included, since each expires within a minute. Any failure hands
   over no ticket, and the game server turns the socket away as unauthorized --
   the same answer as being signed out, which is what it usually means. */
const withTicket = (send: (auth: { ticket: string | null }) => void): void => {
  fetch('/api/socket-ticket', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: unknown) =>
      send({
        ticket:
          typeof body === 'object' &&
          body !== null &&
          'ticket' in body &&
          typeof body.ticket === 'string'
            ? body.ticket
            : null,
      }),
    )
    .catch(() => send({ ticket: null }));
};

let instance: MatchSocket | null = null;

export const getSocket = (): MatchSocket => {
  instance ??= io(SERVER_URL, { transports: ['websocket'], auth: withTicket });
  return instance;
};
