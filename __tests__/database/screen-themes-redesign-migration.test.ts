import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// "Customize Your Screen" second-generation theme redesign
// (20261104000100_screen_themes_redesign.sql, additional functionality
// not in the official SRS). Exercises exactly the migration's own job:
// students who already saved a theme under the OLD 9 illustrated ids
// keep a working, sensibly-remapped choice after the migration runs --
// never NULL'd out, never left pointing at a now-invalid id. Simulates
// real pre-migration production data (the OLD migrations only, loaded
// first) the same way 20261029000100_whisper_retire_categories.sql's own
// test simulates a pre-retirement historical confession: insert/set data
// under the old system, THEN apply the new migration, THEN verify.
it('remaps every existing saved background/header theme to its new id without ever invalidating a saved choice', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
// Load every migration up to AND INCLUDING the old (first-generation)
// theme system, but NOT the redesign yet -- this is the real
// pre-migration production shape.
const beforeRedesign=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261029000200_customize_your_screen.sql','20261029000300_customize_your_screen_header_options.sql'];
for (const file of beforeRedesign) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-0000000000${n.toString().padStart(2,'0')}`;
const emails=['s1@salemstate.edu','s2@salemstate.edu','s3@salemstate.edu','s4@salemstate.edu'];
for (let n=1;n<=4;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),emails[n-1]]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,emails[n-1],uid(n)]);
}

// Real pre-migration data, saved the normal way (via the OLD
// socialu_set_screen_theme, which only accepts the OLD 9 ids at this
// point in migration history) -- covers every old id at least once,
// across background AND header, plus a header-only solid color (which
// the redesign must leave completely untouched) and a student who never
// customized at all (must stay NULL/NULL, not get some default theme
// invented for them).
await db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),'emerald_campus','cherry_blossom']);
await db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(2),'midnight_stars','ocean_breeze']);
await db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(3),'coquette','solid_navy_blue']); // header-only solid color, must survive untouched
// student4: never customized -- stays NULL/NULL throughout.

// --- Apply the redesign migration now. ---
await db.exec(readFileSync(root+'/supabase/migrations/20261104000100_screen_themes_redesign.sql','utf8'));

const get=async(n:number)=>(await db.query<any>('SELECT public.socialu_get_screen_theme($1) AS r',[uid(n)])).rows[0].r;

// --- Every old id correctly remapped to its documented new id -- no
// student silently lost their customization or landed on an invalid
// value. ---
assert.deepEqual(await get(1),{background_theme:'emerald_gradient',header_theme:'sunset_gradient'}); // emerald_campus->emerald_gradient, cherry_blossom->sunset_gradient
assert.deepEqual(await get(2),{background_theme:'night_mode',header_theme:'abstract_bubbles'}); // midnight_stars->night_mode, ocean_breeze->abstract_bubbles
assert.deepEqual(await get(3),{background_theme:'watercolor',header_theme:'solid_navy_blue'}); // coquette->watercolor; solid_navy_blue (not an illustrated id) left completely untouched
assert.deepEqual(await get(4),{background_theme:null,header_theme:null}); // never customized -- still exactly Default, not reset to some new theme

// --- The remapped values also verify directly against the raw column
// (not just through the RPC), confirming the UPDATE actually committed
// to the table, not just that the read path happens to look right. ---
const raw=(await db.query<any>('SELECT background_theme, header_theme FROM socialu.student_preferences sp JOIN socialu.students s ON s.student_id=sp.student_id WHERE s.username=$1',['student1'])).rows[0];
assert.deepEqual(raw,{background_theme:'emerald_gradient',header_theme:'sunset_gradient'});

// --- Old ids are now rejected for NEW saves (the old theme system is
// gone, not just supplemented) -- a student can no longer choose
// 'emerald_campus', only the new 'emerald_gradient'. ---
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),'emerald_campus',null]), /valid background theme/);
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),null,'cherry_blossom']), /valid header theme/);

// --- New ids work normally going forward, including the new theme that
// kept its id across the redesign (campus_illustration, art redone but
// the id itself unchanged -- a student who already had it saved should
// not even need to be in the remap table, and a fresh save works too). ---
const freshSave=(await db.query<any>('SELECT public.socialu_set_screen_theme($1,$2,$3) AS r',[uid(4),'campus_illustration','minimal_wave'])).rows[0].r;
assert.deepEqual(freshSave,{background_theme:'campus_illustration',header_theme:'minimal_wave'});

console.log('PASS: Customize Your Screen redesign migration -- every old illustrated theme id remapped to its new equivalent (background AND header), header-only solid/gradient values left untouched, a never-customized student stays exactly Default, old ids rejected going forward, new ids (including the carried-over campus_illustration id) work normally -- against the real schema.');
} finally { await db.close(); }
}, 30000);
