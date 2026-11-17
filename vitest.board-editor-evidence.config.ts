import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node', include: ['scripts/tests/board-editor-acceptance.browser.ts'], testTimeout: 90000, hookTimeout: 90000 },
});
