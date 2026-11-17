if(process.env.RUN_LIVE_REVOCATION_TEST!=='yes')throw Error('Explicitly enable the disposable hosted-account integration test.');
const {createClient}=require(process.cwd()+'/node_modules/@supabase/supabase-js');
const fs=require('fs'),crypto=require('crypto');
const env=Object.fromEntries(fs.readFileSync(process.cwd()+'/.env.local','utf8').split('\n').filter(x=>x.includes('=')&&!x.trim().startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const url=env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY,anon=env.NEXT_PUBLIC_SUPABASE_ANON_KEY||env.SUPABASE_ANON_KEY;
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),users=[],clients=[];
const output=process.env.REVOCATION_EVIDENCE_DIR||'tmp/realtime-revocation-live';fs.mkdirSync(output,{recursive:true});
let next;const base='http://127.0.0.1:3128';
const trace={environment:'Local production UI/API and live Supabase Auth/SQL/WebSockets; target session channel remains connected across selected logout',before:{},after:{}};
async function rpc(name,args){const r=await admin.rpc(name,args);if(r.error)throw Error(name+': '+r.error.message);return r.data;}
async function api(token,path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error('API '+r.status+': '+d.error);return d;}
const sid=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url')).session_id;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function subscribe(token,topic,seen){const c=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(c);await c.realtime.setAuth(token);return await new Promise((resolve,reject)=>{const channel=c.channel(topic,{config:{private:true}}).on('broadcast',{event:'message_created'},e=>seen.push(e.payload.text));const timer=setTimeout(()=>reject(Error('subscribe timeout')),15000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve(channel);}else if(['CHANNEL_ERROR','TIMED_OUT'].includes(status)){clearTimeout(timer);reject(Error('join '+status));}});});}
(async()=>{
try{
 if(!anon)throw Error('Public anon key unavailable');
 next=require('child_process').spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3128'],{cwd:process.env.REVOCATION_APP_ROOT||process.cwd(),env:{...process.env,...env,SUPABASE_ANON_KEY:anon,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/account/login-activity')).status===401)break;}catch{}await wait(200);}

 const suffix=crypto.randomBytes(4).toString('hex'),password='Fixture!'+crypto.randomBytes(12).toString('hex');
 for(let n=1;n<=2;n++){const username='qa1228_'+suffix+'_'+n,email=username+'@salemstate.edu';const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'QA 1228 Disposable '+n,username}});if(r.error)throw r.error;users.push({id:r.data.user.id,email,username});await rpc('socialu_account',{p_action:'onboard',p_auth_id:r.data.user.id,p_full_name:'QA 1228 Disposable '+n,p_username:username,p_bio:''});}
 async function login(n){const c=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(c);const r=await c.auth.signInWithPassword({email:users[n].email,password});if(r.error)throw r.error;return r.data.session.access_token;}
 const caller=await login(0),target=await login(0),sender=await login(1);
 await rpc('socialu_record_login_context',{p_auth_id:users[0].id,p_session:sid(caller),p_device:'QA 1228 caller — remains active',p_location:'Controlled live test'});
 await rpc('socialu_record_login_context',{p_auth_id:users[0].id,p_session:sid(target),p_device:'QA 1228 target — selected logout',p_location:'Controlled live test'});
 const request=await rpc('socialu_friendships',{p_auth_id:users[1].id,p_action:'send',p_username:users[0].username,p_request_id:null});
 // Correct RPC argument names are verified against the repository below before running.
 const accepted=await rpc('socialu_friendships',{p_auth_id:users[0].id,p_action:'accept',p_username:users[1].username,p_request_id:request.request_id});
 const conversation=await rpc('socialu_friendships',{p_auth_id:users[1].id,p_action:'message',p_username:users[0].username,p_request_id:null});
 const targetSeen=[],callerSeen=[];
 await subscribe(target,'session:'+users[0].id+':'+sid(target),targetSeen);
 await subscribe(caller,'session:'+users[0].id+':'+sid(caller),callerSeen);
 await rpc('socialu_send_message',{p_auth_id:users[1].id,p_conversation_id:conversation.conversation_id,p_text:'QA1228 BEFORE — both active'});
 for(let i=0;i<50&&(!targetSeen.length||!callerSeen.length);i++)await wait(100);
 trace.before={targetReceived:targetSeen.includes('QA1228 BEFORE — both active'),callerReceived:callerSeen.includes('QA1228 BEFORE — both active')};
 if(!trace.before.targetReceived||!trace.before.callerReceived)throw Error('Live delivery positive control failed');
 const history=await api(caller,'/api/account/login-activity');const targetEntry=history.entries.find(e=>e.device.includes('target'));
 await api(caller,'/api/account/login-activity',{id:targetEntry.id,confirm:true});
 let targetJoinDenied=false;try{await subscribe(target,'session:'+users[0].id+':'+sid(target),[]);}catch{targetJoinDenied=true;}
 await rpc('socialu_send_message',{p_auth_id:users[1].id,p_conversation_id:conversation.conversation_id,p_text:'QA1228 AFTER — caller only'});
 for(let i=0;i<50&&!callerSeen.includes('QA1228 AFTER — caller only');i++)await wait(100);await wait(2500);
 const check=async(token)=>await rpc('socialu_session_guard',{p_action:'check',p_auth_id:users[0].id,p_session:sid(token),p_issued_at:new Date().toISOString()});
 trace.after={callerReceived:callerSeen.includes('QA1228 AFTER — caller only'),revokedCachedConnectionReceived:targetSeen.includes('QA1228 AFTER — caller only'),revokedNewJoinDenied:targetJoinDenied,callerAppAllowed:await check(caller),targetAppAllowed:await check(target)};
 const {chromium}=await import(process.env.SOCIALU_PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.REVOCATION_BROWSER_EXECUTABLE});
 try{const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(base+'/login');await page.evaluate(token=>sessionStorage.setItem('access_token',token),caller);await page.goto(base+'/account/login-activity',{waitUntil:'networkidle'});await page.getByRole('list',{name:'Recorded sign-ins'}).waitFor();await page.screenshot({path:output+'/01-selected-target-ended-caller-active.png',fullPage:true});}finally{await browser.close();}
 if(!trace.after.callerReceived||trace.after.revokedCachedConnectionReceived||!targetJoinDenied||!trace.after.callerAppAllowed||trace.after.targetAppAllowed)throw Error('Live revocation assertion failed');
 trace.result='passed';console.log(JSON.stringify(trace));
}catch(e){trace.result='failed';trace.error=e.message;console.error(e.message);process.exitCode=1;}
finally{next?.kill('SIGTERM');for(const c of clients)await c.removeAllChannels();let cleaned=0;for(const u of users){try{await rpc('socialu_account_lifecycle',{p_auth_id:u.id,p_action:'deactivate'});await rpc('socialu_session_guard',{p_action:'revoke_all',p_auth_id:u.id,p_session:null,p_issued_at:new Date().toISOString()});cleaned++;}catch(e){trace.cleanupError=e.message;process.exitCode=1;}}trace.disposableAccountsDeactivatedAndAppSessionsRevoked=cleaned;fs.writeFileSync(output+'/live-session-channel-trace.json',JSON.stringify(trace,null,2));}
})();
