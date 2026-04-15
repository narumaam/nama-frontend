import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'stunning-joy-production-87bb.up.railway.app',
      },
    ],
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'https://stunning-joy-production-87bb.up.railway.app/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
