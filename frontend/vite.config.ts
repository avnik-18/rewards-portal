import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // worktree checkout shares node_modules with the main tree via a junction;
      // vite resolves the realpath outside this root, so relax the strict gate
      strict: false,
      allow: ['.', '/mnt/c/Users/syeda2/Desktop/frontend/frontend/node_modules'],
    },
  },
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
})
