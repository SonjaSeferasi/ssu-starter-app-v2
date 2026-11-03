/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Verify a production build while a Windows dev server owns .next/trace.
  // This fixed, project-local directory is opt-in for the review preview only.
  distDir: process.env.SOCIALU_BUILD_TARGET === 'oceania-a' ? 'tmp/tools/oceania-a-preview/.next' : process.env.SOCIALU_BUILD_TARGET === 'oceania-a-build' ? 'tmp/tools/oceania-a-build/.next' : process.env.SOCIALU_BUILD_TARGET === 'north-america' ? 'tmp/tools/north-america-preview/.next' : process.env.SOCIALU_BUILD_TARGET === 'north-america-build' ? 'tmp/tools/north-america-build/.next' : process.env.SOCIALU_BUILD_TARGET === 'asia-phase-a' ? '.next-asia-phase-a' : process.env.SOCIALU_BUILD_TARGET === 'review' ? '.next-review' : '.next',
  // SRS-201.1 Realtime runs in the browser, which can only read NEXT_PUBLIC_ values.
  // Reuse the existing variables so no one edits .env.local. Public values only: never add the service role key.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;
