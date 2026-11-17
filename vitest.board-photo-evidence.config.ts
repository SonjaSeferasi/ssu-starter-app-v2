import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node', include: ['scripts/tests/board-photo-ownership.browser.ts'], testTimeout: 60000, hookTimeout: 90000 },
});
