import { defineConfig } from 'vitest/config';

// The security tests talk to the real Supabase project and create real auth users, so they are
// kept out of `npm test`. Run them on purpose with `npm run test:security`.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/security/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
