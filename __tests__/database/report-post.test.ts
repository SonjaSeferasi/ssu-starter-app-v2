import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
it('deletes a post only once 5 DISTINCT students have reported it, ignores duplicate/self reports, enforces Friends Only, stores the reason, and cascades comments/likes/reports/media on deletion without touching an unrelated post', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=7;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const post=async(n:number,text:string,vis='public')=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(n),text,vis])).rows[0].p;
const report=async(n:number,postId:number,reason='spam')=>(await db.query<any>('SELECT public.socialu_report_post($1,$2,$3) AS r',[uid(n),postId,reason])).rows[0].r;
const exists=async(postId:number)=>(await db.query<any>('SELECT EXISTS(SELECT 1 FROM socialu.posts WHERE post_id=$1) AS e',[postId])).rows[0].e as boolean;
const reportRows=async(postId:number)=>(await db.query<any>('SELECT reporter_id::int AS reporter_id, reason FROM socialu.post_reports WHERE post_id=$1 ORDER BY report_id',[postId])).rows;

// --- Self-report blocked ---
const p1=(await post(1,'Reported post')).post_id;
await assert.rejects(report(1,p1,'spam'));

// --- Friends Only: a non-friend cannot report an inaccessible post ---
const pfo=(await post(1,'Friends only post','friends_only')).post_id;
await assert.rejects(report(7,pfo,'spam'));

// --- Duplicate reports from the same student never count twice ---
let r=await report(2,p1,'spam'); assert.equal(r.reported,true); assert.equal(r.post_removed,false);
r=await report(2,p1,'spam'); assert.equal(r.reported,false); assert.equal(r.post_removed,false); // same student again -- no-op
assert.equal((await reportRows(p1)).length,1);

// --- 3 more distinct reporters (4 total) -- still under the threshold ---
await report(3,p1,'harassment'); await report(4,p1,'inappropriate'); await report(5,p1,'other');
assert.equal((await reportRows(p1)).length,4);
assert.equal(await exists(p1),true);

// Attach a comment, a like, and a photo asset to this post before the 5th
// report, to prove they all cascade away correctly -- and seed an
// UNRELATED post with its own comment/like to prove it's left untouched.
const commentId=(await db.query<any>("SELECT public.socialu_create_comment($1,$2,$3) AS c",[uid(2),p1,'A comment on the soon-to-be-deleted post'])).rows[0].c.comment_id;
await db.query('INSERT INTO socialu.post_likes(post_id,student_id) VALUES($1,2)',[p1]);
const asset=(await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,'post_photo/1/x.jpg','post_photo','image/jpeg',100) RETURNING asset_id")).rows[0].asset_id;
await db.query('INSERT INTO socialu.post_photos(post_id,asset_id) VALUES($1,$2)',[p1,asset]);
await db.query('SET CONSTRAINTS ALL IMMEDIATE'); // same deferred-trigger gotcha documented elsewhere for posts/post_photos

const other=(await post(1,'An unrelated post that must survive untouched')).post_id;
await db.query("INSERT INTO socialu.post_comments(post_id,author_id,text_content) VALUES($1,2,'Unrelated comment')",[other]);
await db.query('INSERT INTO socialu.post_likes(post_id,student_id) VALUES($1,2)',[other]);

// --- The 5th DISTINCT reporter triggers deletion ---
r=await report(6,p1,'spam');
assert.equal(r.reported,true); assert.equal(r.post_removed,true);
assert.equal(await exists(p1),false);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_comments WHERE comment_id=$1',[commentId])).rows[0].n,0);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_likes WHERE post_id=$1',[p1])).rows[0].n,0);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_reports WHERE post_id=$1',[p1])).rows[0].n,0);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.media_assets WHERE asset_id=$1',[asset])).rows[0].n,0); // media_asset_cleanup trigger fired

// --- The unrelated post is completely untouched ---
assert.equal(await exists(other),true);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_comments WHERE post_id=$1',[other])).rows[0].n,1);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_likes WHERE post_id=$1',[other])).rows[0].n,1);

// --- Regression, found and fixed during review before this was ever
// applied: media_asset_cleanup fires on EVERY post_photos delete, not
// just the report-triggered one -- including the deletes
// socialu_remove_post_photo and socialu_delete_post already perform. Both
// used to read a photo's storage_key AFTER deleting its post_photos row,
// which would now race against the trigger and come back NULL/empty.
// Both were reordered to capture storage_keys first -- these two checks
// prove that actually holds, not just that it compiles.
const removeAsset=(await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,'post_photo/1/remove.jpg','post_photo','image/jpeg',100) RETURNING asset_id")).rows[0].asset_id;
const removePost=(await post(1,'Post for single-photo removal regression check')).post_id;
await db.query('INSERT INTO socialu.post_photos(post_id,asset_id) VALUES($1,$2)',[removePost,removeAsset]);
await db.query('SET CONSTRAINTS ALL IMMEDIATE');
const removedKey=(await db.query<any>('SELECT public.socialu_remove_post_photo($1,$2,$3) AS k',[uid(1),removePost,removeAsset])).rows[0].k;
assert.equal(removedKey,'post_photo/1/remove.jpg'); // not null/empty -- the race is fixed
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.media_assets WHERE asset_id=$1',[removeAsset])).rows[0].n,0);

const deleteAsset=(await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,'post_photo/1/delete.jpg','post_photo','image/jpeg',100) RETURNING asset_id")).rows[0].asset_id;
const deletePost=(await post(1,'Post for whole-post-delete regression check')).post_id;
await db.query('INSERT INTO socialu.post_photos(post_id,asset_id) VALUES($1,$2)',[deletePost,deleteAsset]);
await db.query('SET CONSTRAINTS ALL IMMEDIATE');
const deletedKeys=(await db.query<any>('SELECT public.socialu_delete_post($1,$2) AS k',[uid(1),deletePost])).rows[0].k;
assert.deepEqual(deletedKeys,['post_photo/1/delete.jpg']); // not an empty array -- the race is fixed
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.media_assets WHERE asset_id=$1',[deleteAsset])).rows[0].n,0);

// --- The reason is actually persisted ---
const p2=(await post(1,'Second post for reason check')).post_id;
await report(3,p2,'harassment');
assert.equal((await reportRows(p2))[0].reason,'harassment');

console.log('PASS: 5-distinct-reporter threshold, duplicate/self-report rejection, Friends Only enforcement, reason storage, and full cascade (comments/likes/reports/media) against the real schema, with an unrelated post left untouched.');
} finally { await db.close(); }
}, 30000);
