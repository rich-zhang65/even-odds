import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@even-odds/game-sdk",
    "@even-odds/yahtzee",
  ],
};

export default nextConfig;
