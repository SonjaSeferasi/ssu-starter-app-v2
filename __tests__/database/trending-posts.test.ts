import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

const MIGRATIONS=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261113150000_trending_posts.sql'];

// SRS-405.1-405.8: Trending ranks the Campus Feed posts a student can see by their likes in the last 168 hours.
it('ranks visible campus posts by recent active likes, leaving out zero-count posts, recalculated on every request', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for (const file of MIGRATIONS) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Safe to re-run.
await db.exec(readFileSync(root+'/supabase/migrations/20261113150000_trending_posts.sql','utf8'));

await db.query("INSERT INTO socialu.university(university_id,name) VALUES(2,'Other University')");
await db.query("INSERT INTO socialu.university_domains(domain,university_id) VALUES('otheruni.edu',2)");
// Students 1-7 at Salem State; student 8 at another school.
const uid=(n:number)=>`00000000-0000-0000-0000-0000000000${n.toString().padStart(2,'0')}`;
for (let n=1;n<=8;n++) {
 const email=n===8?'s8@otheruni.edu':`s${n}@salemstate.edu`;
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),email]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,email,uid(n)]);
}
const sid=async(n:number)=>(await db.query<any>('SELECT student_id FROM socialu.students WHERE username=$1',[`student${n}`])).rows[0].student_id;
const post=async(n:number,text:string,visibility='public',repostOf:number|null=null)=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3,$4) AS p',[uid(n),text,visibility,repostOf])).rows[0].p.post_id as number;
// Likes are recorded directly so their times can be placed exactly; reaction can be any of the six.
const like=async(postId:number,n:number,ago='1 hour',reaction='like')=>db.query(`INSERT INTO socialu.post_likes(post_id,student_id,liked_at,reaction) VALUES($1,$2,now()-$3::interval,$4)`,[postId,await sid(n),ago,reaction]);
const trending=async(n=1,limit=10)=>(await db.query<any>('SELECT public.socialu_trending_posts($1,$2) AS t',[uid(n),limit])).rows[0].t as any[];
const ids=async(n=1)=>(await trending(n)).map((t)=>t.post_id);
const code=(expected:string)=>(error:any)=>error.code===expected;

const popular=await post(2,'Free pizza in the quad!');
const runnerUp=await post(3,'Study group tonight');
const tieOlder=await post(4,'Older tie');
const tieNewer=await post(5,'Newer tie');
const quiet=await post(6,'Nobody liked this');
const stale=await post(7,'Liked last month');
const friendsOnly=await post(2,'Friends only','friends_only');
const otherSchool=await post(8,'Other campus');
await db.query("UPDATE socialu.posts SET published_at=now()-interval '3 days' WHERE post_id=$1",[tieOlder]);
await db.query("UPDATE socialu.posts SET published_at=now()-interval '1 day' WHERE post_id=$1",[tieNewer]);

// SRS-405.2: active likes within the last 168 hours count, one per student, any reaction.
for (const n of [3,4,5,6]) await like(popular,n,'2 hours',n===4?'love':'like');
await like(popular,7,'167 hours 59 minutes');
await like(popular,1,'168 hours 5 minutes');      // just outside the window: not counted
for (const n of [2,6,7]) await like(runnerUp,n);
for (const n of [2,3]) { await like(tieOlder,n); await like(tieNewer,n); }
await like(stale,2,'30 days');
for (const n of [3,4,5,6,7]) { await like(friendsOnly,n); }
await like(otherSchool,8);

const first=await trending();
// SRS-405.1: only public posts from the student's own school; SRS-405.4: no zero-count posts (quiet, stale).
// SRS-405.3: most recent likes first, then newest publication.
assert.deepEqual(first.map((t)=>t.post_id),[popular,runnerUp,tieNewer,tieOlder]);
assert.deepEqual(first.map((t)=>Number(t.recent_like_count)),[5,3,2,2]);
for (const hidden of [quiet,stale,friendsOnly,otherSchool]) assert.ok(!first.some((t)=>t.post_id===hidden));
// SRS-405.5: each entry carries its author, a text preview and the count.
assert.deepEqual([first[0].author_name,first[0].author_username,first[0].text_content],['Student 2','student2','Free pizza in the quad!']);

// SRS-405.3: equal counts and publication times fall back to the lower post ID.
await db.query("UPDATE socialu.posts SET published_at=(SELECT published_at FROM socialu.posts WHERE post_id=$1) WHERE post_id=$2",[tieOlder,tieNewer]);
assert.deepEqual((await ids()).slice(2),[Math.min(tieOlder,tieNewer),Math.max(tieOlder,tieNewer)]);

// SRS-405.1: a block either way, or a deactivated author, removes the post for that student.
await db.query('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES($1,$2)',[await sid(3),await sid(1)]);
assert.ok(!(await ids(1)).includes(runnerUp));
assert.ok((await ids(2)).includes(runnerUp));
await db.query('DELETE FROM socialu.student_blocks');
await db.query('UPDATE socialu.students SET is_active=false WHERE student_id=$1',[await sid(4)]);
assert.ok(!(await ids()).includes(tieOlder));
await db.query('UPDATE socialu.students SET is_active=true WHERE student_id=$1',[await sid(4)]);
// The other school sees only its own posts.
assert.deepEqual(await ids(8),[otherSchool]);

// SRS-405.8: every request recalculates from the recorded likes: an unlike drops the count, a new like adds a post.
await db.query('DELETE FROM socialu.post_likes WHERE post_id=$1 AND student_id IN ($2,$3,$4)',[popular,await sid(3),await sid(4),await sid(5)]);
await like(quiet,2); await like(quiet,3); await like(quiet,4); await like(quiet,5);
const second=await trending();
assert.deepEqual(second.slice(0,2).map((t)=>[t.post_id,Number(t.recent_like_count)]),[[quiet,4],[runnerUp,3]]);
assert.equal(Number(second.find((t)=>t.post_id===popular).recent_like_count),2);

// A repost with no text of its own is previewed by the post it shares.
const repost=await post(5,'','public',popular);
for (const n of [2,3,4,6,7,1]) await like(repost,n);
const top=(await trending())[0];
assert.deepEqual([top.post_id,top.is_repost,top.text_content],[repost,true,'Free pizza in the quad!']);

// The list is capped, and the limit must be sensible.
assert.equal((await trending(1,2)).length,2);
for (const bad of [0,51,null]) await assert.rejects(trending(1,bad as number),code('22023'));
await assert.rejects(db.query('SELECT public.socialu_trending_posts($1,10)',['00000000-0000-0000-0000-000000000099']),code('42501'));

// Only the server can call it; browsers cannot.
for (const role of ['anon','authenticated'])
 assert.equal((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_trending_posts(uuid,integer)','EXECUTE') AS ok",[role])).rows[0].ok,false);
}, 120000);
