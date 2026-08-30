import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@even-odds/game-sdk",
    "@even-odds/yazy",
  ],
};

export default nextConfig;
