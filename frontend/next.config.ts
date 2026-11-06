import type { NextConfig } from 'next'

// Baseline CSP so the app keeps booting: 'unsafe-inline' styles cover Next's
// injected runtime, 'self' covers same-origin app traffic, data:/blob: cover
// inline SVG avatars and the canvas postcard. 'unsafe-eval' is Next-dev only —
// a production build never evals — so it is dropped in prod (sir's review #3:
// script-src must actually restrict injection). Framing is denied outright
// until nonce-based script-src (middleware) replaces 'unsafe-inline'; tracked
// as the CSP-tightening follow-up.
const isDev = process.env.NODE_ENV !== 'production'
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  // sir's review #2: self-contained server bundle for the container — the
  // runtime image copies .next/standalone, not dev node_modules
  output: 'standalone',
  // This app owns frontend/ — pin the Turbopack root so builds don't watch
  // unrelated files from a guessed workspace root.
  turbopack: {
    root: __dirname,
  },
  // sir's PR review #2: no X-Powered-By banner + baseline security headers
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
