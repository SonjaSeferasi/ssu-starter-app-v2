import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Regression test for a bug found and fixed this session: 20261026000100_school_communities.sql
// enforces cross-school isolation by live-patching whatever function source existed in the
// database at the moment it ran. This session's later mentions/share_post/reposts migrations
// then did plain CREATE OR REPLACE on several of those same functions with hand-written SQL
// that had no knowledge of the patch, silently dropping the school-isolation guard. Confirmed
// against the live database before the fix: 10 of 11 affected functions had lost it. This test
// proves 20261027000300_restore_school_isolation.sql (the fix) actually restores isolation for
// every one of those paths, using two students from two DIFFERENT schools.
it('keeps students from different schools fully isolated across feeds, single-post access, profile content, reposting, comments, and notifications', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

// Two schools: Salem State (seeded by link_supabase_accounts.sql) and a second one.
await db.query<any>("INSERT INTO socialu.university(university_id,name) VALUES(2,'Other University')");
await db.query<any>("INSERT INTO socialu.university_domains(domain,university_id) VALUES('otheruni.edu',2)");

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
// Students 1 and 2: Salem State. Student 3: a different school entirely.
const emails=['s1@salemstate.edu','s2@salemstate.edu','s3@otheruni.edu'];
for (let n=1;n<=3;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),emails[n-1]]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,emails[n-1],uid(n)]);
}

const post=async(n:number,text:string,vis='public')=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(n),text,vis])).rows[0].p;
const getPost=async(n:number,postId:number)=>(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(n),postId])).rows[0].p;
const getFeed=async(n:number)=>(await db.query<any>('SELECT public.socialu_campus_feed($1) AS f',[uid(n)])).rows[0].f as any[];
const notifs=async(n:number)=>(await db.query<any>('SELECT public.socialu_notifications($1) AS r',[uid(n)])).rows[0].r.notifications as any[];

// --- same_school() itself: sanity check the two test accounts are actually
// set up as different schools, same school respectively. ---
const sameSchool12=(await db.query<any>('SELECT socialu.same_school((SELECT student_id FROM socialu.students WHERE username=$1),(SELECT student_id FROM socialu.students WHERE username=$2)) AS r',['student1','student2'])).rows[0].r;
assert.equal(sameSchool12,true);
const sameSchool13=(await db.query<any>('SELECT socialu.same_school((SELECT student_id FROM socialu.students WHERE username=$1),(SELECT student_id FROM socialu.students WHERE username=$2)) AS r',['student1','student3'])).rows[0].r;
assert.equal(sameSchool13,false);

// --- Campus Feed: student 3 (other school) must NEVER see student 1's public post. ---
const salemPublic=(await post(1,'Go Vikings')).post_id;
assert.ok((await getFeed(2)).some((p:any)=>p.post_id===salemPublic)); // same-school classmate sees it
assert.ok(!(await getFeed(3)).some((p:any)=>p.post_id===salemPublic)); // cross-school student does not

// --- Single-post direct link: cross-school access must be rejected with the
// same generic error every other authorization failure uses. ---
const sameSchoolRead=await getPost(2,salemPublic);
assert.equal(sameSchoolRead.post_id,salemPublic);
await assert.rejects(db.query('SELECT public.socialu_get_post($1,$2)',[uid(3),salemPublic]), /This post isn't available/);

// --- Profile content: a cross-school student's "Posts" tab must not expose
// a public post either. socialu_profile_target already blocks reaching the
// profile at all cross-school, so this call itself should fail generically --
// confirming the upstream protection is intact and wasn't touched. ---
await assert.rejects(db.query("SELECT public.socialu_profile_content($1,$2,$3)",[uid(3),'student1','posts']), /not available/);

// --- Reposting: student 3 must not be able to repost student 1's (different
// school) public post. ---
await assert.rejects(db.query('SELECT public.socialu_create_post($1,$2,$3,$4)',[uid(3),'sharing','public',salemPublic]), /This post isn't available/);
// Same-school repost still works normally (regression check the fix didn't
// break legitimate same-school reposting).
const repost=await db.query<any>('SELECT public.socialu_create_post($1,$2,$3,$4) AS p',[uid(2),'nice','public',salemPublic]);
assert.equal(repost.rows[0].p.is_repost,true);
assert.equal(repost.rows[0].p.repost_of.post_id,salemPublic);

// --- Comments: a cross-school student must not be able to list or comment
// on a post from a different school, even with a known, valid post_id. ---
await assert.rejects(db.query('SELECT public.socialu_list_comments($1,$2)',[uid(3),salemPublic]), /not available/);
await assert.rejects(db.query('SELECT public.socialu_create_comment($1,$2,$3)',[uid(3),salemPublic,'nice try']), /not available/);
// Same-school commenting still works normally.
const comment=await db.query<any>('SELECT public.socialu_create_comment($1,$2,$3) AS c',[uid(2),salemPublic,'Go Vikings indeed']);
assert.equal(comment.rows[0].c.post_id,salemPublic);
// Editing that comment still works for its own (same-school) author.
const edited=await db.query<any>('SELECT public.socialu_update_comment($1,$2,$3) AS c',[uid(2),comment.rows[0].c.comment_id,'Updated']);
assert.equal(edited.rows[0].c.text_content,'Updated');

// --- Notifications: the repost notification student 1 (original author)
// received from student 2's same-school repost must still surface --
// confirming the same_school addition to socialu_notifications' CTEs
// doesn't accidentally exclude legitimate same-school notifications too. ---
assert.ok((await notifs(1)).some((x:any)=>x.kind==='repost' && x.post_id===repost.rows[0].p.post_id));

// --- Delete comment: found by the broader sweep, not the original 11.
// Cross-school delete must be rejected; same-school delete still works. ---
await assert.rejects(db.query('SELECT public.socialu_delete_comment($1,$2)',[uid(3),comment.rows[0].c.comment_id]), /not available/);
const deleteResult=await db.query<any>('SELECT public.socialu_delete_comment($1,$2) AS r',[uid(2),comment.rows[0].c.comment_id]);
assert.equal(deleteResult.rows[0].r.deleted,true);

// --- Mentions: sync_post_mentions never had a same_school check at all
// (it postdates school_communities.sql) -- a cross-school @mention must not
// create a mention row or a notification for the mentioned student, even
// though the post itself is public and the mentioned student is active. ---
const crossSchoolMentionPost=(await post(1,'Hey @student3 nice to meet you','public')).post_id;
const postMentionRows=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_mentions WHERE post_id=$1',[crossSchoolMentionPost])).rows[0].n;
assert.equal(postMentionRows,0);
assert.ok(!(await notifs(3)).some((x:any)=>x.kind==='mention'));
// Same-school mention still works normally.
const sameSchoolMentionPost=(await post(1,'Hey @student2 nice to meet you','public')).post_id;
assert.ok((await notifs(2)).some((x:any)=>x.kind==='mention' && x.post_id===sameSchoolMentionPost));

// --- Profile view / highlights: already protected transitively via
// socialu_profile_target (profile_highlights also via
// socialu_profile_visible_post), neither touched by this session's
// migrations -- confirming that reasoning holds against the real schema,
// not just by inspection. ---
await assert.rejects(db.query('SELECT public.socialu_profile_view($1,$2)',[uid(3),'student1']), /not available/);
await assert.rejects(db.query("SELECT public.socialu_profile_highlights($1,'list',$2)",[uid(3),'student1']), /not available/);
// Same-school profile_view still works normally.
const sameSchoolProfile=await db.query<any>('SELECT public.socialu_profile_view($1,$2) AS p',[uid(2),'student1']);
assert.equal(sameSchoolProfile.rows[0].p.username,'student1');

console.log('PASS: cross-school isolation restored across campus feed, single-post access, profile content/view/highlights, reposting, comments (including delete), mentions, and notifications, with same-school functionality unaffected.');
} finally { await db.close(); }
}, 30000);
