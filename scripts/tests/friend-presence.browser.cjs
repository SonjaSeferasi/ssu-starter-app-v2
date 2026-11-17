// Real local Edge UI with intercepted, synthetic accounts. No hosted presence writes.
const { chromium } = require(process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'), fs=require('node:fs');
const base=process.env.SOCIALU_TEST_URL||'http://127.0.0.1:3038';
const output=process.env.SOCIALU_EVIDENCE_DIR||'tmp/friend-presence-evidence';
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.SOCIALU_BROWSER_EXECUTABLE});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const checks=[],errors=[],writes=[],prefs={alice:false,bob:true};
 let failSave=false,failRead=false,shortExpiry=false,showFriends=true;
 const room={appearance:{outfitId:'1',faceId:'1',avatarId:'campus-v4-female-1-1-natural'},outfits:[{id:'1',name:'Campus',assetKey:'sample-campus'}],faces:[{id:'1',assetKey:'sample-smile',initial:true}],activities:[{code:'dormspace',included:true},{code:'game1',included:true}]};
 await context.addInitScript(()=>{if(!localStorage.getItem('access_token'))localStorage.setItem('access_token','alice');});
 await context.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,owner=req.headers().authorization?.replace('Bearer ','');let status=200,data={members:[],posts:[],hasMore:false};
  if(path==='/api/game-room/presence'){
   if(req.method()!=='GET'){
    const body=req.postDataJSON();writes.push({method:req.method(),owner,...body});
    if(req.method()==='PUT'){if(failSave)status=503;else prefs[owner]=body.visible;}
    data=status===200?{visible:!!prefs[owner]}:{error:'Synthetic save failure'};
   }else{
    if(failRead)status=503;
    data=status===200?{visible:!!prefs[owner],serverTime:new Date().toISOString(),friends:showFriends&&owner==='alice'?[{username:'fixture-jamie',name:'Jamie · QA fixture',location:'jumpyland',expiresAt:new Date(Date.now()+(shortExpiry?2000:60000)).toISOString()},{username:'fixture-riley',name:'Riley · QA fixture',location:'world-explorer',expiresAt:new Date(Date.now()+(shortExpiry?2000:60000)).toISOString()}]:[]}:{error:'Synthetic read failure'};
   }
  }else if(path==='/api/auth/session')data={community:{name:'Local presence QA fixture'}};
  else if(path==='/api/preferences')data={position:'side'};
  else if(path==='/api/preferences/appearance')data={theme:'light'};
  else if(path==='/api/preferences/screen-theme')data={backgroundTheme:null,headerTheme:null};
  else if(path==='/api/game-room')data=room;
  else if(path==='/api/game-participation')data={count:0,qualifiedToday:false,forgivenRemaining:3,rewardPoints:10,earnedPointsToday:0,leaderboards:{}};
  else if(path==='/api/game-participation/calendar')data={accountId:owner,today:'2026-11-17',timeZone:'UTC',serverTime:'2026-11-17T12:00:00Z',deadline:'2026-11-18T00:00:00Z',count:0,forgivenRemaining:3,qualifiedToday:false,dismissedToday:false,atRisk:false,days:Array.from({length:7},(_,i)=>({date:`2026-11-${15+i}`,state:i<2?'inactive':i===2?'today-unqualified':'upcoming'}))};
  else if(path==='/api/jumpyland')data={completed:[],balance:0};
  else if(path==='/api/message-notifications')data={notifications:[]};
  else if(path.includes('invitations'))data={invitations:[]};
  else if(path==='/api/notifications')data={unread:0,notifications:[]};
  else if(path==='/api/points')data={balance:0};
  else if(path==='/api/profile')data={profile:null,defaults:{fullName:'Local QA Fixture',username:'local_qa'}};
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 page.on('pageerror',e=>errors.push(e.message));
 const panel=()=>page.getByRole('region',{name:'Friends playing now'});
 const toggle=()=>panel().getByRole('checkbox',{name:'Show me as online'});
 async function refresh(){const done=page.waitForResponse(r=>r.url().endsWith('/api/game-room/presence')&&r.request().method()==='GET');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await done;}
 async function waitUntil(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,100));}assert.ok(predicate());}
 try{
  await page.goto(base+'/game-room');await panel().getByRole('link',{name:'Jamie · QA fixture'}).waitFor();
  assert.equal(await toggle().isChecked(),false);assert.match(await panel().innerText(),/Playing Jumpyland/);assert.match(await panel().innerText(),/Playing World Explorer/);
  await panel().scrollIntoViewIfNeeded();await page.screenshot({path:output+'/friends-playing.png'});
  checks.push('630.1/630.3: renders names and games from API, visibility off initially');
  await toggle().click();await panel().locator('input:checked').waitFor();await waitUntil(()=>prefs.alice);await waitUntil(()=>writes.some(w=>w.method==='POST'&&w.location==='game-room'));
  await page.reload();await panel().getByRole('link',{name:'Jamie · QA fixture'}).waitFor();assert.equal(await toggle().isChecked(),true);
  checks.push('630.3: enabling saves through account endpoint and survives page reload');
  failSave=true;await toggle().click();await panel().getByRole('button',{name:'Retry visibility'}).waitFor();assert.equal(await toggle().isChecked(),true);
  await page.screenshot({path:output+'/visibility-failure.png'});
  await refresh();await panel().getByRole('button',{name:'Retry visibility'}).waitFor();
  failSave=false;await panel().getByRole('button',{name:'Retry visibility'}).click();await waitUntil(()=>prefs.alice===false);await panel().getByRole('button',{name:'Retry visibility'}).waitFor({state:'hidden'});assert.equal(await toggle().isChecked(),false);
  checks.push('630.3: failed hide retains confirmed setting and Retry; polling cannot erase the save error; retry persists off');
  await page.evaluate(()=>{localStorage.setItem('access_token','bob');window.dispatchEvent(new Event('socialu-session-changed'));});
  await panel().getByText('No friends are showing as online right now.').waitFor();assert.equal(await toggle().isChecked(),true);assert.equal(await panel().getByRole('link').count(),0);
  checks.push('630.3: account switch resets old friends and loads the new account visibility');
  await page.evaluate(()=>{localStorage.setItem('access_token','alice');window.dispatchEvent(new Event('socialu-session-changed'));});await panel().getByRole('link',{name:'Jamie · QA fixture'}).waitFor();
  shortExpiry=true;await refresh();await panel().getByRole('link',{name:'Jamie · QA fixture'}).waitFor({state:'hidden'});
  checks.push('630.4: rendered friends expire on server-relative deadline without a new network response');
  shortExpiry=false;await refresh();await panel().getByRole('link',{name:'Jamie · QA fixture'}).waitFor();
  failRead=true;await refresh();await panel().getByRole('button',{name:'Retry friends'}).waitFor();assert.equal(await panel().getByRole('link').count(),0);
  failRead=false;await panel().getByRole('button',{name:'Retry friends'}).click();await panel().getByRole('link',{name:'Jamie · QA fixture'}).waitFor();
  checks.push('630.1/630.4: read failure clears stale friends and Retry restores current results');
  await page.setViewportSize({width:390,height:844});await panel().scrollIntoViewIfNeeded();assert.ok(await panel().evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:output+'/friends-mobile.png'});
  await page.evaluate(()=>document.documentElement.dataset.appearance='dark');await page.screenshot({path:output+'/friends-dark.png'});
  checks.push('630.1: panel fits 390px and remains readable in dark appearance');
  const old= writes.filter(w=>w.method==='POST').at(-1).sessionId;
  await page.getByRole('link',{name:'Campus Feed',exact:true}).first().click();await waitUntil(()=>writes.some(w=>w.method==='DELETE'&&w.sessionId===old));
  checks.push('630.4: leaving Game Room sends cleanup for the correct presence session');
  await page.goto(base+'/game-1');await waitUntil(()=>writes.some(w=>w.method==='POST'&&w.location==='jumpyland'));
  checks.push('630.1: standalone Jumpyland publishes its game location');
  await page.goto(base+'/world-explorer',{waitUntil:'domcontentloaded',timeout:120000});await waitUntil(()=>writes.some(w=>w.method==='POST'&&w.location==='world-explorer'));
  checks.push('630.1: standalone World Explorer publishes despite navigation being hidden');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(output+'/results.json',JSON.stringify({evidence:'Real local Next UI, headless Edge, intercepted synthetic account responses. Database privacy tested separately in PGlite. Not hosted two-account acceptance.',checks,errors,writes},null,2));
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }catch(e){await page.screenshot({path:output+'/failure.png'});console.log(JSON.stringify({checks,errors,url:page.url()}));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
