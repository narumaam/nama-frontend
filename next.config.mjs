/** @type {import('next').NextConfig} */

// ── Security Headers ─────────────────────────────────────────────────────────
// Applied to all routes. Vercel respects these headers in production.
// CSP is intentionally permissive for the dashboard (Tailwind CDN, Unsplash,
// Railway API, wa.me links) — tighten per-route in production as needed.
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',   // prevent clickjacking — allows same-origin iframes
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',      // prevent MIME sniffing attacks
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Strict-Transport-Security: enforce HTTPS for 1 year + include subdomains
    // Only applied in production — dev uses HTTP
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    // Content Security Policy — permits known trusted sources
    // 'unsafe-inline' for Tailwind/styled components; tighten with nonces in v2
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires these in dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.unsplash.com https://*.railway.app",
      "connect-src 'self' https://*.railway.app https://wa.me wss://*.vercel.app",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  // NOTE: Do NOT set output:'standalone' for Vercel deployments.
  // 'standalone' is for Docker/self-hosted builds only.
  // Vercel handles its own optimised output automatically.

  // ── Security Headers ────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

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
  // On local dev (npm run dev), unmatched /api/** requests are forwarded to Railway.
  // Set NEXT_PUBLIC_API_URL in .env.local to override the Railway backend URL.
  //
  // IMPORTANT: Using `afterFiles` (not `beforeFiles`) so that local Next.js
  // Route Handlers (/api/v1/*, /api/auth/*) are matched FIRST before falling
  // through to the Railway proxy. `beforeFiles` would bypass local handlers.
  rewrites: async () => {
    const railwayUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      'https://intuitive-blessing-production-30de.up.railway.app'

    return {
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${railwayUrl}/api/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
