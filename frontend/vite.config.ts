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
  server: {
    fs: {
      strict: false,
      allow: ['.', 'D:/demo/frontend/frontend'],
    },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
