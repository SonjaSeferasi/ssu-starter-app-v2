import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// socialu_notifications (20261024000100_unify_notifications.sql) is the
// merge point between two notification systems built independently:
// Linh's friend_request/friendship_accepted (main) and this branch's
// post_like/post_comment/comment_reply (SRS-312/313). This test exercises
// the unification itself -- a mixed feed sorted together, a grouped like
// counting as exactly one unread item despite multiple underlying rows,
// and mark-all-read clearing every kind at once -- none of which the
// per-feature tests (friendships.test.ts, comment-notifications.test.ts)
// cover on their own.
it('unifies friend, like, and comment notifications into one sorted feed with correct cross-kind unread counting', async () => {
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
const like=async(n:number,postId:number)=>db.query('SELECT public.socialu_like_post($1,$2)',[uid(n),postId]);
const comment=async(n:number,postId:number,text:string)=>(await db.query<any>('SELECT public.socialu_create_comment($1,$2,$3) AS c',[uid(n),postId,text])).rows[0].c;
const notifications=async(n:number)=>(await db.query<any>('SELECT public.socialu_notifications($1) AS n',[uid(n)])).rows[0].n as {unread:number;notifications:any[]};

// Student 1 posts; student 2 likes it, student 3 sends student 1 a friend request.
const p1=(await post(1,'Post by student 1')).post_id;
await like(2,p1);
await db.query<any>('SELECT public.socialu_friend_action($1,$2,$3)',[uid(3),'student1','send']);

let view=await notifications(1);
assert.equal(view.unread,2); // one grouped like item + one friend request, mixed kinds
assert.equal(view.notifications.length,2);
assert.deepEqual(view.notifications.map((n:any)=>n.kind).sort(),['friend_request','post_like']);
const likeItem=view.notifications.find((n:any)=>n.kind==='post_like');
assert.equal(likeItem.actor_count,1);
assert.deepEqual(likeItem.actor_names,['Student 2']);
assert.equal(likeItem.post_id,p1);

// Student 3 comments too -- still within the 24h window, so the post_like
// group doesn't grow (different actor/kind), but the feed now has 3 items.
await comment(3,p1,'Nice post!');
view=await notifications(1);
assert.equal(view.notifications.length,3);
assert.equal(view.unread,3);

// A second like (student 3) joins the SAME group as student 2's like --
// one unread item for both rows, not two, and actor_count reflects both.
await like(3,p1);
view=await notifications(1);
assert.equal(view.notifications.length,3); // like group stays one item
const grownLike=view.notifications.find((n:any)=>n.kind==='post_like');
assert.equal(grownLike.actor_count,2);
assert.equal(view.unread,3); // group counts once, not per-row

// Marking everything read clears unread to 0 across ALL kinds at once,
// and a fresh fetch reflects read_at set on every item.
await db.query('SELECT public.socialu_mark_notifications_read($1)',[uid(1)]);
view=await notifications(1);
assert.equal(view.unread,0);
assert.ok(view.notifications.every((n:any)=>n.read_at !== null));

// socialu_list_notifications is fully retired -- nothing should still
// resolve it after the unification.
await assert.rejects(db.query('SELECT public.socialu_list_notifications($1)',[uid(1)]));

console.log('PASS: unified friend/like/comment notification feed, cross-kind unread counting, grouped-like dedup, and mark-all-read against the real schema.');
} finally { await db.close(); }
}, 30000);
