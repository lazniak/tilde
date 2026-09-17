/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

// Content-Security-Policy. Fonts come from Google Fonts; everything else is same-origin.
// 'unsafe-inline' for scripts is required by Next.js' inline bootstrap and the JSON-LD blocks;
// 'unsafe-eval' is only needed by the dev server (React refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      // The embeddable widget (feature package "community") must be frameable.
      {
        source: '/embed/:path*',
        headers: securityHeaders
          .filter(h => h.key !== 'X-Frame-Options')
          .map(h => (h.key === 'Content-Security-Policy' ? { key: h.key, value: csp.replace("frame-ancestors 'none'", 'frame-ancestors *') } : h)),
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Long cache for immutable media
      {
        source: '/eon/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }],
      },
      {
        source: '/voice/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
      },
    ]
  },
}

module.exports = nextConfig
