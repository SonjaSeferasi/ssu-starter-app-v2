import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Regression test for GitHub #1208 (The Whisper Wall -- sorting, additional
// functionality): socialu_whisper_list must (1) return a stable order even
// when every row has an identical sort_key (e.g. several zero-comment
// confessions under Most Discussed), and (2) never leak the internal
// sort_key field into its response.
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261029000100_whisper_retire_categories.sql','20261103000100_whisper_professor_tea.sql','20261112130000_whisper_list_sort_and_leak_fix.sql'];

it('gives Most Discussed a stable tiebreaker among equal-score confessions, and never leaks sort_key', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of migrations) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-0000000000${n.toString().padStart(2,'0')}`;
// 12 different students (one confession each) -- sidesteps the unrelated
// 2-minute posting cooldown (GitHub #1213), which would otherwise block a
// single student from posting 12 confessions in a tight loop.
for (let n=1;n<=12;n++) {
  await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
  await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}

const create=async(n:number,text:string)=>(await db.query<any>("SELECT public.socialu_whisper_create($1,'advice',$2) AS r",[uid(n),text])).rows[0].r;
const list=async(sort:string)=>(await db.query<any>('SELECT public.socialu_whisper_list($1,NULL,$2,0) AS r',[uid(1),sort])).rows[0].r as any[];

// 12 confessions, all with zero comments -- under Most Discussed every
// row shares the identical sort_key (0), so only a real tiebreaker keeps
// the order stable and matching confession_id DESC (newest first, the
// chosen tiebreaker), run twice to rule out planner non-determinism.
const created=[];
for (let i=1;i<=12;i++) created.push((await create(i,`Confession ${i}`)).confession_id);
const expectedOrder=[...created].sort((a,b)=>b-a); // confession_id DESC

const run1=await list('most_discussed');
const run2=await list('most_discussed');
assert.deepEqual(run1.map((c:any)=>c.confession_id), expectedOrder);
assert.deepEqual(run2.map((c:any)=>c.confession_id), expectedOrder); // same order on a second read, not planner-dependent

// sort_key must never appear in the response, for any sort mode.
for (const sort of ['latest','trending','most_discussed']) {
  const rows=await list(sort);
  for (const row of rows) assert.equal('sort_key' in row, false, `sort_key leaked for sort=${sort}`);
}

console.log('PASS: Most Discussed has a stable, deterministic tiebreaker among equal-score confessions, and sort_key never appears in the response for any sort mode.');
} finally { await db.close(); }
}, 30000);
