import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Automatic JSX runtime, matching how Next.js itself compiles .tsx files --
  // without this, esbuild's default classic transform calls React.createElement
  // directly, requiring every component (and every component it renders) to
  // explicitly `import React from 'react'` just to be render-tested.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
  },
});
