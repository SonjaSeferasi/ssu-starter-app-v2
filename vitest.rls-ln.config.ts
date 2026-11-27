import { defineConfig } from 'vitest/config';

// Opt-in LIVE tests: deliberately not named *.test.ts, so neither the normal
// npm test nor teammates' PGlite security suite can create real accounts.
// Linh must personally invoke this command for the assignment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/security/live/student-profiles.rls.live.ts'],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
