import { existsSync } from 'node:fs';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const DATA_DIR = '.pgdata';

/* Real Postgres binaries run as a child process: no Docker, no installer, no
   admin rights. Everything it needs is read off DATABASE_URL, so the URL in .env
   stays the single description of the dev database and a hosted one is just a
   different URL. Runs until Ctrl+C. */
const main = async (): Promise<void> => {
  const raw = process.env.DATABASE_URL;
  if (raw === undefined) throw new Error('Set DATABASE_URL in .env first.');

  const url = new URL(raw);
  const name = url.pathname.slice(1);

  const server = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    persistent: true,
  });

  // Keyed on initdb's own marker, so a run that died part-way is not mistaken
  // for a finished cluster.
  if (!existsSync(join(DATA_DIR, 'PG_VERSION'))) await server.initialise();
  await server.start();
  await server.createDatabase(name).catch((error: unknown) => {
    // 42P04 is duplicate_database, which every start after the first one hits.
    const code = error instanceof Error && 'code' in error ? error.code : null;
    if (code !== '42P04') throw error;
  });
  console.log(`postgres ready on :${url.port}/${name} (Ctrl+C to stop)`);

  const shutdown = async (): Promise<void> => {
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

await main();
