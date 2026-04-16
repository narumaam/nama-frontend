/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Do NOT set output:'standalone' for Vercel deployments.
  // 'standalone' is for Docker/self-hosted builds only.
  // Vercel handles its own optimised output automatically.

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.railway.app',
      },
    ],
  },

  // ── API proxy for local development ONLY ──────────────────────────────────
  // On Vercel, vercel.json rewrites take precedence and this block is ignored.
  // On local dev (npm run dev), requests to /api/** are forwarded to Railway.
  // Set NEXT_PUBLIC_API_URL in .env.local to override the Railway backend URL.
  rewrites: async () => {
    const railwayUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      'https://intuitive-blessing-production-30de.up.railway.app'

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${railwayUrl}/api/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
