import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
it('enforces friendship transitions, blocks, deactivation, and session revocation against the real schema', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022020000_open_private_conversation.sql','20261022030000_profile_friends_list.sql','20261022040000_profile_friends_request_status.sql','20261022050000_integrate_notifications_with_main.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=3;n++) {
 await db.query<any>('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query<any>('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
// Regression: completed profiles must accept empty bios in the real table CHECK too.
await db.exec("INSERT INTO socialu.student_profiles(student_id) VALUES(1),(2),(3)");
const blankBio = await db.query<any>("SELECT public.socialu_save_profile_details($1,'Student 1','','Biology','Junior','','profile/test.jpg','image/jpeg',100) AS p",[uid(1)]);
assert.equal(blankBio.rows[0].p.biography, undefined);
assert.equal(blankBio.rows[0].p.bio,'');
assert.equal(blankBio.rows[0].p.setup_completed,true);
const call=async(n:number,action:string,target:string|null=null,id:string|null=null,q='',offset=0)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4,$5,$6) AS r',[uid(n),action,target,id,q,offset])).rows[0].r as any;
const life=async(n:number,action:string)=>(await db.query<any>('SELECT public.socialu_account_lifecycle($1,$2) AS r',[uid(n),action])).rows[0].r as any;
await db.query('SELECT public.socialu_create_post($1,$2,$3)',[uid(2),'Campus hello','public']);
const campus=async()=>(await db.query<any>('SELECT public.socialu_campus_feed($1) AS posts',[uid(1)])).rows[0].posts;
assert.equal((await campus())[0].author_username,'student2');
const feedPost=(await campus())[0].post_id;
await db.query('INSERT INTO socialu.post_likes(post_id,student_id) VALUES($1,1)',[feedPost]);
await db.query("INSERT INTO socialu.post_comments(post_id,author_id,text_content) VALUES($1,1,'Nice post')",[feedPost]);
const integrated=(await campus())[0];
assert.equal(integrated.like_count,1);assert.equal(integrated.is_liked_by_viewer,true);assert.equal(integrated.comment_count,1);

assert.equal((await call(1,'friends')).length,0);
// SRS-114.1: two eligible non-friends expose the Add Friend state without mutating data.
assert.deepEqual(await call(1,'relation','student2'),{state:'none',request_id:null});
assert.deepEqual(await call(2,'relation','student1'),{state:'none',request_id:null});
let rel=await call(1,'send','student2'); assert.equal(rel.state,'sent');const firstId=rel.request_id;
assert.equal((await call(1,'relation','student2')).state,'sent');
assert.equal((await call(2,'relation','student1')).state,'received');
const notices=async(n:number)=>(await db.query<any>('SELECT public.socialu_notifications($1) AS n',[uid(n)])).rows[0].n;
assert.equal((await notices(2)).unread,1);
assert.equal((await notices(2)).notifications[0].kind,'friend_request');
// Legacy pending requests created before notification delivery was installed are repaired once.
await db.query('DELETE FROM socialu.notifications WHERE friend_request_id=$1',[firstId]);
const backfill=readFileSync(root+'/supabase/migrations/20261022060000_backfill_friend_request_notifications.sql','utf8');
await db.exec(backfill);
await db.exec(backfill);
assert.equal((await notices(2)).unread,1);
assert.equal((await notices(2)).notifications.length,1);

await db.query('SELECT public.socialu_mark_notifications_read($1)',[uid(2)]);
assert.equal((await notices(2)).unread,0);
assert.equal((await call(1,'send','student2')).request_id,firstId);
assert.equal((await call(2,'send','student1')).state,'received');
assert.equal((await call(2,'incoming')).length,1);
const follows=async()=>(await db.query<any>('SELECT follower_id::int AS follower,followed_id::int AS followed FROM socialu.student_follows ORDER BY follower_id,followed_id')).rows;
assert.deepEqual(await follows(),[]); // Pending requests do not start following.
await db.exec('INSERT INTO socialu.student_follows(follower_id,followed_id) VALUES(1,2)'); // Existing follows are safe.

await assert.rejects(call(1,'accept','student2',firstId));
await assert.rejects(call(3,'accept','student1',firstId));
assert.equal((await call(2,'accept','student1',firstId)).state,'friends');
assert.deepEqual(await follows(),[{follower:1,followed:2},{follower:2,followed:1}]);
assert.equal((await notices(1)).notifications[0].kind,'friendship_accepted');
await db.exec('DELETE FROM socialu.student_follows');
await db.query('UPDATE socialu.friend_requests SET status=status WHERE request_id=$1',[firstId]);
assert.deepEqual(await follows(),[]); // Unrelated updates must not undo a deliberate unfollow.

assert.equal((await call(1,'friends',null,null,'STUDENT 2')).length,1);
assert.equal((await call(1,'friends',null,null,'not found')).length,0);
const cid=(await call(1,'message','student2')).conversation_id;
assert.equal((await call(2,'message','student1')).conversation_id,cid);
await assert.rejects(call(3,'message','student1'));
await call(1,'remove','student2',firstId);
assert.equal((await call(2,'friends')).length,0);
await assert.rejects(call(1,'message','student2'));
rel=await call(2,'send','student1'); await call(1,'decline','student2',rel.request_id);
assert.equal((await call(1,'incoming')).length,0);
rel=await call(1,'send','student2'); await call(1,'cancel','student2',rel.request_id);
assert.equal((await call(2,'incoming')).length,0);
assert.deepEqual(await follows(),[]); // Decline and cancel never create follows.
rel=await call(1,'send','student2'); await call(2,'accept','student1',rel.request_id);
assert.equal((await follows()).length,2);
await call(1,'block','student2');
assert.deepEqual(await follows(),[]); assert.equal((await campus()).length,0); assert.equal((await call(1,'blocked')).length,1);
assert.equal((await call(1,'friends')).length,0);
assert.equal((await call(2,'discover',null,null,'Student')).some((x:any)=>x.username==='student1'),false);
await assert.rejects(call(2,'send','student1'));
await assert.rejects(call(2,'message','student1'));
await call(2,'unblock','student1'); // Cannot remove the other student's block.
await assert.rejects(call(2,'send','student1'));
await call(1,'unblock','student2'); assert.equal((await call(1,'relation','student2')).state,'none');
assert.equal((await call(1,'blocked')).length,0);
rel=await call(1,'send','student2');await call(2,'accept','student1',rel.request_id);
const oldSession='10000000-0000-0000-0000-000000000002';await db.query<any>('INSERT INTO auth.sessions VALUES($1,$2,now()-interval \'1 day\')',[oldSession,uid(2)]);
assert.equal((await life(2,'deactivate')).is_active,false);
assert.equal((await campus()).length,0);
await assert.rejects(call(2,'friends'));
assert.equal((await call(1,'friends')).length,0);
assert.equal((await db.query<any>('SELECT public.socialu_profile_view($1,NULL) AS p',[uid(1)])).rows[0].p.friend_count,0);
await assert.rejects(call(1,'message','student2'));
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.conversations')).rows[0].n,1);
await life(2,'reactivate'); assert.equal((await call(1,'friends')).length,1);
assert.equal((await db.query<any>("SELECT public.socialu_session_guard('check',$1,$2,now()) AS ok",[uid(2),oldSession])).rows[0].ok,false);
await db.exec('SET ROLE authenticated');
await assert.rejects(call(1,'friends'));
await db.exec('RESET ROLE');
const rename=async(name:string,major='Biology')=>(await db.query<any>("SELECT public.socialu_save_profile_identity($1,$2,'Student 1','',$3,'Junior','') AS p",[uid(1),name,major])).rows[0].p;
await assert.rejects(rename('student2'));
await assert.rejects(rename('invalid name'));
await assert.rejects(rename('rolledback',''));
assert.equal((await db.query<any>('SELECT username FROM socialu.students WHERE student_id=1')).rows[0].username,'student1');
assert.equal((await rename('new.username')).username,'new.username');
assert.equal((await call(2,'friends'))[0].username,'new.username');
assert.equal((await call(2,'message','new.username')).conversation_id,cid);
assert.equal((await db.query<any>("SELECT public.socialu_account('resolve_login',p_identifier=>'new.username') AS r")).rows[0].r.email,'s1@salemstate.edu');
assert.equal((await db.query<any>("SELECT public.socialu_account('resolve_login',p_identifier=>'student1') AS r")).rows[0].r.email,null);
await db.exec('SET ROLE authenticated');await assert.rejects(rename('forbidden'));await db.exec('RESET ROLE');
console.log('PASS: real schema migration; request lifecycle/ownership, search, conversation reuse, block/unblock isolation, inactive access, preserved data and revoked sessions.');
} finally { await db.close(); }

}, 30000);
