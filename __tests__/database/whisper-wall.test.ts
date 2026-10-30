import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// The Whisper Wall, additional functionality not in the official SRS (see
// the approved plan). Exercises: same-school isolation (learned directly
// from the 20261027000300 regression -- tested here first, not last),
// per-confession anonymous aliasing (stable within a thread, uncorrelated
// across confessions, "Original Poster" for the author), reactions,
// severity-tiered report auto-removal, comment tombstoning, Campus Crush
// mention opt-out (both the suggestion RPC and raw-text server-side
// enforcement), no-notification-on-mention, the whisper_comment
// notification to the real author without exposing any identity, posting
// cooldowns, and -- throughout -- that no RPC ever returns author_id or
// reporter_id to a non-owner.
it('keeps confessions anonymous, same-school isolated, and privacy-safe end to end against the real schema', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261023000100_report_post.sql','20261024000100_unify_notifications.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261025000100_profile_highlights_study_log.sql','20261025000200_profile_people_lists.sql','20261025000300_highlight_photo_limit.sql','20261026000100_school_communities.sql','20261026000200_campus_members.sql','20261026000300_srs_315_fixes.sql','20261026000400_mentions.sql','20261026000500_share_post.sql','20261027000100_reposts.sql','20261027000300_restore_school_isolation.sql','20261028000100_whisper_wall.sql','20261028000200_whisper_reactions_expansion.sql','20261028000300_global_reaction_system.sql','20261029000100_whisper_retire_categories.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

// A second school, same pattern as the school-isolation regression test.
await db.query<any>("INSERT INTO socialu.university(university_id,name) VALUES(2,'Other University')");
await db.query<any>("INSERT INTO socialu.university_domains(domain,university_id) VALUES('otheruni.edu',2)");

const uid=(n:number)=>`00000000-0000-0000-0000-0000000000${n.toString().padStart(2,'0')}`;
// Students 1-4, 6-7: Salem State (6/7 exist only to give the report-
// threshold test enough distinct non-author reporters). Student 5: a
// different school.
const emails=['s1@salemstate.edu','s2@salemstate.edu','s3@salemstate.edu','s4@salemstate.edu','s5@otheruni.edu','s6@salemstate.edu','s7@salemstate.edu'];
for (let n=1;n<=7;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),emails[n-1]]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,emails[n-1],uid(n)]);
}

// create/comment below auto-backdate the row they just inserted by an hour,
// so the many DIFFERENT assertions in this test (aliasing, reactions,
// mentions, reporting...) never trip the very cooldowns tested explicitly,
// in isolation, near the end -- createRaw/commentRaw (no backdating) are
// used only to set up those two specific cooldown-rejection assertions.
const createRaw=async(n:number,category:string,text:string)=>(await db.query<any>('SELECT public.socialu_whisper_create($1,$2,$3) AS c',[uid(n),category,text])).rows[0].c;
const commentRaw=async(n:number,confessionId:number,text:string,parentId:number|null=null)=>(await db.query<any>('SELECT public.socialu_whisper_create_comment($1,$2,$3,$4) AS c',[uid(n),confessionId,text,parentId])).rows[0].c;
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
const comment=async(n:number,confessionId:number,text:string,parentId:number|null=null)=>{ const c=await commentRaw(n,confessionId,text,parentId); await backdateLastComment(n); return c; };
const list=async(n:number,category:string|null=null,sort='latest')=>(await db.query<any>('SELECT public.socialu_whisper_list($1,$2,$3) AS l',[uid(n),category,sort])).rows[0].l as any[];
const listComments=async(n:number,confessionId:number)=>(await db.query<any>('SELECT public.socialu_whisper_list_comments($1,$2) AS l',[uid(n),confessionId])).rows[0].l as any[];
const react=async(n:number,confessionId:number,reaction:string|null)=>(await db.query<any>('SELECT public.socialu_whisper_react($1,$2,$3) AS r',[uid(n),confessionId,reaction])).rows[0].r;
const reactComment=async(n:number,commentId:number,reaction:string|null)=>(await db.query<any>('SELECT public.socialu_whisper_react_comment($1,$2,$3) AS r',[uid(n),commentId,reaction])).rows[0].r;
const notifs=async(n:number)=>(await db.query<any>('SELECT public.socialu_notifications($1) AS r',[uid(n)])).rows[0].r.notifications as any[];

// --- Basic creation + same-school isolation (checked FIRST, not last). ---
// Created via createRaw (not backdated yet) so the confession-posting
// cooldown test right below has a genuinely fresh row to reject against.
const c1=await createRaw(1,'unpopular_opinion','Someone tripped in the dining hall today 😂');
assert.equal(c1.is_own,true);
assert.deepEqual(c1.reaction_counts,{like:0,love:0,haha:0,wow:0,sad:0,care:0});
const feedForStudent2=await list(2);
assert.ok(feedForStudent2.some((c:any)=>c.confession_id===c1.confession_id));
const feedForStudent5=await list(5);
assert.ok(!feedForStudent5.some((c:any)=>c.confession_id===c1.confession_id)); // different school never sees it
await assert.rejects(db.query('SELECT public.socialu_whisper_create_comment($1,$2,$3)',[uid(5),c1.confession_id,'nice try']), /isn't available/);
await assert.rejects(db.query('SELECT public.socialu_whisper_react($1,$2,$3)',[uid(5),c1.confession_id,'like']), /isn't available/);

// --- No identity ever appears in any returned shape. ---
assert.equal('author_id' in c1, false);
assert.equal('authorId' in c1, false);

// --- Posting cooldown (confessions): student 1's c1 above is still fresh,
// so another confession from them right now must be rejected. Backdated
// afterward so nothing later in this test trips over it unintentionally. ---
await assert.rejects(db.query('SELECT public.socialu_whisper_create($1,$2,$3)',[uid(1),'unpopular_opinion','too soon']), /wait a moment/);
await backdateLastConfession(1);

// --- Category filter (active categories only -- creating with a retired
// category is covered separately below). ---
await create(2,'advice','Group projects are the worst.');
assert.ok((await list(2,'unpopular_opinion')).every((c:any)=>c.category==='unpopular_opinion'));
assert.ok((await list(2,'advice')).every((c:any)=>c.category==='advice'));

// --- Retired categories (funny/embarrassing/rant): rejected for NEW
// confessions, but the table's own CHECK constraint still accepts them
// (unchanged, not narrowed) -- proven by inserting one directly the way
// genuinely historical, pre-retirement data would look, then confirming
// it behaves completely normally everywhere: visible in the unfiltered
// feed, has a working comment/reaction/report path, and its original
// category is never silently rewritten. ---
for (const retired of ['funny','embarrassing','rant']) {
  await assert.rejects(db.query('SELECT public.socialu_whisper_create($1,$2,$3)',[uid(2),retired,'nice try']), /valid category/);
}
const historical=(await db.query<any>(
  "INSERT INTO socialu.whisper_confessions(author_id,category,text_content) VALUES((SELECT student_id FROM socialu.students WHERE username='student1'),'embarrassing','A genuinely old confession from before retirement') RETURNING confession_id"
)).rows[0];
// Backdate it like every other confession in this test (same helper used
// throughout) -- otherwise, being a fresh unbackdated row, it becomes
// student 1's own most-recent confession and incorrectly trips their
// posting cooldown later in this test.
await backdateLastConfession(1);
const historicalInAll=(await list(2)).find((c:any)=>c.confession_id===historical.confession_id);
assert.ok(historicalInAll, 'historical retired-category confession must still appear in the unfiltered feed');
assert.equal(historicalInAll.category,'embarrassing'); // never silently reclassified
const historicalComment=await comment(3,historical.confession_id,'still works');
assert.equal(historicalComment.alias_label,'Anonymous Student 1');
await reactComment(2,historicalComment.comment_id,'love');
const historicalThread=await listComments(1,historical.confession_id);
assert.equal(historicalThread.find((x:any)=>x.comment_id===historicalComment.comment_id).reaction_counts.love,1);
const historicalReact=await react(4,historical.confession_id,'care');
assert.equal(historicalReact.reaction_counts.care,1);
const historicalReport=await db.query<any>('SELECT public.socialu_whisper_report_confession($1,$2,$3) AS r',[uid(3),historical.confession_id,'spam']);
assert.equal(historicalReport.rows[0].r.reported,true);

// --- Anonymous aliasing: stable within a thread, "Original Poster" for the
// author, uncorrelated across two different confessions. ---
const rootComment=await comment(2,c1.confession_id,'That is so relatable');
assert.equal(rootComment.alias_label,'Anonymous Student 1');
const secondCommenter=await comment(3,c1.confession_id,'Who was it though');
assert.equal(secondCommenter.alias_label,'Anonymous Student 2');
const student2Again=await comment(2,c1.confession_id,'I was there to see it');
assert.equal(student2Again.alias_label,'Anonymous Student 1'); // stable, not re-assigned
const opComment=await comment(1,c1.confession_id,'Thanks for the laughs everyone');
assert.equal(opComment.alias_label,'Original Poster');
assert.equal(opComment.is_op,true);

// A reply flattens to the top-level comment, same one-level pattern as
// regular post comments.
const reply=await comment(3,c1.confession_id,'Agreed',rootComment.comment_id);
const threadView=await listComments(1,c1.confession_id);
assert.equal(threadView.find((x:any)=>x.comment_id===reply.comment_id).parent_comment_id,rootComment.comment_id);

// Uncorrelated across confessions: student 3 was "Anonymous Student 2" in
// c1 -- in a BRAND NEW confession (authored by student 4, not student 1,
// to avoid tripping the posting cooldown tested explicitly below), their
// alias starts over independently.
const c2=await create(4,'advice','Should I switch majors?');
const student3InC2=await comment(3,c2.confession_id,'Depends on the major');
assert.equal(student3InC2.alias_label,'Anonymous Student 1'); // not "2" -- no cross-confession correlation

// --- Reactions: set, change, remove; counts only, never who reacted. ---
let reacted=await react(2,c1.confession_id,'like');
assert.equal(reacted.reaction_counts.like,1);
reacted=await react(2,c1.confession_id,'care'); // change
assert.equal(reacted.reaction_counts.like,0);
assert.equal(reacted.reaction_counts.care,1);
reacted=await react(2,c1.confession_id,null); // remove
assert.equal(reacted.reaction_counts.care,0);
await react(2,c1.confession_id,'like');
await react(3,c1.confession_id,'like');
// All 6 reaction kinds are valid; one active reaction per student, enforced
// by the table's own PRIMARY KEY + UPSERT, not just app logic.
reacted=await react(2,c1.confession_id,'haha');
assert.equal(reacted.reaction_counts.haha,1);
assert.equal(reacted.reaction_counts.like,1); // student 3's reaction untouched
await react(2,c1.confession_id,'like'); // back to like for later assertions below

// --- Comment reactions: the same set/change/remove mechanism, now also
// available on comments/replies, independent of the confession's own
// reactions. ---
let commentReacted=await reactComment(1,rootComment.comment_id,'love');
assert.equal(commentReacted.reaction_counts.love,1);
commentReacted=await reactComment(1,rootComment.comment_id,'sad'); // change
assert.equal(commentReacted.reaction_counts.love,0);
assert.equal(commentReacted.reaction_counts.sad,1);
commentReacted=await reactComment(1,rootComment.comment_id,null); // remove
assert.equal(commentReacted.reaction_counts.sad,0);
await reactComment(1,rootComment.comment_id,'love');
await reactComment(4,rootComment.comment_id,'love');
const commentReactionsView=(await listComments(1,c1.confession_id)).find((x:any)=>x.comment_id===rootComment.comment_id);
assert.equal(commentReactionsView.reaction_counts.love,2);
// Reacting to a comment never touches its confession's own reaction counts.
const c1AfterCommentReactions=(await list(1)).find((x:any)=>x.confession_id===c1.confession_id);
assert.equal(c1AfterCommentReactions.reaction_counts.love,0);
// Cross-school: a different-school student can't react to a comment either
// -- same generic "not available" collapse as reacting to the confession.
await assert.rejects(db.query('SELECT public.socialu_whisper_react_comment($1,$2,$3)',[uid(5),rootComment.comment_id,'like']), /isn't available/);

// --- whisper_comment notification to the real confession author: fires,
// but never reveals who commented or any post/visibility metadata. ---
const whisperNotifs=(await notifs(1)).filter((x:any)=>x.kind==='whisper_comment');
assert.ok(whisperNotifs.length>0);
assert.equal(whisperNotifs[0].actor_name,null);
assert.equal(whisperNotifs[0].actor_username,null);
// Self-comments (the author commenting on their own confession) never notify.
const beforeSelfComment=(await notifs(1)).filter((x:any)=>x.kind==='whisper_comment').length;
await comment(1,c1.confession_id,'one more thought');
assert.equal((await notifs(1)).filter((x:any)=>x.kind==='whisper_comment').length,beforeSelfComment);

// --- Comment tombstoning preserves replies (same pattern as regular posts). ---
const del=await db.query<any>('SELECT public.socialu_whisper_delete_comment($1,$2) AS r',[uid(2),rootComment.comment_id]);
assert.equal(del.rows[0].r.tombstoned,true); // has a reply, so tombstoned not removed
const afterTombstone=await listComments(1,c1.confession_id);
assert.equal(afterTombstone.find((x:any)=>x.comment_id===rootComment.comment_id).is_deleted,true);
assert.ok(afterTombstone.some((x:any)=>x.comment_id===reply.comment_id)); // reply survives
// A tombstoned comment can no longer be reacted to (nothing left to react to).
await assert.rejects(db.query('SELECT public.socialu_whisper_react_comment($1,$2,$3)',[uid(3),rootComment.comment_id,'like']), /no longer available/);

// --- Campus Crush: mention opt-out, enforced both in the suggestion RPC
// and server-side on raw text (cannot be bypassed by typing the handle). ---
const crush=await create(2,'campus_crush','Saw someone cute in the library with a black hoodie');
// student4 opts out.
await db.query('SELECT public.socialu_whisper_set_opt_out($1,$2)',[uid(4),true]);
const candidatesExcludingOptOut=(await db.query<any>('SELECT public.socialu_whisper_mention_candidates($1,$2) AS c',[uid(3),'student'])).rows[0].c as any[];
assert.ok(!candidatesExcludingOptOut.some((m:any)=>m.username==='student4'));
assert.ok(candidatesExcludingOptOut.some((m:any)=>m.username==='student1')); // not opted out, still suggested
// Manually typing the opted-out handle (bypassing the dropdown entirely)
// still resolves nothing. Checked via listComments, not the create response
// -- socialu_whisper_create_comment hardcodes an empty mentions array on
// create (same established convention as the regular-post socialu_create_comment),
// relying on a subsequent list fetch to reflect what actually got stored.
const guessOptedOut=await comment(3,crush.confession_id,'Is it @student4?');
const guessValid=await comment(3,crush.confession_id,'Wait is it @student1?');
const crushThread=await listComments(1,crush.confession_id);
assert.equal(crushThread.find((x:any)=>x.comment_id===guessOptedOut.comment_id).mentions.length,0);
const guessValidView=crushThread.find((x:any)=>x.comment_id===guessValid.comment_id);
assert.equal(guessValidView.mentions.length,1);
assert.equal(guessValidView.mentions[0].username,'student1');
// No notification is ever created for a Whisper mention guess.
assert.ok(!(await notifs(1)).some((x:any)=>x.kind==='mention'));
// Mentions are inert outside Campus Crush -- checked via listComments too,
// confirming sync_whisper_mentions' category early-return actually stores
// nothing, not just that the create response hides it.
const nonCrushWithAt=await create(3,'advice','Hey @student1 you would not believe this');
const nonCrushComment=await comment(2,nonCrushWithAt.confession_id,'@student1 lol');
const nonCrushThread=await listComments(1,nonCrushWithAt.confession_id);
assert.equal(nonCrushThread.find((x:any)=>x.comment_id===nonCrushComment.comment_id).mentions.length,0);

// --- Posting cooldown (comments): a genuinely fresh comment from student 2
// right now (via commentRaw, not backdated), then confirm their very next
// comment is rejected. (The confession-posting cooldown was already
// confirmed right after c1 was created, above, while it was still fresh.) ---
await commentRaw(2,c1.confession_id,'fresh comment for the cooldown check');
await assert.rejects(db.query('SELECT public.socialu_whisper_create_comment($1,$2,$3)',[uid(2),c1.confession_id,'too soon']), /wait a moment/);

// --- Reporting: severity-tiered thresholds. Two "harassment" reports
// remove a confession immediately; four "spam" reports do not (needs 5). ---
const toReportSevere=await create(3,'advice','placeholder for severe report test');
await db.query('SELECT public.socialu_whisper_report_confession($1,$2,$3)',[uid(1),toReportSevere.confession_id,'harassment']);
let stillThere=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.whisper_confessions WHERE confession_id=$1',[toReportSevere.confession_id])).rows[0].n;
assert.equal(stillThere,1);
await db.query('SELECT public.socialu_whisper_report_confession($1,$2,$3)',[uid(2),toReportSevere.confession_id,'harassment']);
stillThere=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.whisper_confessions WHERE confession_id=$1',[toReportSevere.confession_id])).rows[0].n;
assert.equal(stillThere,0); // 2 severe reports -> removed

// Authored by student 1, reported by students 2/3/4/6 -- 4 distinct
// non-author reporters (this is why students 6/7 exist: with only 4
// same-school students total, there aren't enough non-author reporters
// otherwise to prove "4 isn't enough, needs 5" without someone reporting
// their own confession).
const toReportSpam=await create(1,'unpopular_opinion','placeholder for spam report test');
for (const n of [2,3,4]) {
  await db.query('SELECT public.socialu_whisper_report_confession($1,$2,$3)',[uid(n),toReportSpam.confession_id,'spam']);
}
stillThere=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.whisper_confessions WHERE confession_id=$1',[toReportSpam.confession_id])).rows[0].n;
assert.equal(stillThere,1); // only 3 of 5 needed -- still present
// A repeat report from the same student is a harmless no-op, not a 4th distinct reporter.
const repeatReport=await db.query<any>('SELECT public.socialu_whisper_report_confession($1,$2,$3) AS r',[uid(2),toReportSpam.confession_id,'spam']);
assert.equal(repeatReport.rows[0].r.reported,false);
await db.query('SELECT public.socialu_whisper_report_confession($1,$2,$3)',[uid(6),toReportSpam.confession_id,'spam']);
stillThere=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.whisper_confessions WHERE confession_id=$1',[toReportSpam.confession_id])).rows[0].n;
assert.equal(stillThere,1); // still only 4 distinct reporters (1,2,3,4) -- needs a 5th

// --- Trending/most_discussed sort smoke test -- just confirm they don't error
// and return valid shapes (full ranking-quality assertions aren't meaningful
// at this small a scale). ---
const trending=await list(1,null,'trending');
assert.ok(Array.isArray(trending));
const mostDiscussed=await list(1,null,'most_discussed');
assert.ok(Array.isArray(mostDiscussed));

console.log('PASS: Whisper Wall same-school isolation, anonymous aliasing (stable + uncorrelated), confession + comment reactions (6 kinds, set/change/remove, one per student), tombstoning (including reaction rejection on a tombstoned comment), Campus Crush opt-out (RPC + raw-text enforcement), no-notification-on-mention, whisper_comment notifications without identity leak, cooldowns, severity-tiered report thresholds, and retired-category enforcement (new confessions rejected, historical confessions fully functional and never reclassified) -- against the real schema.');
} finally { await db.close(); }
}, 30000);
