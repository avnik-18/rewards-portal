import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // root-level layers first, then src/ pages — mirrors the tsconfig path fallback
      { find: /^@\/(components|lib|hooks|public)(\/.+)$/, replacement: path.resolve(__dirname) + '/$1$2' },
      { find: /^@\/(.+)$/, replacement: path.resolve(__dirname) + '/src/$1' },
    ],
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    // The Entra app registration's redirect URI lives on this dev-server
    // origin (localhost:5173/api/auth/sso/callback) — the proxy hands SSO
    // traffic to the dedicated SSO backend on :8100, same paths, so its
    // session cookie is issued for the 5173 origin the React app runs on.
    proxy: {
      '/api/auth': { target: 'http://localhost:8100', changeOrigin: true },
      '/api/me': { target: 'http://localhost:8100', changeOrigin: true },
    },
  },
})
