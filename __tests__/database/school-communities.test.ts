import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();

// socialu_notifications (20261024000100_unify_notifications.sql) is the
// merge point between two notification systems built independently:
// Linh's friend_request/friendship_accepted (main) and this branch's
// post_like/post_comment/comment_reply (SRS-312/313). This test exercises
// the unification itself -- a mixed feed sorted together, a grouped like
// counting as exactly one unread item despite multiple underlying rows,
// and mark-all-read clearing every kind at once -- none of which the
// per-feature tests (friendships.test.ts, comment-notifications.test.ts)
// cover on their own.
it('creates verified school communities and isolates campus content and interactions', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);`);
await db.exec(`CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text,topic text);CREATE TABLE realtime.sent(topic text,event text,payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('test.topic', true), '')$$;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA realtime, auth TO authenticated;GRANT SELECT, INSERT ON realtime.messages TO authenticated;
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql','20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261013150000_create_event.sql','20261015120000_list_events.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

await db.exec(readFileSync(root+'/supabase/migrations/20261026000100_school_communities.sql','utf8'));
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
const emails=['one@salemstate.edu','two@students.salemstate.edu','three@example.edu','four@example.ac.uk'];
for (let n=1;n<=4;n++) {
 const email=emails[n-1];
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),email]);
 await db.query("SELECT public.socialu_account('check_registration',NULL,$1,$2,$3)",[email,`Student ${n}`,`student${n}`]);
 await db.query("SELECT public.socialu_auth_guard('send',$1,'signup')",[email]);
 await db.query("SELECT public.socialu_account('onboard',$1,NULL,$2,$3,'')",[uid(n),`Student ${n}`,`student${n}`]);
}
const school=await db.query<any>('SELECT socialu.same_school(1,2) AS same, socialu.same_school(1,3) AS other');
assert.deepEqual(school.rows[0],{same:true,other:false});
const profile=(await db.query<any>("SELECT public.socialu_account('read',$1) AS p",[uid(3)])).rows[0].p;
assert.equal(profile.university.name,'example.edu');
const p1=(await db.query<any>("SELECT public.socialu_create_post($1,'Campus one','public') AS p",[uid(1)])).rows[0].p.post_id;
await db.query("SELECT public.socialu_create_post($1,'Campus two','public')",[uid(3)]);
const feed=async(n:number)=>(await db.query<any>('SELECT public.socialu_campus_feed($1) AS f',[uid(n)])).rows[0].f;
assert.equal((await feed(2)).length,1);
assert.equal((await feed(2))[0].text_content,'Campus one');
assert.equal((await feed(3)).length,1);
assert.equal((await feed(3))[0].text_content,'Campus two');
await assert.rejects(db.query('SELECT public.socialu_profile_view($1,$2)',[uid(3),'student1']));
await assert.rejects(db.query('SELECT public.socialu_friend_action($1,$2,$3)',[uid(3),'student1','send']));
await assert.rejects(db.query("SELECT public.socialu_profile_social($1,'follow','student1')",[uid(3)]));
await assert.rejects(db.query('SELECT public.socialu_like_post($1,$2)',[uid(3),p1]));
await assert.rejects(db.query("SELECT public.socialu_create_comment($1,$2,'Cross school')",[uid(3),p1]));
assert.equal((await db.query<any>('SELECT public.socialu_profile_visible_post(3,$1) AS ok',[p1])).rows[0].ok,false);
await db.query('SELECT public.socialu_friend_action($1,$2,$3)',[uid(2),'student1','send']);
await db.query('SELECT public.socialu_friend_action($1,$2,$3)',[uid(1),'student2','accept']);
assert.equal((await db.query<any>('SELECT socialu.are_friends(1,2) AS ok')).rows[0].ok,true);
// Same-campus DMs still work; group membership cannot bridge schools.
const cid=(await db.query<any>("SELECT public.socialu_friendships($1,'message','student2') AS c",[uid(1)])).rows[0].c.conversation_id;
await db.query("SELECT public.socialu_send_message($1,$2,'Hello campus')",[uid(1),cid]);
await assert.rejects(db.query("SELECT public.socialu_send_message($1,$2,'Other campus')",[uid(3),cid]));
const gid=(await db.query<any>("SELECT public.socialu_create_group($1) AS g",[uid(1)])).rows[0].g.id;
assert.ok(gid);
await db.query("SELECT public.socialu_conversation_messages($1,$2)",[uid(1),gid]);
await assert.rejects(db.query("INSERT INTO socialu.group_memberships(conversation_id,student_id,role) VALUES($1,3,'member')",[gid]));
await assert.rejects(db.query("SELECT public.socialu_conversation_messages($1,$2)",[uid(3),gid]));
// The caller cannot choose a different community by editing form fields.
await db.query("INSERT INTO auth.users VALUES($1,'unverified@example.edu',NULL)",[uid(5)]);
await assert.rejects(db.query("SELECT public.socialu_account('onboard',$1,NULL,'Unverified','unverified','')",[uid(5)]));
await assert.rejects(db.query("SELECT public.socialu_account('check_registration',NULL,'hacker@gmail.com','Hacker','hacker')"));
await assert.rejects(db.query("SELECT public.socialu_auth_guard('send','hacker@example.edu.evil.test','signup')"));
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.university')).rows[0].n,3);
} finally { await db.close(); }
}, 30000);
