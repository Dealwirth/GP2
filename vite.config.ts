/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relativer Aushang: Dieselbe Bauausgabe läuft unter Cloudflare Pages (Wurzel)
// wie unter GitHub Pages (Unterverzeichnis /GP2/), ohne dass der Pfad bekannt
// sein muss.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
