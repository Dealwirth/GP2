/**
 * Testeinrichtung für die Oberfläche.
 *
 * Zwei Dinge müssen bereitstehen, bevor eine Komponente rendert:
 *   - ein DOM (jsdom, über `environmentMatchGlobs` in vite.config.ts)
 *   - `localStorage` und `matchMedia`, die die App beim Start abfragt.
 *
 * `cleanup` räumt nach jedem Test das DOM auf – sonst leckt der Inhalt eines
 * Tests in den nächsten, und ein Fehlschlag wäre nicht mehr zuzuordnen.
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom kennt matchMedia nicht. Die App fragt es für die Dunkelansicht ab.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

// jsdom wirft bei scrollTo. Der Router ruft es beim Seitenwechsel.
if (!window.scrollTo) {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}
