import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// SRS-315: Public/Friends Only visibility, enforced end to end against the
// real schema -- feed placement (315.4/315.5/315.7), the broader access
// restriction (315.6, including the author's own Friends Feed), and the
// visibility-selection requirement (315.3) rejecting NULL/invalid values.
it('enforces post visibility across both feeds, including the author seeing their own Friends Only posts and NULL/invalid visibility being rejected', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261008000400_seed_post_photo_upload_policy.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015000100_edit_post.sql','20261015120100_delete_post.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261021000100_comment_replies.sql','20261024000200_fix_feed_functions.sql','20261024000300_optional_post_text.sql','20261026000300_srs_315_fixes.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=3;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
// Student 1 and Student 2 are accepted friends; Student 3 is not.
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3)',[uid(1),'send','student2']);
const requestId=(await db.query<any>("SELECT request_id FROM socialu.friend_requests WHERE status='pending' LIMIT 1")).rows[0].request_id;
await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4)',[uid(2),'accept','student1',requestId]);

const post=async(n:number,text:string,vis:string|null)=>(await db.query<any>('SELECT public.socialu_create_post($1,$2,$3) AS p',[uid(n),text,vis])).rows[0].p;
const campus=async(n:number)=>(await db.query<any>('SELECT public.socialu_campus_feed($1) AS f',[uid(n)])).rows[0].f as any[];
const friendsFeed=async(n:number)=>(await db.query<any>('SELECT public.socialu_friends_feed($1) AS f',[uid(n)])).rows[0].f as any[];

const publicPost=(await post(1,'Public post by student 1','public')).post_id;
const friendsPost=(await post(1,'Friends only post by student 1','friends_only')).post_id;

// --- 1. Public posts appear in Campus Feed. ---
assert.ok((await campus(2)).some((p:any)=>p.post_id===publicPost));

// --- 2. Friends Only posts never appear in Campus Feed (for anyone, including the author). ---
assert.ok(!(await campus(1)).some((p:any)=>p.post_id===friendsPost));
assert.ok(!(await campus(2)).some((p:any)=>p.post_id===friendsPost));
assert.ok(!(await campus(3)).some((p:any)=>p.post_id===friendsPost));

// --- 3. Accepted friends can see Friends Only posts (via Friends Feed). ---
assert.ok((await friendsFeed(2)).some((p:any)=>p.post_id===friendsPost));

// --- 4. Non-friends cannot see Friends Only posts. ---
assert.ok(!(await friendsFeed(3)).some((p:any)=>p.post_id===friendsPost));

// --- 5. Authors can see their own Friends Only posts in their own Friends Feed. ---
assert.ok((await friendsFeed(1)).some((p:any)=>p.post_id===friendsPost));

// --- 6. NULL and invalid visibility values are rejected (SRS-315.3 backend). ---
await assert.rejects(
  db.query('SELECT public.socialu_create_post($1,$2,$3)',[uid(1),'No visibility at all',null]),
  /Choose a visibility option/
);
await assert.rejects(
  db.query('SELECT public.socialu_create_post($1,$2,$3)',[uid(1),'Bad visibility value','everyone']),
  /Choose a visibility option/
);
// A blank/whitespace string is just as invalid as NULL.
await assert.rejects(
  db.query('SELECT public.socialu_create_post($1,$2,$3)',[uid(1),'Blank visibility','']),
  /Choose a visibility option/
);

console.log('PASS: SRS-315 visibility enforcement (Campus Feed placement, Friends Feed placement/restriction, author self-visibility, NULL/invalid rejection) against the real schema.');
} finally { await db.close(); }
}, 30000);
