// LOCAL FILE PREPARATION ONLY. Does not run SQL, Supabase, or any tests.
// Existing migration SQL/history must not be renamed in the shared repo.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = process.cwd();
const settings = {};
for (const line of readFileSync(resolve(root, '.env.rls.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*(RLS_TEST_[A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && ['RLS_TEST_PROJECT_REF', 'RLS_TEST_SUPABASE_URL', 'RLS_TEST_CONFIRM_DISPOSABLE'].includes(m[1])) {
    settings[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const ref = settings.RLS_TEST_PROJECT_REF;
if (settings.RLS_TEST_CONFIRM_DISPOSABLE !== 'yes' || !/^[a-z0-9]{10,40}$/.test(ref || '') ||
    settings.RLS_TEST_SUPABASE_URL !== `https://${ref}.supabase.co`) {
  throw new Error('Fill and confirm the disposable hosted project in .env.rls.local first.');
}
const linkedRef = resolve(root, 'supabase/.temp/project-ref');
if (existsSync(linkedRef) && readFileSync(linkedRef, 'utf8').trim() !== ref) {
  throw new Error('The existing CLI link disagrees with the test project. Stop and review the destination.');
}
const source = resolve(root, 'supabase/migrations');
const destination = resolve(root, 'tmp/tools/ln-rls-migration-install');
if (existsSync(destination)) throw new Error(`Prepared directory already exists: ${destination}. Do not overwrite its linked history.`);

const files = readdirSync(source).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
const mapping = [];
let previous = 0n;
for (const original of files) {
  const version = BigInt(original.slice(0, 14));
  const unique = version > previous ? version : previous + 1n;
  previous = unique;
  const prepared = unique.toString().padStart(14, '0') + original.slice(14);
  const bytes = readFileSync(resolve(source, original));
  mapping.push({ original, prepared, sha256: createHash('sha256').update(bytes).digest('hex'), bytes });
}
mkdirSync(resolve(destination, 'supabase/migrations'), { recursive: true });
writeFileSync(resolve(destination, 'supabase/config.toml'), 'project_id = "ln-sprint6-test-install"\n\n[db.seed]\nenabled = false\n');
for (const entry of mapping) writeFileSync(resolve(destination, 'supabase/migrations', entry.prepared), entry.bytes);
writeFileSync(resolve(destination, 'migration-map.json'), JSON.stringify(mapping.map(({ bytes, ...entry }) => entry), null, 2) + '\n');
writeFileSync(resolve(destination, 'README.md'), `# Disposable test-project migration installation\n\nTarget: ${ref}. This is a LOCAL installation copy, not the application checkout.\nSQL bytes are identical to the repository migrations; migration-map.json records SHA-256 hashes.\nOnly duplicate version labels are made unique, keeping the first occurrence and preserving file order.\nDo not use this directory for the shared project, edit migration history, or run application tests here.\nThe separately applied LN profile RLS fix is not included. Return to the application checkout for your personal tests.\n`);
const changed = mapping.filter(entry => entry.original !== entry.prepared);
console.log(`Prepared ${mapping.length} SQL files locally; ${changed.length} duplicate version labels made unique.`);
console.log('Original repository migration files were not changed. No SQL or tests ran.');
console.log(`cd ${destination}`);
console.log(`npx supabase link --project-ref ${ref}`);
console.log('npx supabase db push --remote --dry-run');
console.log('Inspect the target and plan before personally running: npx supabase db push --remote');
