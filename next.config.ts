import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['thread-stream', 'pino', 'ethers', 'socket.io'],
};

export default nextConfig;
