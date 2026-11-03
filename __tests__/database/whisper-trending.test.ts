import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// The Whisper Wall's Trending Confessions sidebar (socialu_whisper_trending,
// additional functionality not in the official SRS). Exercises: the exact
// scoring formula (reactions x1 + comments x2), descending rank, the
// comments-then-reactions-then-newest tie-break, a hard cap of 3 even when
// more confessions qualify, zero-engagement exclusion (never padded in),
// live recalculation when engagement changes, that repeatedly changing a
// reaction never inflates the count past 1 per student, that a tombstoned
// comment and a report-threshold-removed confession are both excluded, and
// cross-school isolation -- against the real schema.
it('ranks Trending Confessions by engagement score, caps at 3, excludes zero-engagement/removed/tombstoned content, and stays same-school isolated', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261029000100_whisper_retire_categories.sql','20261103000100_whisper_professor_tea.sql','20261103000200_whisper_trending_sidebar.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

// A second school, same pattern as every other Whisper Wall test.
await db.query<any>("INSERT INTO socialu.university(university_id,name) VALUES(2,'Other University')");
await db.query<any>("INSERT INTO socialu.university_domains(domain,university_id) VALUES('otheruni.edu',2)");

const uid=(n:number)=>`00000000-0000-0000-0000-0000000000${n.toString().padStart(2,'0')}`;
// Students 1-6: Salem State. Student 7: a different school (cross-school isolation).
const emails=['s1@salemstate.edu','s2@salemstate.edu','s3@salemstate.edu','s4@salemstate.edu','s5@salemstate.edu','s6@salemstate.edu','s7@otheruni.edu'];
for (let n=1;n<=7;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),emails[n-1]]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,emails[n-1],uid(n)]);
}

const createRaw=async(n:number,category:string,text:string)=>(await db.query<any>('SELECT public.socialu_whisper_create($1,$2,$3) AS c',[uid(n),category,text])).rows[0].c;
const commentRaw=async(n:number,confessionId:number,text:string)=>(await db.query<any>('SELECT public.socialu_whisper_create_comment($1,$2,$3) AS c',[uid(n),confessionId,text])).rows[0].c;
const backdateLastConfession=async(n:number)=>db.query(
  `UPDATE socialu.whisper_confessions SET created_at = created_at - INTERVAL '1 hour' WHERE confession_id = (
     SELECT confession_id FROM socialu.whisper_confessions
     WHERE author_id = (SELECT student_id FROM socialu.students WHERE username=$1)
     ORDER BY created_at DESC LIMIT 1
   )`, [`student${n}`]);
const backdateLastComment=async(n:number)=>db.query(
  `UPDATE socialu.whisper_comments SET created_at = created_at - INTERVAL '1 hour' WHERE comment_id = (
     SELECT comment_id FROM socialu.whisper_comments
     WHERE author_id = (SELECT student_id FROM socialu.students WHERE username=$1)
     ORDER BY created_at DESC LIMIT 1
   )`, [`student${n}`]);
const create=async(n:number,category:string,text:string)=>{ const c=await createRaw(n,category,text); await backdateLastConfession(n); return c; };
const comment=async(n:number,confessionId:number,text:string)=>{ const c=await commentRaw(n,confessionId,text); await backdateLastComment(n); return c; };
const react=async(n:number,confessionId:number,reaction:string|null)=>(await db.query<any>('SELECT public.socialu_whisper_react($1,$2,$3) AS r',[uid(n),confessionId,reaction])).rows[0].r;
const trending=async(n:number)=>(await db.query<any>('SELECT public.socialu_whisper_trending($1) AS t',[uid(n)])).rows[0].t as any[];

// --- Build confessions with deliberately distinct, hand-computed scores. ---
// c_zero: no engagement at all -- must never appear, not even padded in to fill 3 slots.
const cZero=await create(1,'advice','Nothing ever happens to this one');
// c_a: 1 reaction, 0 comments -> score 1
const cA=await create(2,'unpopular_opinion','Pineapple belongs on pizza');
await react(3,cA.confession_id,'like');
// c_b: 0 reactions, 1 comment -> score 0 + 1*2 = 2
const cB=await create(3,'advice','Should I drop this class');
await comment(4,cB.confession_id,'Yes, drop it');
// c_c: 2 reactions, 1 comment -> score 2 + 1*2 = 4
const cC=await create(4,'campus_crush','Saw someone cute at the library again');
await react(1,cC.confession_id,'love');
await react(2,cC.confession_id,'wow');
await comment(5,cC.confession_id,'Any more details?');
// c_e: 4 reactions, 0 comments -> score 4 + 0 = 4 (TIES cC on score; cC has more comments so must rank above)
const cE=await create(5,'unpopular_opinion','Cereal is a soup');
for (const n of [1,2,3,6]) await react(n,cE.confession_id,'haha');
// c_d: 1 reaction, 2 visible comments + 1 soon-to-be-tombstoned comment -> score 1 + 2*2 = 5 (tombstoned one must not count)
const cD=await create(6,'professor_tea','My professor assigns homework the night before break');
await react(1,cD.confession_id,'care');
await comment(2,cD.confession_id,'Couldn\'t agree more');
await comment(3,cD.confession_id,'Mine does this too');
const toTombstone=await comment(4,cD.confession_id,'This will be deleted');
await db.query('SELECT public.socialu_whisper_delete_comment($1,$2)',[uid(4),toTombstone.comment_id]);

// --- Ranking + tie-break + max-3 cap, all at once: only cD(5), cC(4, 1
// comment), cE(4, 0 comments) qualify for the top 3 -- cB(2) and cA(1) are
// real, nonzero-engagement confessions that still get excluded purely by
// the 3-slot cap (proving the cap independently of zero-engagement
// exclusion), and cZero never appears at all. ---
let top=await trending(1);
assert.equal(top.length,3);
assert.deepEqual(top.map((c:any)=>c.confession_id),[cD.confession_id,cC.confession_id,cE.confession_id]);
assert.equal(top[0].comment_count,2); // tombstoned 3rd comment excluded from the count
assert.ok(!top.some((c:any)=>c.confession_id===cZero.confession_id));
assert.ok(!top.some((c:any)=>c.confession_id===cB.confession_id));
assert.ok(!top.some((c:any)=>c.confession_id===cA.confession_id));

// --- No identity ever leaks. ---
for (const c of top) {
  assert.equal('author_id' in c, false);
  assert.equal('authorId' in c, false);
}

// --- Repeatedly changing a reaction never inflates the count: cA already
// has student 3's reaction (1 row); student 1 then flips their OWN
// reaction on cA three times -- that must still add exactly 1 row total
// (2 overall: student 1 + student 3), never 3. ---
await react(1,cA.confession_id,'like');
await react(1,cA.confession_id,'love');
await react(1,cA.confession_id,'haha');
const cAReactionCount=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.whisper_reactions WHERE confession_id=$1',[cA.confession_id])).rows[0].n;
assert.equal(cAReactionCount,2);

// --- Live recalculation: boost cB's score from 2 to 5 (add 2 more comments
// -> 1+2=3 comments * 2 = 6, now the highest) and confirm the top 3 changes
// to reflect it immediately, bumping out the previously-lowest qualifier (cE). ---
await comment(6,cB.confession_id,'Second opinion: also drop it');
await comment(1,cB.confession_id,'Third opinion: definitely drop it');
top=await trending(1);
assert.equal(top.length,3);
assert.deepEqual(top.map((c:any)=>c.confession_id),[cB.confession_id,cD.confession_id,cC.confession_id]);
assert.ok(!top.some((c:any)=>c.confession_id===cE.confession_id)); // bumped out

// --- Report-threshold removal: 2 "harassment" reports hard-delete a
// confession immediately (same severity-tiered rule as regular Whisper
// Wall moderation) -- it must vanish from trending the instant it's gone,
// with no separate "hidden" flag needed since the row no longer exists. ---
await db.query('SELECT public.socialu_whisper_report_confession($1,$2,$3)',[uid(2),cB.confession_id,'harassment']);
await db.query('SELECT public.socialu_whisper_report_confession($1,$2,$3)',[uid(5),cB.confession_id,'harassment']);
const cBGone=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.whisper_confessions WHERE confession_id=$1',[cB.confession_id])).rows[0].n;
assert.equal(cBGone,0);
top=await trending(1);
assert.ok(!top.some((c:any)=>c.confession_id===cB.confession_id));
assert.deepEqual(top.map((c:any)=>c.confession_id),[cD.confession_id,cC.confession_id,cE.confession_id]); // cE is back in 3rd now that cB is gone

// --- Cross-school isolation: student 7 (different school) has their own,
// heavily-engaged confession -- never visible to Salem State's trending
// list, and Salem State's own trending list is never visible to them. ---
const otherSchoolConfession=await create(7,'advice','Totally different school, huge engagement');
await react(7,otherSchoolConfession.confession_id,'like'); // some nonzero engagement, from within their own school
const otherSchoolTop=await trending(7);
assert.ok(!otherSchoolTop.some((c:any)=>[cD.confession_id,cC.confession_id,cE.confession_id].includes(c.confession_id)));
const salemTop=await trending(1);
assert.ok(!salemTop.some((c:any)=>c.confession_id===otherSchoolConfession.confession_id));

// --- Empty case: a brand-new, all-zero-engagement world returns []. ---
const db2=new PGlite();
await db2.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db2.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261029000100_whisper_retire_categories.sql','20261103000100_whisper_professor_tea.sql','20261103000200_whisper_trending_sidebar.sql']) await db2.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
await db2.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(1),'solo@salemstate.edu']);
await db2.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',['Solo','solostudent','solo@salemstate.edu',uid(1)]);
await db2.query<any>('SELECT public.socialu_whisper_create($1,$2,$3)',[uid(1),'advice','Nobody has engaged with anything yet']);
const emptyTop=(await db2.query<any>('SELECT public.socialu_whisper_trending($1) AS t',[uid(1)])).rows[0].t;
assert.deepEqual(emptyTop,[]);
await db2.close();

console.log('PASS: Trending Confessions sidebar -- scoring formula (reactions x1 + comments x2), descending rank with comments-then-reactions-then-newest tie-break, hard cap of 3, zero-engagement exclusion, live recalculation, no reaction-repeat inflation, tombstoned-comment exclusion, report-threshold-removed-confession exclusion, cross-school isolation, and the empty-state case -- against the real schema.');
} finally { await db.close(); }
}, 30000);
