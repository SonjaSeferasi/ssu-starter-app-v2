import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Product decision (not SRS-numbered either way -- neither SRS-303 nor
// SRS-304 requires text to accompany a photo): students may publish a
// photo-only post. schema.sql's existing check_post_content constraint
// trigger is the single source of truth for "text or at least one photo"
// -- this migration only stops it firing on a fresh posts INSERT (so a
// post can start blank for the moment between creation and its photo
// attaching, since those are two separate calls), while leaving it fully
// enforced on every UPDATE to posts.text_content and on every
// post_photos insert/delete, so a post can never be edited DOWN to empty.
it('allows a photo-only post to be created in two steps, but never edited down to completely empty', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261016000100_like_post.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261021000100_comment_replies.sql','20261024000300_optional_post_text.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(1),'s1@salemstate.edu']);
await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',['Student 1','student1','s1@salemstate.edu',uid(1)]);

// --- A blank-text post is created successfully; text_content is NULL, not ''. ---
const created=(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(1),'   ','public'])).rows[0].p;
const postId=created.post_id;
assert.equal(created.text_content,null);

// --- Attach a photo (same two-step flow the real composer uses). ---
const asset=(await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,'post_photo/1/x.jpg','post_photo','image/jpeg',100) RETURNING asset_id")).rows[0].asset_id;
await db.query('INSERT INTO socialu.post_photos(post_id,asset_id) VALUES($1,$2)',[postId,asset]);
await db.query('SET CONSTRAINTS ALL IMMEDIATE');

// --- Editing with blank text succeeds because the post already has a photo. ---
const edited=(await db.query<any>('SELECT public.socialu_update_post($1,$2,$3) AS p',[uid(1),postId,'  '])).rows[0].p;
assert.equal(edited.text_content,null);
assert.equal(edited.photos.length,1);

// --- Removing that one photo, with text still blank, is rejected --
// the post_photos DELETE trigger catches it, not socialu_update_post. ---
await assert.rejects(
  db.query('SELECT public.socialu_remove_post_photo($1,$2,$3)',[uid(1),postId,asset]),
  /A published post must contain text or a photo/
);

// --- A second, text-only post: blank text is rejected on EDIT (an UPDATE
// to an existing post), since the posts trigger still fires there. ---
const textPost=(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(1),'Hello','public'])).rows[0].p;
await assert.rejects(
  db.query('SELECT public.socialu_update_post($1,$2,$3)',[uid(1),textPost.post_id,'   ']),
  /A published post must contain text or a photo/
);
// But providing real text still works, as before.
const stillHasText=(await db.query<any>('SELECT public.socialu_update_post($1,$2,$3) AS p',[uid(1),textPost.post_id,'Updated'])).rows[0].p;
assert.equal(stillHasText.text_content,'Updated');

// --- A brand new post with BOTH blank text and never any photo attached
// just sits inertly -- never rejected (INSERT no longer triggers the
// check), consistent with the "published but photo attach failed" risk
// class this app already accepts; it's just never visible as useful
// content and the client (PostComposer.tsx) is what actually prevents
// publishing with neither text nor a photo in the first place. ---
const orphan=(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(1),'','public'])).rows[0].p;
assert.equal(orphan.text_content,null);
assert.equal(orphan.photos.length,0);

console.log('PASS: photo-only post creation (two-step flow), edit-with-blank-text allowed only when a photo remains, and the never-edited-down-to-empty invariant against the real schema.');
} finally { await db.close(); }
}, 30000);
