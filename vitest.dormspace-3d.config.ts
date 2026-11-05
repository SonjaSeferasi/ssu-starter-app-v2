import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['scripts/tests/dormspace-3d.browser.ts'], testTimeout: 240000, hookTimeout: 120000, fileParallelism: false, bail: 1, reporters: ['verbose'] } });
