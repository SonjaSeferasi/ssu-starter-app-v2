// Screenshot 2: proves RLS is on for socialu.messages and lists the policies that exist.
// Same checks as the course slides' Step 3, run against the PGlite database the attack tests use,
// so the output can be reproduced on any laptop. Run the identical two queries in the Supabase SQL
// Editor once the migration has been applied to the hosted project.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const root = process.cwd();
const db = new PGlite();

await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
await db.exec(readFileSync(root + '/supabase/schema.sql', 'utf8'));
await db.exec(readFileSync(root + '/supabase/migrations/20261008000100_link_supabase_accounts.sql', 'utf8'));
await db.exec(readFileSync(root + '/supabase/migrations/20261119130000_messages_rls.sql', 'utf8'));

const pad = (value, width) => String(value).padEnd(width);

console.log('-- 1. Is row level security switched on for the table?');
console.log("SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled");
console.log('  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace');
console.log(" WHERE n.nspname = 'socialu' AND c.relname = 'messages';");
console.log('');
const { rows: table } = await db.query(
  `SELECT n.nspname AS schema, c.relname AS "table", c.relrowsecurity AS rls_enabled
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'socialu' AND c.relname = 'messages'`);
console.log(' schema   | table    | rls_enabled');
console.log('----------+----------+------------');
for (const r of table) console.log(` ${pad(r.schema, 8)} | ${pad(r.table, 8)} | ${r.rls_enabled}`);
console.log(`(${table.length} row)`);
console.log('');

console.log('-- 2. Which policies exist, for which command, for which role?');
console.log('SELECT policyname, cmd, roles FROM pg_policies');
console.log("  WHERE schemaname = 'socialu' AND tablename = 'messages' ORDER BY cmd;");
console.log('');
const { rows: policies } = await db.query(
  `SELECT policyname, cmd, roles::text AS roles, qual IS NOT NULL AS has_using,
          with_check IS NOT NULL AS has_with_check
     FROM pg_policies WHERE schemaname = 'socialu' AND tablename = 'messages' ORDER BY cmd, policyname`);
console.log(' policyname                                          | cmd    | roles           | using | with_check');
console.log('-----------------------------------------------------+--------+-----------------+-------+-----------');
for (const r of policies) {
  console.log(` ${pad(r.policyname, 51)} | ${pad(r.cmd, 6)} | ${pad(r.roles, 15)} | ${pad(r.has_using, 5)} | ${r.has_with_check}`);
}
console.log(`(${policies.length} rows)`);
console.log('');
console.log('No UPDATE row, no DELETE row, and nothing for anon -- that absence is the point.');

await db.close();
