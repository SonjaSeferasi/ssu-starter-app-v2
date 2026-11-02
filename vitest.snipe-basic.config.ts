import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['scripts/tests/snipe-basic.browser.ts'], testTimeout: 180000, hookTimeout: 150000, fileParallelism: false, bail: 1, reporters: ['verbose'] } });
