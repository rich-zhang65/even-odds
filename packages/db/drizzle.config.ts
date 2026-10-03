import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// Local dev keeps DATABASE_URL in the root .env; a hosted shell sets it directly.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
