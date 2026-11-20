import { defineConfig } from 'vitest/config';

// RLS attack tests (course pattern: brockenbrough/security-starter-rls-v1). Use `npm run test:security`.
// They also run in the default `npm test`, since they use an in-memory Postgres, not a real project.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/security/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
