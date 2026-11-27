// Prints installation commands for Linh to run personally. Does NOT connect
// to Supabase, execute SQL, invoke the CLI, or run any tests.
import { readFileSync } from 'node:fs';

const settings = {};
for (const line of readFileSync('.env.rls.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*(RLS_TEST_[A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (match && ['RLS_TEST_PROJECT_REF', 'RLS_TEST_SUPABASE_URL', 'RLS_TEST_CONFIRM_DISPOSABLE'].includes(match[1])) {
    settings[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const ref = settings.RLS_TEST_PROJECT_REF;
if (settings.RLS_TEST_CONFIRM_DISPOSABLE !== 'yes' || !/^[a-z0-9]{10,40}$/.test(ref || '')) {
  throw new Error('Confirm the disposable hosted project and fill its real project ref in .env.rls.local first.');
}
const url = new URL(settings.RLS_TEST_SUPABASE_URL);
if (url.hostname !== `${ref}.supabase.co` || url.protocol !== 'https:') {
  throw new Error('The test URL and test project ref do not match.');
}
console.log(`Target test project ref: ${ref}`);
console.log('Confirm this is socialu-rls-sprint6-test in your dashboard.');
console.log('For the EMPTY test project only, personally run these commands ONE AT A TIME:');
console.log('npx supabase login');
console.log(`npx supabase link --project-ref ${ref}`);
console.log('npx supabase db push --dry-run');
console.log('STOP and inspect the project and migration plan. After confirming them, run:');
console.log('npx supabase db push');
console.log('Enter database passwords only at the CLI prompt; do not paste passwords or keys into chat.');
console.log('After installation succeeds, rerun student-profiles-test-project-setup.sql in the TEST SQL Editor.');
console.log('Do NOT apply rls-student-profiles.sql until your genuine BEFORE evidence is captured.');
