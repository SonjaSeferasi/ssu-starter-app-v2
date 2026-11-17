import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// Regression test for GitHub #1209 (Customize Your Screen, additional
// functionality): a genuine partial save (only one of background/header
// theme sent, the other omitted as SQL NULL) must leave the OTHER theme
// untouched, not silently clear it to Default. The existing test file
// (customize-your-screen.test.ts) always passes both values together, so
// this specific path was never covered -- confirmed directly in the bug
// report.
it('leaves the other saved theme untouched on a genuine partial save (only one of background/header sent)', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for (const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261029000200_customize_your_screen.sql','20261029000300_customize_your_screen_header_options.sql','20261104000100_screen_themes_redesign.sql','20261112140000_screen_theme_partial_update_fix.sql']) {
  await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
}

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(1),'s1@salemstate.edu']);
await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',['Student 1','student1','s1@salemstate.edu',uid(1)]);

const get=async()=>(await db.query<any>('SELECT public.socialu_get_screen_theme($1) AS r',[uid(1)])).rows[0].r;
const set=async(bg:string|null,hd:string|null)=>(await db.query<any>('SELECT public.socialu_set_screen_theme($1,$2,$3) AS r',[uid(1),bg,hd])).rows[0].r;

// Save both.
await set('night_mode','solid_navy_blue');
assert.deepEqual(await get(), {background_theme:'night_mode', header_theme:'solid_navy_blue'});

// Partial save: background only. header_theme must survive untouched --
// this is the exact scenario from the bug report's own QA-2 reproduction.
const afterPartial=await set('watercolor', null);
assert.deepEqual(afterPartial, {background_theme:'watercolor', header_theme:'solid_navy_blue'});
assert.deepEqual(await get(), {background_theme:'watercolor', header_theme:'solid_navy_blue'});

// Partial save the other direction: header only. background must survive.
const afterPartial2=await set(null, 'solid_burgundy');
assert.deepEqual(afterPartial2, {background_theme:'watercolor', header_theme:'solid_burgundy'});
assert.deepEqual(await get(), {background_theme:'watercolor', header_theme:'solid_burgundy'});

console.log('PASS: a partial screen-theme save (only one of background/header sent) leaves the other theme untouched, for both directions, and the RPC\'s own return value reflects the true merged state.');
} finally { await db.close(); }
}, 30000);
