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
    // Zwei getrennte Prüfumgebungen, bewusst getrennt: Domäne, Engine und
    // Inhalte laufen in Node (schnell, kein DOM nötig). Die Oberfläche braucht
    // ein DOM. Ohne diese Trennung wären gerade die Bauteile ungetestet, an
    // denen am meisten geändert wird.
    projects: [
      {
        extends: true,
        test: {
          name: 'domaene',
          environment: 'node',
          include: ['tests/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'oberflaeche',
          environment: 'jsdom',
          include: ['tests/ui/**/*.test.tsx'],
          setupFiles: ['tests/ui/setup.ts'],
        },
      },
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
