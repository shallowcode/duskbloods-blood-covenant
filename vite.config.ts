import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Dev serves index.html as a normal module app. The build emits a single
 * classic IIFE script plus one stylesheet so the game runs from file:// with
 * no server — module scripts are blocked by browsers on file URLs.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: 'public',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  server: { host: '127.0.0.1' },
  build: {
    outDir: 'offline',
    emptyOutDir: true,
    copyPublicDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    lib: {
      entry: 'src/main.tsx',
      name: 'Duskbloods',
      formats: ['iife'],
      fileName: () => 'game.js',
      cssFileName: 'game',
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
