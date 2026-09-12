import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@even-odds/game-sdk',
    '@even-odds/air-hockey',
    '@even-odds/yazy',
    '@even-odds/pong',
  ],
};

export default nextConfig;
