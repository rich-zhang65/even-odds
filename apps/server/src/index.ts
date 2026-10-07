import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createDb, recordMatch } from '@even-odds/db';
import { readTicket, ticketSecret } from '@even-odds/db/ticket';
import { attachSocketServer } from './server';

// Local dev keeps DATABASE_URL in the root .env; a hosted shell sets it directly.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

const PORT = Number(process.env.PORT ?? 4000);
const db = createDb(process.env.DATABASE_URL ?? '');
// Read at startup, so a production server missing it fails at once, not later.
const SECRET = ticketSecret();

const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('even-odds server\n');
});

attachSocketServer(http, {
  identify: async (ticket) => readTicket(SECRET, ticket, Date.now()),
  record: (finished) => {
    recordMatch(db, finished).catch((error: unknown) => {
      // eslint-disable-next-line no-console -- the only place this failure surfaces
      console.error(`could not record match ${finished.id}`, error);
    });
  },
});

http.listen(PORT, () => {
  // eslint-disable-next-line no-console -- do not copy
  console.log(`even-odds server listening on :${PORT}`);
});
