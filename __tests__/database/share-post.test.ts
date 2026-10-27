import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Share (additional functionality, not SRS-numbered): socialu_get_post
// powers a direct link to a single post (/posts/:id). Exercises the same
// authorization rule as the feeds (public/friends_only/blocked), that a
// nonexistent post, a deleted post, an unauthorized Friends Only post, and
// a blocked-pair post all produce the IDENTICAL generic error (no
// enumeration), and that the response includes verified mentions.
it('enforces the same visibility/friendship/block authorization for a direct post link, with no enumeration and mentions included', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
// Student 1 and Student 2 are accepted friends; Student 3 and Student 4 are not.
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3)',[uid(1),'send','student2']);
const requestId=(await db.query<any>("SELECT request_id FROM socialu.friend_requests WHERE status='pending' LIMIT 1")).rows[0].request_id;
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4)',[uid(2),'accept','student1',requestId]);

const post=async(n:number,text:string,vis='public')=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(n),text,vis])).rows[0].p;
const getPost=(n:number,postId:number)=>db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(n),postId]);

const publicPost=(await post(1,'Hello @student2, public link test','public')).post_id;
const friendsPost=(await post(1,'Friends only link test','friends_only')).post_id;

// --- Public post: accessible to anyone (author, friend, non-friend), and includes verified mentions. ---
for (const viewer of [1,2,3]) {
  const row=(await getPost(viewer,publicPost)).rows[0].p;
  assert.equal(row.post_id,publicPost);
}
const publicRow=(await getPost(3,publicPost)).rows[0].p;
assert.deepEqual(publicRow.mentions.map((m:any)=>m.student_id),[2]);

// --- Friends Only post: accessible to the author and the accepted friend. ---
const authorView=(await getPost(1,friendsPost)).rows[0].p;
assert.equal(authorView.post_id,friendsPost);
const friendView=(await getPost(2,friendsPost)).rows[0].p;
assert.equal(friendView.post_id,friendsPost);

// --- Friends Only post: a non-friend gets the generic "not available" error. ---
await assert.rejects(getPost(3,friendsPost), /This post isn't available/);

// --- Nonexistent post id gets the IDENTICAL generic error (no enumeration). ---
await assert.rejects(getPost(1,999999), /This post isn't available/);

// --- A blocked pair gets the same generic error, even for a PUBLIC post. ---
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3)',[uid(4),'block','student1']);
await assert.rejects(getPost(4,publicPost), /This post isn't available/);

// --- A deleted post gets the same generic error afterward. ---
await db.query<any>('SELECT public.socialu_delete_post($1,$2)',[uid(1),publicPost]);
await assert.rejects(getPost(2,publicPost), /This post isn't available/);

console.log('PASS: socialu_get_post enforces Public/Friends Only/block authorization identically to the feeds, collapses nonexistent/deleted/unauthorized/blocked into one generic error, and includes verified mentions.');
} finally { await db.close(); }
}, 30000);
