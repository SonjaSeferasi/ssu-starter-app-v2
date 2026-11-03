import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// "Customize Your Screen" (additional functionality, not in the official
// SRS -- and NOT SRS-627's Light/Dark appearance mode, which is a
// separate column on the same table owned by a teammate and untouched
// here). Exercises: independent background/header selection, Save
// Changes setting both at once, Reset to Default, persistence across
// reads (same as "survives refresh/sign-in elsewhere" since this is the
// single source of truth read on every page load), invalid theme
// rejection, and that an invalid/unauthenticated caller is rejected the
// same way socialu_require_student already rejects everywhere else.
it('saves and loads independent background/header screen themes, enforcing a safe predefined list', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for (const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261029000200_customize_your_screen.sql','20261029000300_customize_your_screen_header_options.sql']) {
  await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
}

await db.query<any>("INSERT INTO socialu.university(university_id,name) VALUES(2,'Other University')");
await db.query<any>("INSERT INTO socialu.university_domains(domain,university_id) VALUES('otheruni.edu',2)");

const uid=(n:number)=>`00000000-0000-0000-0000-0000000000${n.toString().padStart(2,'0')}`;
const emails=['s1@salemstate.edu','s2@salemstate.edu','s3@otheruni.edu'];
for (let n=1;n<=3;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),emails[n-1]]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,emails[n-1],uid(n)]);
}

const get=async(n:number)=>(await db.query<any>('SELECT public.socialu_get_screen_theme($1) AS r',[uid(n)])).rows[0].r;
const set=async(n:number,bg:string|null,hd:string|null)=>(await db.query<any>('SELECT public.socialu_set_screen_theme($1,$2,$3) AS r',[uid(n),bg,hd])).rows[0].r;

// --- Default state: a student who never customized sees NULL/NULL
// ("Default", today's existing plain look), not an error and not a
// row-not-found surprise. ---
const initial=await get(1);
assert.deepEqual(initial,{background_theme:null,header_theme:null});

// --- Independent selection: background and header are set/changed
// completely independently of each other. ---
let saved=await set(1,'emerald_campus',null);
assert.deepEqual(saved,{background_theme:'emerald_campus',header_theme:null});
saved=await set(1,'emerald_campus','cherry_blossom');
assert.deepEqual(saved,{background_theme:'emerald_campus',header_theme:'cherry_blossom'});
saved=await set(1,'midnight_stars','cherry_blossom'); // change background only, header untouched in VALUE but still re-sent explicitly (Save Changes always sets both)
assert.deepEqual(saved,{background_theme:'midnight_stars',header_theme:'cherry_blossom'});

// --- Persistence: a fresh read reflects exactly what was last saved
// (same path a page-refresh, logout/login, or a different device would
// use -- there is nothing session-local about this, it is the saved row). ---
const reloaded=await get(1);
assert.deepEqual(reloaded,{background_theme:'midnight_stars',header_theme:'cherry_blossom'});

// --- Reset to Default: explicitly setting both back to NULL. ---
const reset=await set(1,null,null);
assert.deepEqual(reset,{background_theme:null,header_theme:null});
assert.deepEqual(await get(1),{background_theme:null,header_theme:null});

// --- Safe predefined list only -- never arbitrary CSS/HTML/URLs. ---
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),'<script>alert(1)</script>',null]), /valid background theme/);
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),null,'https://evil.example/bg.png']), /valid header theme/);
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),'not_a_real_theme',null]), /valid background theme/);

// --- Header-only extras: solid colors and gradients (20261029000300).
// Headers accept all 23 values (9 illustrated + 8 solid + 6 gradient);
// backgrounds stay illustrated-only -- a solid/gradient id is rejected
// for background_theme even though it's a perfectly valid header_theme. ---
let withSolid=await set(1,null,'solid_navy_blue');
assert.deepEqual(withSolid,{background_theme:null,header_theme:'solid_navy_blue'});
let withGradient=await set(1,null,'gradient_midnight');
assert.deepEqual(withGradient,{background_theme:null,header_theme:'gradient_midnight'});
assert.deepEqual(await get(1),{background_theme:null,header_theme:'gradient_midnight'}); // persists after "refresh"
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),'solid_navy_blue',null]), /valid background theme/);
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),null,'solid_not_a_real_color']), /valid header theme/);
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[uid(1),null,'gradient_not_a_real_gradient']), /valid header theme/);
// Reset back to NULL/NULL so the rest of this test's assertions below are unaffected.
await set(1,null,null);

// --- Unauthorized/invalid caller: the same socialu_require_student
// rejection every other RPC in this app already relies on -- a random
// UUID with no linked student row can neither read nor write. ---
const randomAuthId='99999999-9999-9999-9999-999999999999';
await assert.rejects(db.query('SELECT public.socialu_get_screen_theme($1)',[randomAuthId]));
await assert.rejects(db.query('SELECT public.socialu_set_screen_theme($1,$2,$3)',[randomAuthId,'emerald_campus',null]));

// --- Cross-school isolation: structurally guaranteed, not just tested --
// socialu_get_screen_theme only ever reads WHERE student_id = me (the
// caller's own resolved id), with no parameter or code path that could
// address another student's row, same reasoning already documented for
// socialu_whisper_delete. Confirmed here anyway: a different-school
// student (uid 3) setting/reading their own theme never sees or
// disturbs student 1's saved preference set above. ---
await set(3,'ocean_breeze','coquette');
assert.deepEqual(await get(3),{background_theme:'ocean_breeze',header_theme:'coquette'});
assert.deepEqual(await get(1),{background_theme:null,header_theme:null}); // untouched by student 3's own save

// --- Existing feed functionality unaffected: socialu_campus_feed (and
// every other pre-existing RPC) never references background_theme/
// header_theme at all -- confirmed by it still succeeding normally for a
// student who now HAS saved preferences. ---
const feedStillWorks=await db.query<any>('SELECT public.socialu_campus_feed($1) AS f',[uid(1)]);
assert.ok(Array.isArray(feedStillWorks.rows[0].f));

console.log('PASS: Customize Your Screen -- independent background/header selection (including solid colors and gradients, header-only), persistence, Reset to Default, safe predefined theme list (rejects arbitrary values, backgrounds stay illustrated-only), unauthorized-caller rejection, cross-school isolation, and unaffected existing feed functionality -- against the real schema.');
} finally { await db.close(); }
}, 30000);
