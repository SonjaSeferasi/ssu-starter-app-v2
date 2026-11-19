// RLS, LP, Secure the messages table -- the attack tests.
//
// These run against the REAL hosted Supabase project, not a mock. They create three auth users
// and one group conversation, attack it with the ANON key, and delete everything afterwards.
// Tell the team before running them (assignment, Notes).
//
// THE ONE RULE THAT MAKES THESE WORTH ANYTHING: every attack below uses `anon`. The service-role
// key bypasses RLS entirely, so an attack made with it would pass whether or not the table is
// secured, and the assignment gives no credit for that. service_role appears here only to seed
// and to clean up, never inside an it().
//
// Expected results:
//   BEFORE supabase/rls-messages.sql  -> the attacks succeed, so these tests FAIL   (screenshot 1)
//   AFTER  supabase/rls-messages.sql  -> the attacks are blocked, so these tests PASS (screenshot 3)

import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// -- environment -----------------------------------------------------------------------------
// Read .env.local ourselves so the suite needs no dotenv dependency.
function loadEnv(): void {
  for (const file of ['.env.local', '.env']) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  }
}
loadEnv();

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.SUPABASE_ANON_KEY || '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!URL || !ANON || !SERVICE) {
  throw new Error(
    'Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local first.',
  );
}

// Seeding and cleanup only. Never used inside a test.
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const chat = () => admin.schema('socialu');

// A fresh anon client per attacker, so one sign-in cannot leak into another test.
function anonClient(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

const PASSWORD = 'Rls-Demo-Passw0rd!';
const DOMAIN = 'salemstate.edu'; // socialu.students.email_domain has a FK to university_domains

type Person = { name: string; email: string; authId: string; studentId: number };

export function describeRlsSuite(TABLE: string): void {
  describe(`RLS on socialu.${TABLE}`, () => {
    const runId = Date.now().toString(36);
    let alice: Person; // owns the message under attack
    let bob: Person; // a member of the group: may read, may not tamper
    let carol: Person; // not a member at all: may see nothing
    let conversationId: number;
    let messageId: number;

    async function makePerson(name: string): Promise<Person> {
      const email = `rls-demo-${name}-${runId}@${DOMAIN}`;
      const created = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (created.error) throw created.error;
      const authId = created.data.user!.id;

      // Onboard through the app's own account function, the same path registration uses.
      const account = await admin.rpc('socialu_account', {
        p_action: 'onboard',
        p_auth_id: authId,
        p_full_name: `RLS Demo ${name}`,
        p_username: `rlsdemo_${name}_${runId}`,
      });
      if (account.error) throw account.error;
      return { name, email, authId, studentId: Number(account.data.id) };
    }

    async function signIn(person: Person): Promise<SupabaseClient> {
      const client = anonClient();
      const { error } = await client.auth.signInWithPassword({
        email: person.email,
        password: PASSWORD,
      });
      if (error) throw error;
      return client;
    }

    beforeAll(async () => {
      alice = await makePerson('alice');
      bob = await makePerson('bob');
      carol = await makePerson('carol');

      // A group conversation, so the seed needs no friendship or accepted message request.
      const conversation = await chat()
        .from('conversations')
        .insert({ kind: 'group', created_by: alice.studentId, group_name: `RLS Demo ${runId}` })
        .select('conversation_id')
        .single();
      if (conversation.error) throw conversation.error;
      conversationId = Number(conversation.data.conversation_id);

      // Alice and Bob are in it. Carol is deliberately left out.
      const members = await chat()
        .from('group_memberships')
        .insert([
          { conversation_id: conversationId, student_id: alice.studentId, role: 'owner' },
          { conversation_id: conversationId, student_id: bob.studentId, role: 'member' },
        ]);
      if (members.error) throw members.error;

      const message = await chat()
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: alice.studentId,
          kind: 'text',
          text_content: 'Private to this group.',
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select('message_id')
        .single();
      if (message.error) throw message.error;
      messageId = Number(message.data.message_id);
    }, 60_000);

    afterAll(async () => {
      // Children first: students.auth_user_id references auth.users with no cascade.
      if (conversationId) {
        await chat().from('messages').delete().eq('conversation_id', conversationId);
        await chat().from('group_memberships').delete().eq('conversation_id', conversationId);
        await chat().from('conversations').delete().eq('conversation_id', conversationId);
      }
      for (const person of [alice, bob, carol]) {
        if (!person) continue;
        await chat().from('student_profiles').delete().eq('student_id', person.studentId);
        await chat().from('students').delete().eq('student_id', person.studentId);
        await admin.auth.admin.deleteUser(person.authId);
      }
    }, 60_000);

    // 1. A visitor who is not logged in at all.
    it('a logged-out visitor cannot list messages', async () => {
      const { data } = await anonClient().schema('socialu').from(TABLE).select('*').limit(5);
      expect(data ?? [], 'LEAK: the anon key listed messages without signing in').toHaveLength(0);
    });

    // 2. Another user reading: Carol is signed in, but is in no conversation.
    it('a student outside the conversation cannot read its messages', async () => {
      const client = await signIn(carol);
      const { data } = await client
        .schema('socialu')
        .from(TABLE)
        .select('*')
        .eq('message_id', messageId);
      expect(data ?? [], 'LEAK: Carol read a group message she is not a member of').toHaveLength(0);
    });

    // 3. Another user changing: Bob is a member, but the message is not his.
    it('a group member cannot change another student message', async () => {
      const client = await signIn(bob);
      const { data } = await client
        .schema('socialu')
        .from(TABLE)
        .update({ text_content: 'Bob rewrote this.' })
        .eq('message_id', messageId)
        .select();
      expect(data ?? [], 'TAMPERING: Bob edited the message Alice sent').toHaveLength(0);

      const after = await chat()
        .from('messages')
        .select('text_content')
        .eq('message_id', messageId)
        .single();
      expect(after.data?.text_content, 'TAMPERING: the stored text changed').toBe(
        'Private to this group.',
      );
    });

    // 4. Another user creating, under someone else's name.
    it('a group member cannot send a message in another student name', async () => {
      const client = await signIn(bob);
      const { data } = await client
        .schema('socialu')
        .from(TABLE)
        .insert({
          conversation_id: conversationId,
          sender_id: alice.studentId, // Bob signing Alice's name
          kind: 'text',
          text_content: 'Alice did not write this.',
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select();
      expect(data ?? [], 'IMPERSONATION: Bob posted as Alice').toHaveLength(0);
    });

    // 5. An outsider creating in a conversation she does not belong to.
    it('a student outside the conversation cannot post into it', async () => {
      const client = await signIn(carol);
      const { data } = await client
        .schema('socialu')
        .from(TABLE)
        .insert({
          conversation_id: conversationId,
          sender_id: carol.studentId,
          kind: 'text',
          text_content: 'Carol walked in.',
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select();
      expect(data ?? [], 'IMPERSONATION: Carol posted into a group she is not in').toHaveLength(0);
    });

    // 6. The app still works: the rules must not lock out the people they are for.
    it('a group member can still read the conversation', async () => {
      const client = await signIn(bob);
      const { data } = await client
        .schema('socialu')
        .from(TABLE)
        .select('message_id, text_content')
        .eq('message_id', messageId);
      expect(data ?? [], 'BROKEN: Bob is a member and cannot read the group').toHaveLength(1);
    });

    // 7. Destruction, last, because it removes the row the others rely on.
    it('a group member cannot delete another student message', async () => {
      const client = await signIn(bob);
      await client.schema('socialu').from(TABLE).delete().eq('message_id', messageId);

      const survivor = await chat()
        .from('messages')
        .select('message_id')
        .eq('message_id', messageId);
      expect(survivor.data ?? [], 'DESTRUCTION: Bob deleted the message Alice sent').toHaveLength(
        1,
      );
    });
  });
}
