import type { PGlite } from '@electric-sql/pglite';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from './dormspace-db';

export const SNIPE_MIGRATION = 'supabase/migrations/20261025043213_snipe_basic.sql';
export const SNIPE_REWARDS_MIGRATION = 'supabase/migrations/20261029182808_snipe_rewards.sql';
export const SNIPE_REPORTING_MIGRATION = 'supabase/migrations/20261029184238_snipe_group_reporting.sql';
const CHAT_MIGRATIONS = ['20261012120000_chat_send_text_message.sql', '20261019120000_chat_conversation_messages.sql',
  '20261019120100_chat_group_structure_check_as_owner.sql', '20261019150000_chat_conversation_list.sql', '20261019170000_chat_create_group.sql',
  '20261019170100_chat_conversation_role.sql', '20261019190000_chat_unread_status.sql', '20261019190100_chat_mark_read.sql'];

// Minimal stand-in for Supabase Storage's tables, with RLS on (as hosted) and a deliberately broad
// permissive policy, the kind of misconfiguration the Snipe restrictive policy must still defeat.
export const STORAGE_FIXTURE = `CREATE SCHEMA storage;
  CREATE TABLE storage.buckets(id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false);
  CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id), name text NOT NULL, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  INSERT INTO storage.buckets(id, name, public) VALUES ('media', 'media', false);
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
  GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
  CREATE POLICY broad_fixture_access ON storage.objects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;

// Real schema and functions in memory, applied in filename order: Chat, then Snipe, then school communities,
// then Snipe rewards, then Snipe group reporting. `rewards: false` stops before the rewards migration (to apply
// it later in a test); `reporting: false` stops before group reporting. Reporting needs rewards (it replaces
// the rewards version of snipe_view), so it is only applied when rewards is.
export async function createSnipeDatabase(students = 7, { storage = true, rewards = true, reporting = true } = {}) {
  const db = await createDormDatabase(students);
  if (storage) await db.exec(STORAGE_FIXTURE);
  // Local stand-ins for Supabase's Realtime objects used by the chat migrations (as in chat.test.ts).
  await db.exec(`CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
    CREATE SCHEMA realtime; CREATE TABLE realtime.messages(extension text, topic text); CREATE TABLE realtime.sent(topic text, event text, payload jsonb);
    CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('test.topic', true), '')$$;
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA realtime, auth TO authenticated; GRANT SELECT, INSERT ON realtime.messages TO authenticated;
    CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
  for (const file of [...CHAT_MIGRATIONS.map((name) => `supabase/migrations/${name}`), SNIPE_MIGRATION, 'supabase/migrations/20261026000100_school_communities.sql',
    ...(rewards ? [SNIPE_REWARDS_MIGRATION, ...(reporting ? [SNIPE_REPORTING_MIGRATION] : [])] : [])])
    await db.exec(readFileSync(file, 'utf8'));
  return db;
}

// Groups are created directly: the owner and members join in one transaction, like socialu_create_group.
export async function createGroup(db: PGlite, owner: number, members: number[]) {
  return db.transaction(async (tx) => {
    const id = (await tx.query<{ id: string }>("INSERT INTO socialu.conversations(kind,created_by) VALUES('group',$1) RETURNING conversation_id::text AS id", [owner])).rows[0].id;
    await tx.query("INSERT INTO socialu.group_memberships(conversation_id,student_id,role) VALUES($1,$2,'owner')", [id, owner]);
    for (const member of members) await tx.query('INSERT INTO socialu.group_memberships(conversation_id,student_id) VALUES($1,$2)', [id, member]);
    return id;
  });
}

// Calls the bridge exactly as the hosted server does: as service_role, never as a browser role.
export async function snipeCall(db: PGlite, student: number, action: string, conversation: string, snipeId: string | null = null, payload: object = {}) {
  await db.exec('SET ROLE service_role');
  try {
    return (await db.query<{ result: any }>('SELECT public.socialu_snipe($1,$2,$3,$4,$5::jsonb) AS result',
      [testUid(student), action, conversation, snipeId, JSON.stringify(payload)])).rows[0].result;
  } finally { await db.exec('RESET ROLE'); }
}

// Calls the group report bridge as the hosted server does (service_role only).
export async function snipeReportCall(db: PGlite, student: number, conversation: string, snipeId: string | null, payload: object = {}) {
  await db.exec('SET ROLE service_role');
  try {
    return (await db.query<{ result: any }>('SELECT public.socialu_snipe_report($1,$2,$3,$4::jsonb) AS result',
      [testUid(student), conversation, snipeId, JSON.stringify(payload)])).rows[0].result;
  } finally { await db.exec('RESET ROLE'); }
}

// Stand-in for the server's SHA-256 of a validated photo; a different seed is a different photo.
export const snipeDigest = (photo = 'photo-a') => createHash('sha256').update(photo).digest('hex');

// The storage reference the API would create after validating and uploading one photo.
export const snipeUpload = (student: number, key: string, extension: 'jpg' | 'png' = 'jpg', digest = snipeDigest()) => ({
  content_digest: digest,
  storage_key: `snipe/${testUid(student)}/${key}/${digest}/${randomUUID()}.${extension}`,
  mime_type: extension === 'jpg' ? 'image/jpeg' : 'image/png',
  byte_count: 1234,
});
