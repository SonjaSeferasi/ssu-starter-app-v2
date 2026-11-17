import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Regression test for GitHub #1184 (pagination): socialu_whisper_list's
// existing p_offset support, now actually used by the frontend (Load
// more), must never repeat or skip a confession when read page by page.
// Under "latest" sort specifically there's no real tie to break (sort_key
// is each row's own created_at, effectively unique per insert), so this
// test alone doesn't exercise #1208's tiebreaker -- #1208's own test
// already covers the tie-prone case (Most Discussed with several
// zero-comment confessions). Pagination over a sort that DOES tie
// (Most Discussed/Trending) is exactly why #1208 had to land first;
// this file verifies the pagination logic itself, not that prerequisite.
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261029000100_whisper_retire_categories.sql','20261103000100_whisper_professor_tea.sql','20261112130000_whisper_list_sort_and_leak_fix.sql','20261112150000_whisper_cooldown_fix.sql'];

it('pages through Latest with no duplicate and no skipped confession across pages', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of migrations) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-${n.toString().padStart(12,'0')}`;
// 45 students, one confession each -- enough for 3 pages of 20/20/5.
for (let n=1;n<=45;n++) {
  await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
  await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const create=async(n:number,text:string)=>(await db.query<any>("SELECT public.socialu_whisper_create($1,'advice',$2) AS r",[uid(n),text])).rows[0].r;
const list=async(offset:number)=>(await db.query<any>('SELECT public.socialu_whisper_list($1,NULL,\'latest\',$2) AS r',[uid(1),offset])).rows[0].r as any[];

const created=[];
for (let n=1;n<=45;n++) created.push((await create(n,`Confession from student ${n}`)).confession_id);

// Page through exactly the way WhisperTab.loadMore does: offset = how
// many we already have, stop once a page comes back under PAGE_SIZE (20).
let all:any[] = [];
let offset = 0;
for (let page=0; page<5; page++) { // generous upper bound, real loop would stop itself
  const rows = await list(offset);
  all = all.concat(rows);
  offset = all.length;
  if (rows.length < 20) break;
}

assert.equal(all.length, 45, `expected all 45 confessions reachable via pagination, got ${all.length}`);
const ids = all.map((c:any)=>c.confession_id);
const uniqueIds = new Set(ids);
assert.equal(uniqueIds.size, ids.length, 'a confession_id appeared more than once across pages (duplicate)');
assert.deepEqual([...uniqueIds].sort((a:any,b:any)=>a-b), [...created].sort((a,b)=>a-b), 'the set of confession ids reached via pagination does not match everything that was created (a confession was skipped)');

console.log('PASS: paging through 45 confessions (3 pages) under the stable Latest sort reaches every confession exactly once -- no duplicates, no skips.');
} finally { await db.close(); }
}, 30000);
