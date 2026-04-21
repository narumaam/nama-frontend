/** @type {import('next').NextConfig} */
const nextConfig = {
  // ---------------------------------------------------------------------------
  // Core Settings
  // ---------------------------------------------------------------------------
  reactStrictMode: true,
  poweredByHeader: false, // hide X-Powered-By for security

  // ---------------------------------------------------------------------------
  // Image Optimisation
  // ---------------------------------------------------------------------------
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.getnama.app' },
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // ---------------------------------------------------------------------------
  // API Rewrites — proxy /api/* to the FastAPI backend so the frontend never
  // talks cross-origin. The NEXT_PUBLIC_API_URL env var should point to the
  // Railway / AWS backend (e.g. https://stunning-joy.up.railway.app).
  // ---------------------------------------------------------------------------
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // Security & Performance Headers
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.getnama.app https://*.up.railway.app https://*.vercel.app wss:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // Webpack — suppress warnings for packages that try to require native modules
  // ---------------------------------------------------------------------------
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
