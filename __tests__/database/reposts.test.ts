import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Facebook-style reposting, additional functionality not in the SRS.
// Exercises: creation-time authorization gate, Friends Only original
// forcing the repost's own visibility (and never broadening access to
// it), anti-chaining (repost-of-a-repost flattens to the true original),
// independent likes/comments, caption editing (including captionless),
// original-deleted handling (SET NULL, repost survives with its own
// likes/comments, no leaked content), live re-check on friendship/block
// changes against BOTH the repost's own visibility and the embed, self-
// repost no-notify, and notification privacy re-check after a block.
it('creates reposts with correct visibility forcing, anti-chaining, independent interactions, and live-reauthorized embeds/notifications against the real schema', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

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
const repost=async(n:number,text:string|null,vis:string,origId:number)=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3,$4) AS p',[uid(n),text,vis,origId])).rows[0].p;
const editPost=async(n:number,postId:number,text:string)=>(await db.query<any>('SELECT public.socialu_update_post($1,$2,$3) AS p',[uid(n),postId,text])).rows[0].p;
const notifs=async(n:number)=>(await db.query<any>('SELECT public.socialu_notifications($1) AS r',[uid(n)])).rows[0].r.notifications as any[];
const repostNotifs=async(n:number)=>(await notifs(n)).filter((x:any)=>x.kind==='repost');
const getFeed=async(n:number)=>(await db.query<any>('SELECT public.socialu_campus_feed($1) AS f',[uid(n)])).rows[0].f as any[];

// --- Backward compatibility: a plain 3-arg create_post call still works
// unchanged (every existing caller uses exactly 3 args). ---
const plain=await post(3,'Just a normal post, no repost');
assert.equal(plain.is_repost,false);
assert.equal(plain.repost_of,null);

// --- Public original: student 2 reposts it publicly with a caption. ---
const original=(await post(1,'Check this out','public')).post_id;
const rp1=await repost(2,'Adding my own thoughts','public',original);
assert.equal(rp1.is_repost,true);
assert.equal(rp1.repost_of.post_id,original);
assert.equal(rp1.repost_of.text_content,'Check this out');
assert.equal(rp1.text_content,'Adding my own thoughts');

// --- Captionless repost is valid (no "text or photo" rejection). ---
const rp2=await repost(3,null,'public',original);
assert.equal(rp2.text_content,null);
assert.equal(rp2.is_repost,true);

// --- Friends Only original: the repost's own visibility is FORCED to
// friends_only, even though "public" was requested -- never trusts the client. ---
const friendsOriginal=(await post(1,'Friends only original','friends_only')).post_id;
const rp3=await repost(2,'sharing with my own friends','public',friendsOriginal);
assert.equal(rp3.visibility,'friends_only');

// --- No broadening: student 4 is a friend of the REPOSTER (student 2)
// but NOT a friend of the original author (student 1). Forcing the
// repost to friends_only does not, by itself, guarantee student 4 can't
// see it -- that's gated on student 4 being friends with student 2, which
// is true here. The point being verified is that even though student 4
// CAN see the repost shell (student 2's own friends_only post), the
// embedded original is independently re-checked against student 4's
// relationship to student 1 and comes back null -- reposting never
// grants a wider audience access to the ORIGINAL's content than they
// already had. ---
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3)',[uid(2),'send','student4']);
const req24=(await db.query<any>("SELECT request_id FROM socialu.friend_requests WHERE sender_id=(SELECT student_id FROM socialu.students WHERE username='student2') AND recipient_id=(SELECT student_id FROM socialu.students WHERE username='student4') AND status='pending'")).rows[0].request_id;
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4)',[uid(4),'accept','student2',req24]);
const rp3ForStudent4=(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(4),rp3.post_id])).rows[0].p;
assert.equal(rp3ForStudent4.is_repost,true);
assert.equal(rp3ForStudent4.text_content,'sharing with my own friends'); // the repost shell is visible
assert.equal(rp3ForStudent4.repost_of,null); // but the friends-only original is NOT -- no broadened access

// --- Anti-chaining: reposting a repost flattens to the TRUE original. ---
const rp4=await repost(3,'reposting a repost',"public",rp1.post_id);
assert.equal(rp4.repost_of.post_id,original); // not rp1.post_id -- flattened

// --- Cannot repost something you're not authorized to view: student 3 is
// not friends with student 1, so reposting the friends-only original fails. ---
await assert.rejects(db.query('SELECT public.socialu_create_post($1,$2,$3,$4)',[uid(3),'sneaky','friends_only',friendsOriginal]), /This post isn't available/);

// --- Independent likes/comments: liking/commenting on the repost never
// touches the original's own counts. ---
await db.query('SELECT public.socialu_like_post($1,$2)',[uid(3),rp1.post_id]);
await db.query('SELECT public.socialu_create_comment($1,$2,$3)',[uid(3),rp1.post_id,'Nice share!']);
const feedForOwner=await getFeed(1);
const originalInFeed=feedForOwner.find((p:any)=>p.post_id===original);
assert.equal(originalInFeed.like_count,0);
assert.equal(originalInFeed.comment_count,0);
const feedForStudent3=await getFeed(3);
const repostInFeed=feedForStudent3.find((p:any)=>p.post_id===rp1.post_id);
assert.equal(repostInFeed.like_count,1);
assert.equal(repostInFeed.comment_count,1);

// --- Editing a repost's caption works (reuses socialu_update_post
// unchanged); the embedded original is untouched; editing down to
// captionless remains valid. ---
const edited=await editPost(2,rp1.post_id,'Updated caption');
assert.equal(edited.text_content,'Updated caption');
assert.equal(edited.repost_of.post_id,original);
assert.equal(edited.repost_of.text_content,'Check this out'); // original unchanged
const editedBlank=await editPost(2,rp1.post_id,'   ');
assert.equal(editedBlank.text_content,null); // still valid -- repost_of_post_id satisfies check_post_content
// Restore a real caption before the delete-original section below, so
// that scenario actually exercises "survives WITH a caption" rather than
// the (separately tested) captionless-cleanup case.
await editPost(2,rp1.post_id,'Keeping this caption');

// --- Repost notification: the original author gets notified, with a
// stable reference to the REPOST itself (clicking it opens the repost). ---
assert.ok((await repostNotifs(1)).some((x:any)=>x.post_id===rp1.post_id));
// Self-repost never notifies.
const ownRepost=await repost(1,'reposting my own post','public',original);
assert.ok(!(await repostNotifs(1)).some((x:any)=>x.post_id===ownRepost.post_id));

// --- Deleting the original: repost_of_post_id is SET NULL for every
// repost of it (captioned or not), but each repost's row survives --
// is_repost is a persisted flag independent of the live FK, so a
// captionless/photoless repost is NOT rejected by the content trigger
// once its embed is gone, and keeps its own likes/comments instead of
// being deleted. ---
await db.query('SELECT public.socialu_delete_post($1,$2)',[uid(1),original]);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.posts WHERE post_id=$1',[rp2.post_id])).rows[0].n,1); // rp2 still exists
const rp2AfterDelete=(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(3),rp2.post_id])).rows[0].p;
assert.equal(rp2AfterDelete.is_repost,true); // still structurally a repost
assert.equal(rp2AfterDelete.repost_of,null); // "Original post unavailable"
assert.equal(rp2AfterDelete.text_content,null); // captionless -- still valid, not rejected
const afterDelete=(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(2),rp1.post_id])).rows[0].p;
assert.equal(afterDelete.is_repost,true); // repost_of_post_id is now NULL, but is_repost stays true
assert.equal(afterDelete.repost_of,null);
assert.equal(afterDelete.text_content,'Keeping this caption'); // caption preserved
// Likes/comments placed earlier on rp1 (student 3's like + comment)
// also survive the original's deletion untouched.
const rp1AfterDelete=(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(2),rp1.post_id])).rows[0].p;
assert.equal(rp1AfterDelete.like_count,1);
assert.equal(rp1AfterDelete.comment_count,1);
// The repost-of-the-original-deleted repost notification still survives
// (it references the repost's own post_id, which still exists).
assert.ok((await repostNotifs(1)).some((x:any)=>x.post_id===rp1.post_id));

// --- Live re-check: if the friendship that authorized viewing a Friends
// Only original later ends, the embed disappears from a DIFFERENT
// repost's response too, without deleting any row. This also ends the
// SAME friendship that authorizes rp3's own (forced) friends_only
// visibility for student 1, so it doubles as the "unfriending" half of
// requirement 3 below -- re-checked independently of the embed re-check. ---
const friendsOriginal2=(await post(1,'Another friends-only original','friends_only')).post_id;
const rp5=await repost(2,'sharing','friends_only',friendsOriginal2);
let rp5Read=(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(2),rp5.post_id])).rows[0].p;
assert.equal(rp5Read.repost_of.post_id,friendsOriginal2); // visible while still friends
const student1FriendsFeedBefore=(await db.query<any>('SELECT public.socialu_friends_feed($1) AS f',[uid(1)])).rows[0].f as any[];
assert.ok(student1FriendsFeedBefore.some((p:any)=>p.post_id===rp3.post_id)); // rp3 visible to student 1 while friends with student 2
const acceptedRequestId=(await db.query<any>(
  "SELECT request_id FROM socialu.friend_requests WHERE status='accepted' AND least(sender_id,recipient_id)=least((SELECT student_id FROM socialu.students WHERE username='student1'),(SELECT student_id FROM socialu.students WHERE username='student2')) AND greatest(sender_id,recipient_id)=greatest((SELECT student_id FROM socialu.students WHERE username='student1'),(SELECT student_id FROM socialu.students WHERE username='student2'))"
)).rows[0].request_id;
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4)',[uid(1),'remove','student2',acceptedRequestId]);
rp5Read=(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(2),rp5.post_id])).rows[0].p;
assert.equal(rp5Read.repost_of,null); // "Original post unavailable" -- no leaked content, row untouched
assert.equal(rp5Read.is_repost,true); // still structurally a repost, just can't show it
// Requirement 3 (unfriending half): rp3's OWN visibility (forced
// friends_only at creation) is re-checked live too -- now that student 1
// and student 2 are no longer friends, rp3 drops out of student 1's
// friends feed entirely, independent of the embed check above.
const student1FriendsFeedAfter=(await db.query<any>('SELECT public.socialu_friends_feed($1) AS f',[uid(1)])).rows[0].f as any[];
assert.ok(!student1FriendsFeedAfter.some((p:any)=>p.post_id===rp3.post_id));

// --- Requirement 3 (blocking half): the original author cannot see a
// repost notification, nor access the repost itself, once they block the
// reposter -- re-checked live, not trusted from creation time. ---
const publicOriginal2=(await post(1,'Another public original')).post_id;
const rp6=await repost(4,'reposting a stranger\'s public post','public',publicOriginal2);
assert.ok((await repostNotifs(1)).some((x:any)=>x.post_id===rp6.post_id)); // notified before the block
const rp6BeforeBlock=(await db.query<any>('SELECT public.socialu_get_post($1,$2) AS p',[uid(1),rp6.post_id])).rows[0].p;
assert.equal(rp6BeforeBlock.post_id,rp6.post_id); // accessible before the block
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3)',[uid(1),'block','student4']);
assert.ok(!(await repostNotifs(1)).some((x:any)=>x.post_id===rp6.post_id)); // notification gone after blocking the reposter
await assert.rejects(db.query('SELECT public.socialu_get_post($1,$2)',[uid(1),rp6.post_id]), /This post isn't available/); // repost itself inaccessible too

console.log('PASS: repost creation/authorization, Friends Only visibility forcing (and no broadened access to the original), anti-chaining, independent likes/comments, caption editing (including captionless), original deletion (repost survives with its own likes/comments, no leaked content), live re-authorization of both the repost\'s own visibility and its embed, self-repost no-notify, and notification/access privacy after blocking -- against the real schema.');
} finally { await db.close(); }
}, 30000);
