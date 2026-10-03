import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createDb, recordMatch, userForToken } from '@even-odds/db';
import { sessionTokenFrom } from '@even-odds/db/cookie';
import { attachSocketServer } from './server';

// Local dev keeps DATABASE_URL in the root .env; a hosted shell sets it directly.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

const PORT = Number(process.env.PORT ?? 4000);
const db = createDb(process.env.DATABASE_URL ?? '');

const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('even-odds server\n');
});

attachSocketServer(http, {
  identify: async (cookieHeader) => {
    const token = sessionTokenFrom(cookieHeader);
    const user = token === null ? null : await userForToken(db, token);
    return user === null ? null : { id: user.id, username: user.username };
  },
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
