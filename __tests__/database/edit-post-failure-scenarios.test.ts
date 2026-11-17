import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Investigation for GitHub #1210, item 5 of the follow-up verification
// request: "test failure scenarios, especially what happens when photo
// deletion fails after the text update succeeds." This is a server/API
// contract question (what state does the database end up in), not a UI
// question, so it's tested here directly against socialu_remove_post_photo
// rather than requiring a browser.
//
// FINDING: socialu_remove_post_photo itself is atomic and safe to retry --
// it either raises (ownership/not-found) with NOTHING changed, or fully
// deletes the post_photos row. There is no partial state WITHIN the RPC.
//
// The real remaining inconsistency (confirmed by reading
// app/api/posts/[postId]/photos/[assetId]/route.ts, not by executing
// Supabase Storage, which PGlite cannot simulate) is in the ROUTE, not the
// RPC: the route calls accountClient().storage.from('media').remove(...)
// AFTER socialu_remove_post_photo has already committed the DB deletion.
// If that storage call throws (a real possibility -- network error to
// Supabase Storage), the route's try/catch returns an error response to
// the client -- but the DB-level removal already happened and is NOT
// rolled back (the route's own comment confirms this is intentional: "A
// failed storage delete doesn't roll back the DB change -- the link is
// already gone... an orphaned file at worst wastes storage"). From
// EditPostModal's point of view, this one photo both "failed" (per the
// HTTP response) and "succeeded" (per the actual database) at the same
// time. Combined with EditPostModal's removal loop, which THROWS and
// stops at the first failed DELETE call, this means: if a student removes
// 3 photos and the 2nd one hits this exact race, photo 1 is removed
// (its own request fully succeeded), photo 2 is ALSO removed at the DB
// layer (despite the error the student sees), and photo 3 is NEVER EVEN
// ATTEMPTED (the loop stopped) -- so two different kinds of "partially
// done" compound: the student sees one error message, believes nothing
// after photo 1 happened, and has no way to know photo 2 is actually
// already gone while photo 3 is not.
//
// This test demonstrates the RPC-level half directly (safe to retry on a
// genuine RPC failure) and documents the route-level half, which cannot
// be executed without live Supabase Storage.
it('socialu_remove_post_photo is atomic and safe to retry on a genuine RPC-level failure (ownership/not-found)', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261016000100_like_post.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261021000100_comment_replies.sql','20261023000100_report_post.sql','20261024000300_optional_post_text.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=2;n++) {
  await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
  await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}

const post=(await db.query<any>("SELECT public.socialu_create_post($1,'Two photos',$2) AS p",[uid(1),'public'])).rows[0].p;
const postId=post.post_id;
const asset=async(key:string)=>(await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,$1,'post_photo','image/jpeg',100) RETURNING asset_id",[key])).rows[0].asset_id;
const attach=async(assetId:number)=>db.query('INSERT INTO socialu.post_photos(post_id,asset_id) VALUES($1,$2)',[postId,assetId]);

const asset1=await asset('post_photo/1/a.jpg');
const asset2=await asset('post_photo/1/b.jpg');
await attach(asset1);
await attach(asset2);

// Text update ("succeeds") happens first, matching the fixed ordering.
await db.query('SELECT public.socialu_update_post($1,$2,$3)',[uid(1),postId,'Updated text']);

// Removing a photo that genuinely isn't on this post (simulates a
// not-found/ownership-style RPC failure) raises cleanly...
const foreignAsset=await asset('post_photo/2/foreign.jpg'); // never attached to postId
await assert.rejects(
  db.query('SELECT public.socialu_remove_post_photo($1,$2,$3)',[uid(1),postId,foreignAsset]),
  /Photo not found on this post/
);

// ...and crucially, NOTHING changed: both real photos are still there,
// confirming it's genuinely safe to just retry the whole removal step.
const photosAfterFailedAttempt=(await db.query<any>('SELECT asset_id FROM socialu.post_photos WHERE post_id=$1 ORDER BY asset_id',[postId])).rows;
assert.deepEqual(photosAfterFailedAttempt.map((r:any)=>r.asset_id), [asset1, asset2]);

// Now remove the two REAL photos one at a time, exactly as
// EditPostModal's loop does. Each individual call is atomic and
// successful -- this confirms the RPC itself never leaves a half-deleted
// row, so the "two kinds of partial state compounding" risk documented
// above is entirely in the route's storage-cleanup step, not here.
await db.query('SELECT public.socialu_remove_post_photo($1,$2,$3)',[uid(1),postId,asset1]);
const afterFirstRemoval=(await db.query<any>('SELECT asset_id FROM socialu.post_photos WHERE post_id=$1',[postId])).rows;
assert.deepEqual(afterFirstRemoval.map((r:any)=>r.asset_id), [asset2]); // asset1 gone, asset2 still present
await db.query('SELECT public.socialu_remove_post_photo($1,$2,$3)',[uid(1),postId,asset2]);
const afterSecondRemoval=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.post_photos WHERE post_id=$1',[postId])).rows[0].n;
assert.equal(afterSecondRemoval, 0);

console.log('PASS (investigation, not a pre/post-fix regression test): socialu_remove_post_photo is atomic at the RPC level -- a genuine RPC failure (not-found/ownership) leaves nothing changed, safe to retry. The remaining #1210 inconsistency lives in the API route\'s post-RPC storage.remove() call, which cannot be executed without live Supabase Storage -- documented above from reading the route\'s own code and its own comment admitting the DB change is not rolled back on a storage failure.');
} finally { await db.close(); }
}, 30000);
