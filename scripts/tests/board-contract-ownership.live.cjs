// Opt-in only. Creates two private hosted QA accounts. Existing students are never targets.
// Cleanup attempts every stage independently; synthetic audit rows may remain deactivated.
if(process.env.RUN_LIVE_BOARD_ACCEPTANCE!=='yes')throw Error('Hosted test requires explicit approval and opt-in.');
const fs=require('fs'),crypto=require('crypto'),assert=require('node:assert/strict'),{spawn}=require('child_process');
const {createClient}=require(process.cwd()+'/node_modules/@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(x=>x.includes('=')&&!x.trim().startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const anon=env.SUPABASE_ANON_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const projectUrl=env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL;assert.equal(new URL(projectUrl).hostname,'sfrpokisjlwgknxlzllu.supabase.co','Unexpected hosted project');
const admin=createClient(projectUrl,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[],clients=[],out=process.env.BOARD_EVIDENCE_DIR||'tmp/1039-live',base='http://127.0.0.1:3139';fs.mkdirSync(out,{recursive:true});
let next,browser,memoryId,photoKey;const trace={environment:'Local production app with real hosted Supabase Auth/PostgreSQL/private storage; two isolated browser contexts'};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function rpc(fn,args){const r=await admin.rpc(fn,args);if(r.error)throw Error(fn+': '+r.error.message);return r.data;}
async function api(u,method,path,body){const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+u.token,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
(async()=>{try{
 next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3139'],{cwd:process.env.BOARD_APP_ROOT||process.cwd(),env:{...process.env,...env,SUPABASE_ANON_KEY:anon,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/profiles/space')).status===401)break;}catch{}await wait(200);}
 const suffix=crypto.randomBytes(4).toString('hex'),password='Fixture!'+crypto.randomBytes(12).toString('hex');
 for(let n=1;n<=2;n++){
  const username='qa1039_'+suffix+'_'+n,email=username+'@salemstate.edu';const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'QA 1039 '+(n===1?'Owner':'Viewer'),username}});if(r.error)throw r.error;
  users.push({id:r.data.user.id,username,email});trace.fixtureAccounts=users.map(({id,username})=>({id,username}));await rpc('socialu_account',{p_action:'onboard',p_auth_id:r.data.user.id,p_full_name:'QA 1039 '+(n===1?'Owner':'Viewer'),p_username:username,p_bio:''});
  const client=createClient(env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL,anon,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(client);const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;users[n-1].token=login.data.session.access_token;
 }
 const [a,b]=users;assert.ok(a.username.startsWith('qa1039_'+suffix)&&b.username.startsWith('qa1039_'+suffix));
 const form=new FormData();form.set('photo',new File([fs.readFileSync('public/profile-space/campus-watercolor-v1.png')],'campus.png',{type:'image/png'}));form.set('caption','Owner campus memory');form.set('doodle','star');
 const photo=await api(a,'POST','/api/profiles/memories',form);assert.equal(photo.status,200,JSON.stringify(photo.data));memoryId=photo.data.createdMemoryId;assert.ok(Number.isSafeInteger(memoryId));const pinned=await rpc('socialu_profile_memories',{p_auth_id:a.id,p_action:'read'});photoKey=pinned.memories.find(m=>m.id===memoryId)?.key;assert.ok(photoKey?.startsWith('profile-memories/'+a.id+'/'));
 const board={items:[{id:'live-note',kind:'note',text:'1039: owner board, visible to classmates',color:'pink',x:3.25,y:7.125,width:25,rotation:-9},{id:'live-photo',kind:'photo',memoryId,x:35.5,y:10.25,width:30,rotation:6},{id:'live-sticker',kind:'sticker',sticker:'star',x:75,y:6,width:15,rotation:12},{id:'live-project',kind:'project',title:'Owner project',text:'Saved project card',url:'https://example.edu/project',x:4,y:46,width:28,rotation:0},{id:'live-music',kind:'music',url:'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',x:40,y:48,width:40,rotation:-3}]};
 const before=await api(a,'GET','/api/profiles/space'),saved=await api(a,'PATCH','/api/profiles/space',{field:'board',value:board});assert.equal(saved.status,200,JSON.stringify(saved.data));
 const stored=await rpc('socialu_profile_space',{p_auth_id:a.id,p_action:'read'});assert.deepEqual(stored.look.board,board);assert.deepEqual({...stored.look,board:undefined},{...before.data.look,board:undefined});trace.hostedPostgresRoundTrip=true;trace.exactBoard=board;
 const {chromium}=await import(process.env.SOCIALU_PLAYWRIGHT_MODULE||'playwright');browser=await chromium.launch({headless:true,executablePath:process.env.BOARD_BROWSER_EXECUTABLE});
 async function pageFor(u){const ctx=await browser.newContext({viewport:{width:1440,height:1000}});await ctx.addInitScript(t=>localStorage.setItem('access_token',t),u.token);await ctx.route('https://open.spotify.com/**',r=>r.abort());return ctx.newPage();}
 const owner=await pageFor(a),viewer=await pageFor(b);
 async function showBoard(page,url){await page.goto(url,{waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByText('1039: owner board, visible to classmates',{exact:true}).waitFor();await page.waitForFunction(()=>Array.from(document.images).some(i=>i.alt==='Owner campus memory'&&i.complete&&i.naturalWidth>0));await page.evaluate(()=>window.scrollTo(0,0));}
 await showBoard(owner,base+'/profile');await owner.getByRole('button',{name:'Edit board',exact:true}).waitFor();await owner.screenshot({path:out+'/04-live-owner.png',fullPage:true});
 await showBoard(viewer,base+'/students/'+a.username);assert.equal(await viewer.getByRole('button',{name:'Edit board',exact:true}).count(),0);const read=await api(b,'GET','/api/profiles/space?username='+a.username);assert.equal(read.status,200);assert.deepEqual(read.data.look.board,board);trace.liveViewerReadsExactBoard=true;trace.visitorHasNoEditControls=true;await viewer.screenshot({path:out+'/05-live-viewer.png',fullPage:true});
 const attack={items:[{id:'attack-note',kind:'note',text:'Must not overwrite owner',color:'cream',x:10,y:10,width:28,rotation:0}]};
 assert.equal((await api(b,'PATCH','/api/profiles/space',{field:'board',value:attack,username:a.username,auth_id:a.id})).status,200);assert.deepEqual((await api(a,'GET','/api/profiles/space')).data.look.board,board);assert.deepEqual((await api(b,'GET','/api/profiles/space')).data.look.board,attack);trace.forgedOwnerFieldsIgnored=true;
 const foreign=await admin.rpc('socialu_profile_space',{p_auth_id:b.id,p_action:'save_look',p_username:a.username,p_look:{...before.data.look,board:attack}});assert.equal(foreign.error?.code,'42501');trace.explicitForeignWriteDenied=true;
 await rpc('socialu_friendships',{p_auth_id:a.id,p_action:'block',p_username:b.username,p_request_id:null});assert.equal((await api(b,'GET','/api/profiles/space?username='+a.username)).status,404);trace.blockedViewerDenied=true;
 await viewer.reload({waitUntil:'domcontentloaded'});await viewer.getByRole('tab',{name:'My Board',exact:true}).waitFor({state:'hidden'});await viewer.screenshot({path:out+'/06-live-blocked.png',fullPage:true});assert.deepEqual((await api(a,'GET','/api/profiles/space')).data.look.board,board);trace.ownerStillReads=true;trace.result='passed';console.log('Hosted #1039 acceptance passed');
}catch(e){trace.result='failed';trace.error=e.message;process.exitCode=1;console.error(e.message);}
finally{
 await browser?.close();trace.cleanup=[];
 for(const u of users){
  const stages=[];const attempt=async(name,fn)=>{try{await fn();stages.push({stage:name,ok:true});}catch(e){stages.push({stage:name,ok:false,error:e.message});process.exitCode=1;}};
  if(u.token){await attempt('clear own board',async()=>assert.equal((await api(u,'PATCH','/api/profiles/space',{field:'board',value:{items:[]}})).status,200));if(u===users[0]&&memoryId)await attempt('remove own pinned photo/media',async()=>assert.equal((await api(u,'DELETE','/api/profiles/memories',{memoryId})).status,200));}
  if(u===users[0]&&photoKey)await attempt('remove verified QA-only storage object',async()=>{assert.ok(photoKey.startsWith('profile-memories/'+u.id+'/'));const r=await admin.storage.from('media').remove([photoKey]);if(r.error)throw r.error;});
  await attempt('deactivate QA account',()=>rpc('socialu_account_lifecycle',{p_auth_id:u.id,p_action:'deactivate'}));await attempt('revoke QA app sessions',()=>rpc('socialu_session_guard',{p_action:'revoke_all',p_auth_id:u.id,p_session:null,p_issued_at:new Date().toISOString()}));trace.cleanup.push(stages);
 }
 for(const c of clients)await c.removeAllChannels();next?.kill('SIGTERM');fs.writeFileSync(out+'/hosted-contract-ownership-trace.json',JSON.stringify(trace,null,2));
}
})();
