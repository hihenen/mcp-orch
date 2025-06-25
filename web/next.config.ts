import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Docker 환경에서 타입체크 및 ESLint 건너뛰기
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  webpack: (config) => {
    // Ensure proper module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },
};

export default nextConfig;
