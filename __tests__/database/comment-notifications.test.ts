import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
it('dedupes post_comment/comment_reply when the post author is the reply target, keeps them separate otherwise, resolves the correct recipient through a flattened reply-to-reply, and never self-notifies', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261024000100_unify_notifications.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=3;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const post=async(n:number,text:string)=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(n),text,'public'])).rows[0].p;
const comment=async(n:number,postId:number,text:string,parentId:number|null=null)=>(await db.query<any>('SELECT public.socialu_create_comment($1,$2,$3,$4) AS c',[uid(n),postId,text,parentId])).rows[0].c;
const notifs=async(n:number)=>(await db.query<any>('SELECT public.socialu_notifications($1) AS n',[uid(n)])).rows[0].n.notifications as any[];
const kinds=async(n:number)=>(await notifs(n)).map((x:any)=>x.kind).sort();

// Student 1 posts; student 2 comments (top-level) on it.
const p1=(await post(1,'Post by student 1')).post_id;
const c2=(await comment(2,p1,'Comment by student 2')).comment_id;
assert.deepEqual(await kinds(1),['post_comment']); // post author notified
assert.deepEqual(await kinds(2),[]); // commenter never notifies themselves
assert.deepEqual(await kinds(3),[]);

// --- Different recipients: student 3 replies to student 2's comment.
// Post author (1) and comment author (2) are different people, so BOTH
// get notified -- the post author gets post_comment, the comment author
// gets the more specific comment_reply.
await comment(3,p1,'Reply by student 3',c2);
assert.deepEqual(await kinds(1),['post_comment','post_comment']);
assert.deepEqual(await kinds(2),['comment_reply']);
assert.deepEqual(await kinds(3),[]); // the replier never notifies themselves

// --- Overlapping recipients (the dedup case): student 1 comments on
// their OWN post, then student 3 replies to THAT comment. Student 1 is
// now both the post author and the reply target -- one person, so they
// must get exactly ONE new notification (comment_reply), not two.
const c1=(await comment(1,p1,"Student 1's own comment on their own post")).comment_id;
const before1=(await notifs(1)).length;
await comment(3,p1,'Reply to student 1 own comment',c1);
const after1=await notifs(1);
assert.equal(after1.length,before1+1); // exactly one new notification, not two
assert.equal(after1[0].kind,'comment_reply'); // most recent (list is latest-first) is the specific one
assert.deepEqual(await kinds(3),[]);

// --- Self-reply, asymmetric: student 2 replies to their OWN earlier
// comment (c2) on student 1's post. No comment_reply to self, but the
// post author (student 1, a different person) still gets post_comment --
// this is still "a comment submitted on their post" (SRS-313.1).
const before1b=(await notifs(1)).length; const before2=(await notifs(2)).length;
await comment(2,p1,'Student 2 replying to their own comment',c2);
assert.equal((await notifs(1)).length,before1b+1);
assert.equal((await notifs(1))[0].kind,'post_comment');
assert.equal((await notifs(2)).length,before2); // no comment_reply to self

// --- Full self-action: student 1 replies to their own comment on their
// own post -- post author AND reply target AND actor are all the same
// person, so this generates zero notifications for anyone.
const before1c=(await notifs(1)).length;
await comment(1,p1,'Student 1 replying to their own comment',c1);
assert.equal((await notifs(1)).length,before1c);
assert.deepEqual(await kinds(2),['comment_reply']); // unaffected by the unrelated action above
assert.deepEqual(await kinds(3),[]);

// --- Correct recipient through a flattened reply-to-reply: new post
// owned by student 1. Student 2 comments (top-level); student 3 replies
// to student 2 (now flattened under student 2's comment); student 1
// (the post author) then replies to student 3's REPLY. The comment_reply
// must go to student 3 (who was actually replied to), never to student 2
// (the flattened top-level comment's author) -- and since student 1 is
// both the actor and the post's own author here, no post_comment fires either.
const p2=(await post(1,'Second post')).post_id;
const c2b=(await comment(2,p2,'Top-level by student 2')).comment_id;
const c3b=(await comment(3,p2,'Reply by student 3',c2b)).comment_id;
const before2c=(await notifs(2)).length; const before3=(await notifs(3)).length; const before1d=(await notifs(1)).length;
await comment(1,p2,'Student 1 (post author) replies to student 3 reply',c3b);
assert.equal((await notifs(3)).length,before3+1); // student 3 -- the actual target -- gets the new notification
assert.equal((await notifs(3))[0].kind,'comment_reply');
assert.equal((await notifs(2)).length,before2c); // student 2 (flattened top-level author) gets nothing extra
assert.equal((await notifs(1)).length,before1d); // student 1 is the actor and the post author -- no self-notify

console.log('PASS: comment/reply notification dedup, correct-recipient flattening, and self-notification exclusion against the real schema.');
} finally { await db.close(); }
}, 30000);
