import type { NextConfig } from 'next'

// Baseline, deliberately lenient CSP so the app keeps booting: 'unsafe-inline'
// styles + eval'able scripts cover Next/Turbopack's injected runtime and the
// Google-Fonts stylesheet, 'self' covers same-origin app traffic, data:/blob:
// cover inline SVG avatars and the canvas postcard. Tighten to nonces when the
// backend lands.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
].join('; ')

const nextConfig: NextConfig = {
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
        ],
      },
    ]
  },
}

export default nextConfig
