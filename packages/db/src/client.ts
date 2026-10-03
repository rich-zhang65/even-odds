import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/* A connection that drops while idle -- Postgres restarting, the network going
   away -- is reported as an error on the pool, and with no listener Node treats
   that as fatal and takes the whole app down. The pool has already discarded
   the dead connection, so the next query simply opens a fresh one. */
export const createDb = (url: string) => {
  const pool = new Pool({ connectionString: url });
  pool.on('error', (error) => {
    // eslint-disable-next-line no-console -- the only place this surfaces
    console.error('postgres: idle connection lost', error.message);
  });
  return drizzle(pool, { schema });
};

export type Db = ReturnType<typeof createDb>;
