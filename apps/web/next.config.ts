import { existsSync } from 'node:fs';
import type { NextConfig } from 'next';

// Next reads .env from apps/web; the monorepo keeps one at the root for every
// app to share. A hosted environment sets DATABASE_URL directly instead.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

const nextConfig: NextConfig = {
  transpilePackages: [
    '@even-odds/db',
    '@even-odds/game-sdk',
    '@even-odds/air-hockey',
    '@even-odds/battleship',
    '@even-odds/gomoku',
    '@even-odds/yazy',
    '@even-odds/pong',
  ],
};

export default nextConfig;
