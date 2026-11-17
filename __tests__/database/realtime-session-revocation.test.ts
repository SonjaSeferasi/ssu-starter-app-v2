import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// SRS-201.1 / SRS-201.2: send and retrieve chat messages against the real schema, in memory (nothing hosted is touched).
it('rejects revoked session authorization and stops server delivery to cached subscriptions', async () => {
const db=new PGlite();
// Minimal stand-ins for Supabase's auth and realtime schemas; realtime.send records what would be broadcast.
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text,topic text);CREATE TABLE realtime.sent(topic text,event text,payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('test.topic', true), '')$$;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA realtime, auth TO authenticated;GRANT SELECT, INSERT ON realtime.messages TO authenticated;
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012120000_chat_send_text_message.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const send=async(n:number,c:string,text:string)=>(await db.query<any>('SELECT public.socialu_send_message($1,$2,$3) AS m',[uid(n),c,text])).rows[0].m;
const history=async(n:number|string,c:string)=>(await db.query<any>('SELECT public.socialu_conversation_messages($1,$2) AS h',[typeof n==='number'?uid(n):n,c])).rows[0].h;
const texts=async(n:number,c:string)=>(await history(n,c)).messages.map((m:any)=>m.text);
const code=(expected:string)=>(error:any)=>error.code===expected;

// Students 1 and 2 are friends with a private conversation; student 3 is outside it.
await friends(2,'accept','student1',(await friends(1,'send','student2')).request_id);
const cid=(await friends(1,'message','student2')).conversation_id;

await db.exec(`CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT coalesce(nullif(current_setting('test.claims',true),'')::jsonb,'{}'::jsonb)$$;`);
for(const file of ['20261029100000_login_history.sql','20261029101000_complete_login_history.sql','20261029102000_login_activity_status.sql','20261103111000_selected_session_logout.sql'])await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
const caller='10000000-0000-4000-8000-000000000001',target='10000000-0000-4000-8000-000000000002';
await db.query('INSERT INTO auth.sessions VALUES($1,$3,now()),($2,$3,now())',[caller,target,uid(1)]);
const historyId=(await db.query<any>('SELECT history_id::text AS id FROM socialu.login_history WHERE session_id=$1',[target])).rows[0].id;
const guard=async(sid:string)=>(await db.query<any>("SELECT public.socialu_session_guard('check',$1,$2,now()) AS ok",[uid(1),sid])).rows[0].ok;
await db.query('SELECT public.socialu_end_login_session($1,$2,$3)',[uid(1),caller,historyId]);
assert.equal(await guard(target),false);assert.equal(await guard(caller),true);
await db.exec("INSERT INTO realtime.messages VALUES('broadcast','probe')");
const allowed=async(sid:string,topic:string)=>{
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.claims',$2,false),set_config('test.topic',$3,false)",[uid(1),JSON.stringify({sub:uid(1),session_id:sid}),topic]);
 await db.exec('SET ROLE authenticated');
 try{return (await db.query<any>('SELECT count(*)::int AS n FROM realtime.messages')).rows[0].n===1;}finally{await db.exec('RESET ROLE');}
};
assert.equal(await allowed(target,'student:'+uid(1)),true); // reproduce the real old policy
await send(2,cid,'baseline leak');
assert.ok((await db.query<any>("SELECT * FROM realtime.sent WHERE topic=$1",['student:'+uid(1)])).rows.length);
const trace:any={before:{targetAppAllowed:false,targetRealtimeAllowed:true},after:{}};
const migration=readFileSync(root+'/supabase/migrations/20261117010000_realtime_session_revocation.sql','utf8');
await db.exec(migration);await db.exec(migration);
assert.equal(await allowed(target,'session:'+uid(1)+':'+target),false);
assert.equal(await allowed(caller,'session:'+uid(1)+':'+caller),true);
assert.equal(await allowed(caller,'session:'+uid(1)+':'+target),false);
assert.equal(await allowed(caller,'student:'+uid(1)),false);
await db.exec('TRUNCATE realtime.sent');
await send(2,cid,'after selected logout');
const topics=(await db.query<any>('SELECT topic FROM realtime.sent')).rows.map(r=>r.topic);
assert.deepEqual(topics,['session:'+uid(1)+':'+caller]);
assert.equal(await guard(caller),true);assert.equal(await guard(target),false);
trace.after={targetAppAllowed:false,targetRealtimeAllowed:false,callerAppAllowed:true,callerRealtimeAllowed:true,broadcastTopics:topics,providerTargetSessionRetained:(await db.query<any>('SELECT count(*)::int AS n FROM auth.sessions WHERE id=$1',[target])).rows[0].n===1};
const dir=process.env.REVOCATION_EVIDENCE_DIR;if(dir){mkdirSync(dir,{recursive:true});writeFileSync(dir+'/sql-trace.json',JSON.stringify(trace,null,2));}
}finally{await db.close();}
},30000);
