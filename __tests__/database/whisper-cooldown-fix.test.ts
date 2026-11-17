import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Regression test for GitHub #1213 (The Whisper Wall -- post a confession,
// additional functionality): the posting cooldown's message must state the
// actual remaining wait (not "a moment"), and deleting the student's last
// confession must NOT reset the cooldown -- it is tracked on the student
// record itself now, independent of any row that can be deleted.
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261029000100_whisper_retire_categories.sql','20261103000100_whisper_professor_tea.sql','20261112150000_whisper_cooldown_fix.sql'];

it('reports the actual remaining cooldown time, and does not let deleting the last confession bypass it', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of migrations) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(1),'s1@salemstate.edu']);
await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',['Student 1','student1','s1@salemstate.edu',uid(1)]);

const create=async(text:string)=>(await db.query<any>("SELECT public.socialu_whisper_create($1,'advice',$2) AS r",[uid(1),text])).rows[0].r;
const del=async(confessionId:number)=>db.query('SELECT public.socialu_whisper_delete($1,$2)',[uid(1),confessionId]);

const first=await create('My first confession');

// Immediately posting again must be refused with a message naming the
// actual remaining wait, not "a moment".
await assert.rejects(
  create('Too soon'),
  (e:any) => {
    assert.match(e.message, /about 2 minutes|less than a minute|about a minute/);
    assert.doesNotMatch(e.message, /a moment/);
    return true;
  }
);

// Deleting the only confession must NOT reset the cooldown -- posting
// again immediately afterward must still be refused. Before the fix,
// this bypassed the limit entirely (max(created_at) over now-zero rows
// is NULL, so the check never fires).
await del(first.confession_id);
await assert.rejects(create('Sneaking one in right after deleting'), /minute/);

console.log('PASS: the whisper posting cooldown names the actual remaining wait, and survives deleting the confession that started it.');
} finally { await db.close(); }
}, 30000);
