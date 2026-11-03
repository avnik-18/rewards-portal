import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // This app owns frontend/ — don't let Turbopack infer the workspace root from
  // the old SPA's package-lock and slow down/watch unrelated files.
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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
