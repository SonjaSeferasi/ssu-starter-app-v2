import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Tagging/Mentioning Students (@username), additional functionality not in
// the SRS. Exercises: resolution of @candidates to real students, Friends
// Only authorization gating (the core privacy requirement), self-mention
// skipping, dedup on edit (no duplicate notification when mentions don't
// change), stale-mention removal + notification retraction on edit, and
// stable references surviving a username change.
it('creates, authorizes, dedupes, and cleans up mentions in posts and comments against the real schema', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
// Student 1 and Student 2 are accepted friends; Student 3 is not.
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3)',[uid(1),'send','student2']);
const requestId=(await db.query<any>("SELECT request_id FROM socialu.friend_requests WHERE status='pending' LIMIT 1")).rows[0].request_id;
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4)',[uid(2),'accept','student1',requestId]);

const post=async(n:number,text:string,vis='public')=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(n),text,vis])).rows[0].p;
const editPost=async(n:number,postId:number,text:string)=>(await db.query<any>('SELECT public.socialu_update_post($1,$2,$3) AS p',[uid(n),postId,text])).rows[0].p;
const comment=async(n:number,postId:number,text:string)=>(await db.query<any>('SELECT public.socialu_create_comment($1,$2,$3) AS c',[uid(n),postId,text])).rows[0].c;
const notifs=async(n:number)=>(await db.query<any>('SELECT public.socialu_notifications($1) AS r',[uid(n)])).rows[0].r.notifications as any[];
const mentionKinds=async(n:number)=>(await notifs(n)).filter((x:any)=>x.kind==='mention');

// --- Public post: mentioning a student with no relationship restriction works. ---
const p1=(await post(1,'Hey @student2 and @student3, check this out','public')).post_id;
const p1Mentions=(await db.query<any>("SELECT student_id, matched_username FROM socialu.post_mentions WHERE post_id=$1 ORDER BY student_id",[p1])).rows;
assert.deepEqual(p1Mentions,[{student_id:2,matched_username:'student2'},{student_id:3,matched_username:'student3'}]);
assert.equal((await mentionKinds(2)).length,1);
assert.equal((await mentionKinds(3)).length,1);
assert.equal((await mentionKinds(1)).length,0); // self-mention never happens here, but also: author never notifies themselves

// --- Self-mention is skipped entirely: no row, no notification. ---
const pSelf=(await post(1,'Talking to myself @student1 right now')).post_id;
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_mentions WHERE post_id=$1',[pSelf])).rows[0].n,0);

// --- Friends Only post: mentioning a friend works; mentioning a non-friend is silently skipped (SRS-315.6-style privacy gate). ---
const before3PreFriends=(await mentionKinds(3)).length; // already 1, from the public post p1 above
const pFriends=(await post(1,'Only for @student2, not @student3','friends_only')).post_id;
const friendsMentions=(await db.query<any>('SELECT student_id FROM socialu.post_mentions WHERE post_id=$1',[pFriends])).rows.map((r:any)=>r.student_id);
assert.deepEqual(friendsMentions,[2]); // only the friend got a row
assert.equal((await mentionKinds(3)).length,before3PreFriends); // non-friend got NO new notification from this friends-only post
assert.equal((await mentionKinds(2)).length,2); // the friend now has 2 mention notifications total (p1 + pFriends)

// --- Editing without changing mentions creates no duplicate notification. ---
const before2=(await notifs(2)).length;
await editPost(1,p1,'Hey @student2 and @student3, check this out -- edited wording only');
assert.equal((await notifs(2)).length,before2); // same mentions, no new notification
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_mentions WHERE post_id=$1',[p1])).rows[0].n,2);

// --- Editing to REMOVE a mention deletes the tag row and retracts its notification. ---
const mentionNotifIdsBefore=(await mentionKinds(3)).map((x:any)=>x.post_id);
assert.ok(mentionNotifIdsBefore.includes(p1));
await editPost(1,p1,'Hey @student2 only now, student3 removed');
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_mentions WHERE post_id=$1 AND student_id=3',[p1])).rows[0].n,0);
assert.ok(!(await mentionKinds(3)).some((x:any)=>x.post_id===p1)); // notification retracted

// --- Editing to ADD a new mention creates exactly one new notification. ---
const before4=(await mentionKinds(4)).length;
await editPost(1,p1,'Hey @student2 and now also @student4');
assert.equal((await mentionKinds(4)).length,before4+1);

// --- Comments: mentions work the same way, authorized against the PARENT POST. ---
const publicPost=(await post(1,'Public post for comment mentions')).post_id;
const c1=(await comment(2,publicPost,'Hi @student3, look at this')).comment_id;
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.comment_mentions WHERE comment_id=$1 AND student_id=3',[c1])).rows[0].n,1);
assert.ok((await mentionKinds(3)).some((x:any)=>x.comment_id===c1));

const friendsPost2=(await post(1,'Friends only post 2','friends_only')).post_id;
const before3=(await mentionKinds(3)).length;
await comment(2,friendsPost2,'Hi @student3 -- you should not be able to see this');
assert.equal((await mentionKinds(3)).length,before3); // non-friend never notified about a friends-only comment mention

// --- Current-authorization re-check, not just authorization at mention
// time: socialu_notifications must re-verify access on every read, the
// same way socialu_campus_feed/socialu_friends_feed already do. ---

// If the friendship that authorized a Friends Only mention later ends,
// the notification disappears entirely -- not a dead link, the row
// itself stops being returned.
assert.ok((await mentionKinds(2)).some((x:any)=>x.post_id===pFriends)); // currently visible to the (still) friend
const acceptedRequestId=(await db.query<any>("SELECT request_id FROM socialu.friend_requests WHERE status='accepted' LIMIT 1")).rows[0].request_id;
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4)',[uid(1),'remove','student2',acceptedRequestId]);
assert.ok(!(await mentionKinds(2)).some((x:any)=>x.post_id===pFriends)); // gone the instant the friendship ends

// Blocking the mentioning student also hides the notification -- even for
// a comment mention on a fully PUBLIC post (visibility alone is never
// enough; being blocked always hides it). Student 3's mention notification
// for comment c1 was created by student 2 (the commenter), not post 1's
// author (student 1) -- this specifically proves the actor-level block
// check, independent of the post's own author/visibility.
assert.ok((await mentionKinds(3)).some((x:any)=>x.comment_id===c1)); // currently visible
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3)',[uid(3),'block','student2']);
assert.ok(!(await mentionKinds(3)).some((x:any)=>x.comment_id===c1)); // hidden once student3 blocks the commenter

// --- Stable references survive a username change: the OLD matched_username
// stays frozen in post_mentions (and in the historical text), but the
// notification/tag still resolves to the correct account after rename. ---
await db.query<any>("UPDATE socialu.students SET username='student2_renamed' WHERE student_id=2");
const renamedRow=(await db.query<any>('SELECT student_id, matched_username FROM socialu.post_mentions WHERE post_id=$1 AND student_id=2',[p1])).rows[0];
assert.equal(renamedRow.student_id,2); // identity preserved
assert.equal(renamedRow.matched_username,'student2'); // historical text match frozen, as expected
// A fresh read of the post returns the mentioned student's CURRENT username for linking.
const feed2=(await db.query<any>('SELECT public.socialu_campus_feed($1) AS f',[uid(2)])).rows[0].f as any[];
const p1InFeed=feed2.find((x:any)=>x.post_id===p1);
const mention2=p1InFeed.mentions.find((m:any)=>m.student_id===2);
assert.equal(mention2.username,'student2_renamed'); // current username, not the frozen matched_username

// --- A deactivated student's mentions stop being returned (no longer clickable), without deleting the row. ---
await db.query<any>("UPDATE socialu.students SET is_active=false WHERE student_id=4");
const feed1=(await db.query<any>('SELECT public.socialu_campus_feed($1) AS f',[uid(1)])).rows[0].f as any[];
const p1Again=feed1.find((x:any)=>x.post_id===p1);
assert.ok(!p1Again.mentions.some((m:any)=>m.student_id===4)); // filtered from the response
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_mentions WHERE post_id=$1 AND student_id=4',[p1])).rows[0].n,1); // but the row itself still exists

// --- Cascade: deleting a post removes its mentions and notifications. ---
await db.query<any>('SELECT public.socialu_delete_post($1,$2)',[uid(1),p1]);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_mentions WHERE post_id=$1',[p1])).rows[0].n,0);
assert.ok(!(await mentionKinds(2)).some((x:any)=>x.post_id===p1));

console.log('PASS: mention creation/resolution, Friends Only authorization gating, self-mention skip, edit dedup, stale removal + notification retraction, CURRENT-authorization re-check on every read (unfriending and blocking both hide an existing mention notification), username-change stability, deactivated-account filtering, and cascade on delete -- against the real schema.');
} finally { await db.close(); }
}, 30000);
