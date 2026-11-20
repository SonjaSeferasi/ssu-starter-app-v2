// Opt-in hosted acceptance for exactly one newly created private QA account.
// The target is a second session of that same QA account; existing students are never targets.
if(process.env.RUN_LIVE_SESSION_ACCEPTANCE!=='yes')throw Error('Explicit hosted-test approval and opt-in are required.');
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {createClient}=require(process.cwd()+'/node_modules/@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const url=env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL,anon=env.SUPABASE_ANON_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(new URL(url).hostname,'sfrpokisjlwgknxlzllu.supabase.co','Unexpected hosted project');
const admin=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const out=process.env.SESSION_EVIDENCE_DIR||'documentation/sprint5/session-controls/hosted-evidence';fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:3177',wait=ms=>new Promise(r=>setTimeout(r,ms));let account,browser,next;
const trace={environment:'Local integrated production application with real hosted Supabase Auth and PostgreSQL; one synthetic QA account, two isolated browser contexts',checks:[],cleanup:[]};
async function rpc(name,args){const r=await admin.rpc(name,args);if(r.error)throw Error(name+': '+r.error.message);return r.data;}
async function api(token,method='GET',body){const r=await fetch(base+'/api/account/login-activity',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:await r.json()};}
async function login(page){
 await page.goto(base+'/login',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const f=document.querySelector('form');return f&&Object.keys(f).some(k=>k.startsWith('__reactProps$'));});
 await page.getByRole('textbox',{name:'University email or username'}).fill(account.email);
 await page.getByLabel('Password',{exact:true}).fill(account.password);
 const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST');response.catch(()=>{});
 await page.getByRole('button',{name:'Sign in',exact:true}).click();const result=await response;assert.equal(result.status(),200,'QA sign-in failed');
 await page.waitForFunction(()=>Boolean(sessionStorage.getItem('access_token')||localStorage.getItem('access_token')));
 return page.evaluate(()=>sessionStorage.getItem('access_token')||localStorage.getItem('access_token'));
}
async function show(page){await page.goto(base+'/account/login-activity',{waitUntil:'domcontentloaded'});await page.getByRole('list',{name:'Recorded sign-ins'}).waitFor();}
(async()=>{try{
 next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3177'],{env:{...process.env,...env,SUPABASE_ANON_KEY:anon,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/account/login-activity')).status===401)break;}catch{}await wait(200);}
 const suffix=crypto.randomBytes(5).toString('hex'),username='qas5_'+suffix,password='QA!'+crypto.randomBytes(16).toString('hex');
 const created=await admin.auth.admin.createUser({email:username+'@salemstate.edu',password,email_confirm:true,user_metadata:{full_name:'Sprint Five QA',username}});if(created.error)throw created.error;
 account={id:created.data.user.id,username,email:username+'@salemstate.edu',password};assert.ok(account.username.startsWith('qas5_'));
 trace.fixtureUsername=account.username;await rpc('socialu_account',{p_action:'onboard',p_auth_id:account.id,p_full_name:'Sprint Five QA',p_username:username,p_bio:''});
 const {chromium}=await import(process.env.SOCIALU_PLAYWRIGHT_MODULE||'playwright');browser=await chromium.launch({headless:true,executablePath:process.env.SESSION_BROWSER_EXECUTABLE});
 const a=await browser.newContext({viewport:{width:1440,height:1000}}),b=await browser.newContext({viewport:{width:1440,height:1000}}),caller=await a.newPage(),target=await b.newPage();
 const targetToken=await login(target),callerToken=await login(caller);account.callerToken=callerToken;trace.checks.push('Two genuine independent sign-ins of the same newly created QA account');
 await show(caller);const history=await api(callerToken);assert.equal(history.status,200);const own=history.data.entries.find(e=>e.is_current),other=history.data.entries.find(e=>e.active&&!e.is_current);assert.ok(own&&other);
 const index=history.data.entries.findIndex(e=>e.id===other.id);const row=caller.getByRole('list',{name:'Recorded sign-ins'}).locator('li').nth(index);
 assert.equal(await row.getByRole('button',{name:/Log out/}).count(),1);await caller.screenshot({path:out+'/01-hosted-session-options.png',fullPage:true});
 let posts=0;caller.on('request',r=>{if(r.url().endsWith('/api/account/login-activity')&&r.method()==='POST')posts++;});
 await row.getByRole('button',{name:/Log out/}).click();const dialog=caller.getByRole('dialog');await dialog.waitFor();await caller.screenshot({path:out+'/02-hosted-confirmation.png',fullPage:true});
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(posts,0);assert.equal((await api(targetToken)).status,200);trace.checks.push('Cancel sends no logout request and the target remains authorized');
 await row.getByRole('button',{name:/Log out/}).click();await caller.keyboard.press('Escape');assert.equal(posts,0);assert.equal(await dialog.isVisible(),false);trace.checks.push('Escape cancels the confirmation without revocation');
 await row.getByRole('button',{name:/Log out/}).click();await dialog.getByRole('button',{name:'Log out device',exact:true}).click();
 await caller.getByRole('status').filter({hasText:'current session is still active'}).waitFor();assert.equal(posts,1);
 assert.equal((await api(targetToken)).status,401);const preserved=await api(callerToken);assert.equal(preserved.status,200);assert.equal(preserved.data.entries.find(e=>e.id===other.id).active,false);assert.equal(preserved.data.entries.find(e=>e.id===own.id).active,true);
 trace.checks.push('Selected target loses protected API access; only its owned history row becomes inactive; caller stays authorized');
 await caller.screenshot({path:out+'/03-hosted-target-ended-caller-active.png',fullPage:true});
 assert.equal((await api(callerToken,'POST',{id:own.id,confirm:true})).status,400);trace.checks.push('Current session cannot be targeted through the remote logout API');
 const refreshRaw=await target.evaluate(()=>JSON.parse(sessionStorage.getItem('socialu_session')||localStorage.getItem('socialu_session')||'{}').refresh_token);
 assert.ok(refreshRaw);const refreshed=await fetch(base+'/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:refreshRaw})});assert.equal(refreshed.status,401);trace.checks.push('Revoked target is denied after token refresh');
 await show(target);await target.getByRole('alert').waitFor();await target.screenshot({path:out+'/04-hosted-target-requires-signin.png',fullPage:true});
 const newTargetToken=await login(target);assert.notEqual(newTargetToken,targetToken);assert.equal((await api(newTargetToken)).status,200);assert.equal((await api(callerToken)).status,200);trace.checks.push('Target can establish a new genuine login; caller remains valid');
 await show(target);await target.screenshot({path:out+'/05-hosted-new-signin.png',fullPage:true});trace.result='passed';console.log('Hosted session acceptance passed for the isolated QA account.');
}catch(e){trace.result='failed';trace.error=e.message;process.exitCode=1;console.error(e.message);}
finally{
 await browser?.close();
 if(account){
  assert.ok(account.username.startsWith('qas5_'));
  for(const [stage,fn] of [
   ['deactivate new QA account',()=>rpc('socialu_account_lifecycle',{p_auth_id:account.id,p_action:'deactivate'})],
   ['revoke new QA app sessions',()=>rpc('socialu_session_guard',{p_action:'revoke_all',p_auth_id:account.id,p_session:null,p_issued_at:new Date().toISOString()})],
   ['revoke new QA provider sessions',async()=>{if(account.callerToken){const r=await admin.auth.admin.signOut(account.callerToken,'global');if(r.error)throw r.error;}}]
  ])try{await fn();trace.cleanup.push({stage,ok:true});}catch(e){trace.cleanup.push({stage,ok:false,error:e.message});process.exitCode=1;}
 }
 next?.kill('SIGTERM');fs.writeFileSync(out+'/hosted-acceptance-trace.json',JSON.stringify(trace,null,2));
}
})();
