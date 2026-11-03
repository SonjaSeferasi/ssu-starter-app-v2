// Complete review playthroughs of levels in the real running app (headless
// Edge with hardware WebGL), with screenshots and a pass/fail report.
//
//   npx vitest run --config scripts/world-explorer/playthrough.vitest.config.mjs   (records the scripts)
//   node --experimental-websocket scripts/world-explorer/playthrough.mjs --codes BOL,BRA,VEN --base http://localhost:3100
//
// For each country, in one browser profile with empty storage:
//  1. complete-bonus and complete-main: replay the recorded input scripts in
//     the page (?review=1&autoplay=1), click through the discovery dialog as a
//     player would, reach the finish and the result screen, and compare the
//     page's outcome (status, hearts, coins and their ids, stars, discovery,
//     events) with the recorded one.
//  2. hazard: reach the first checkpoint, run into a hazard or fall, lose a
//     heart and respawn at that checkpoint.
//  3. keyboard: real key events move the player and make it jump.
//  4. touch: in an 844x390 touch viewport, the on-screen buttons jump and move
//     (--only touch or --only keyboard reruns just that check and updates the
//     existing report).
//  5. saved progress: localStorage holds the completed result, and after a
//     reload the country card reads "Completed".
// Writes <out>/playthrough-results.json and screenshots to <out>/screens/.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'BOL').split(','),base=args.base||'http://localhost:3000',out=args.out||'documentation/world-explorer/review/south-america/playthroughs',screens=join(out,'screens');
const browser=args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',port=9600+Math.floor(Math.random()*300);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
mkdirSync(screens,{recursive:true});
const child=spawn(browser,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-play-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--no-default-browser-check','--mute-audio','--autoplay-policy=no-user-gesture-required','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
if(!version)throw new Error('The browser did not open a DevTools endpoint.');
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result);}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(new Error(`${method} timed out`));},45000);pending.set(n,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
let targetId,sessionId;const page=(method,params)=>send(method,params,sessionId);
/** Work in a new tab (closing the previous one): touch emulation in headless
 * Chromium sometimes stops delivering touches to a tab that has had several. */
const freshTab=async()=>{if(targetId)await send('Target.closeTarget',{targetId});({targetId}=await send('Target.createTarget',{url:'about:blank'}));({sessionId}=await send('Target.attachToTarget',{targetId,flatten:true}));await page('Runtime.enable');await page('Log.enable');};
await freshTab();
const evaluate=async expression=>{const r=await page('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const errors=[];
socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==="Log.entryAdded"&&m.params.entry.level==="error")errors.push(m.params.entry.text+(m.params.entry.url?" "+m.params.entry.url:""));});
const shot=async name=>{const {data}=await page('Page.captureScreenshot',{format:'jpeg',quality:84});writeFileSync(join(screens,name+'.jpg'),Buffer.from(data,'base64'));return 'screens/'+name+'.jpg';};
const viewport=(width,height,mobile)=>page('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
const ready=async()=>{for(let i=0;i<160;i++){if(await evaluate(`!!document.querySelector('canvas[data-ready="true"]')&&!!window.worldExplorerReview`))return true;await wait(250);}return false;};
const state=()=>evaluate('window.worldExplorerReview.reviewState()');
const clickButton=text=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)}));if(!b)return false;b.click();return true;})()`);
const expand=runs=>runs.flatMap(([l,r,j,n])=>Array.from({length:n},()=>({left:!!l,right:!!r,jump:!!j})));
const KEYS={ArrowRight:39,Space:32};
const key=(type,code)=>page('Input.dispatchKeyEvent',{type,code,key:code==='Space'?' ':code,windowsVirtualKeyCode:KEYS[code],nativeVirtualKeyCode:KEYS[code]});
const compare=(checks,name,actual,expected)=>{const ok=JSON.stringify(actual)===JSON.stringify(expected);checks.push({check:name,ok,actual,expected});return ok;};

/** Replay one recorded script in the page, handling the discovery dialog and the result screen. */
async function replay(code,script){
 const lower=code.toLowerCase(),name=`${lower}-${script.kind}`,result={kind:script.kind,seconds:script.seconds,checks:[],screens:[]};
 await viewport(1600,900,false);
 const started=Date.now();await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1&autoplay=1`});
 if(!await ready())return{...result,error:'Level did not report ready.'};
 result.readyMs=Date.now()-started;await wait(1200);
 const before=await state();compare(result.checks,'held at the start until the script arrives',{elapsed:before.elapsed,status:before.status},{elapsed:0,status:'playing'});
 await evaluate(`window.worldExplorerReview.autoplay(${JSON.stringify(expand(script.inputs))})`);
 const seen={checkpoint:0,damage:0,respawn:0,collapse:0,raise:0,climb:0,wind:0,bounce:0};let s=before,discoveryHandled=false;
 const deadline=Date.now()+(script.seconds*1.6+40)*1000;
 while(Date.now()<deadline){
  await wait(200);s=await state();
  // A screenshot at each checkpoint and at the first of every other mechanic event.
  for(const event of Object.keys(seen)){const n=s.tally[event]||0;if(n<=seen[event])continue;const first=seen[event]===0;seen[event]=n;
   if((first||event==='checkpoint')&&result.screens.length<10){await wait(event==='respawn'?700:150);result.screens.push(await shot(`${name}-${event}-${n}`));}}
  if(s.status==='discovery'&&!discoveryHandled){await wait(700);result.screens.push(await shot(`${name}-discovery`));discoveryHandled=await clickButton('Continue adventure');result.checks.push({check:'discovery dialog shown and continued with its button',ok:discoveryHandled});}
  if(s.status==='completed'){
   for(let i=0;i<40;i++){const text=await evaluate(`document.querySelector('[role="status"]')?.textContent||''`);if(/saved|available/i.test(text)){result.saveMessage=text;break;}await wait(250);}
   await wait(500);result.screens.push(await shot(`${name}-result`));
   result.resultScreen=await evaluate(`(()=>{const d=document.querySelector('#run-dialog-title');return d?d.closest('div').innerText.split('\\n').filter(Boolean).slice(0,8):null;})()`);break;
  }
  if(script.kind==='hazard'&&s.autoplayIndex>=s.autoplayLength){await wait(800);s=await state();result.screens.push(await shot(`${name}-after-respawn`));break;}
 }
 const e=script.expected;result.final={status:s.status,hearts:s.hearts,coins:s.coins,stars:s.stars,discoveryFound:s.discoveryFound,x:+s.x.toFixed(2),standing:s.standing,elapsed:+s.elapsed.toFixed(2),replayed:`${s.autoplayIndex}/${s.autoplayLength}`};
 compare(result.checks,'status',s.status,e.status);compare(result.checks,'hearts',s.hearts,e.hearts);compare(result.checks,'coins',s.coins,e.coins);
 const keyEvents=['coin','star','checkpoint','damage','respawn','discovery','finish','collapse','raise','climb','bounce','switch'];
 const pick=t=>Object.fromEntries(keyEvents.filter(k=>t[k]).map(k=>[k,t[k]]));compare(result.checks,'events (page tally vs recorded run)',pick(s.tally),pick(e.tally));
 if(script.kind==='hazard'){compare(result.checks,'respawned on the checkpoint platform',s.standing,e.standing);compare(result.checks,'respawned at the checkpoint position',+s.x.toFixed(2),e.checkpointX);}
 else{compare(result.checks,'stars',s.stars,e.stars);compare(result.checks,'discovery found',s.discoveryFound,true);compare(result.checks,'collected coin ids',s.coinIds,e.coinIds);compare(result.checks,'collected star ids',s.starIds,e.starIds);}
 result.ok=result.checks.every(c=>c.ok);return result;
}

/** Real keyboard input on the canvas: run right, then jump. */
async function keyboard(code){
 const lower=code.toLowerCase(),checks=[];await viewport(1600,900,false);
 await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});if(!await ready())return{error:'not ready'};await wait(1500);
 await evaluate(`document.querySelector('canvas[data-ready="true"]').focus()`);
 // Jump in place at the spawn first (a "?" block or a patrol further on can
 // cut a running jump short), then run right.
 const a=await state();await key('rawKeyDown','Space');
 let peak=-Infinity;for(let i=0;i<10;i++){await wait(60);const s=await state();peak=Math.max(peak,s.y);}
 await key('keyUp','Space');await wait(700);const before=await state();await key('rawKeyDown','ArrowRight');await wait(900);await key('keyUp','ArrowRight');await wait(400);const b=await state();const screen=await shot(`${lower}-keyboard`);
 checks.push({check:'ArrowRight moves the player right',ok:b.x>before.x+2,actual:+(b.x-before.x).toFixed(2)},{check:'Space makes the player jump',ok:peak>a.y+.6,actual:+(peak-a.y).toFixed(2)});
 return{checks,ok:checks.every(c=>c.ok),screens:[screen]};
}
/** On-screen touch buttons in a phone-landscape touch viewport (an emulation, not a phone). */
async function touch(code){
 await freshTab();
 const lower=code.toLowerCase(),checks=[];await viewport(844,390,true);await page('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const centre=label=>evaluate(`(()=>{const b=document.querySelector('button[aria-label=${JSON.stringify(label)}]');if(!b)return null;const r=b.getBoundingClientRect();return r.width?{x:r.x+r.width/2,y:r.y+r.height/2}:null;})()`);
 // Up to two attempts, each on a fresh load; both are reported.
 const attempts=[];
 for(let attempt=1;attempt<=2;attempt++){
  await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});if(!await ready())return{error:'not ready'};await wait(2500);
  const right=await centre('Move right'),jump=await centre('Jump');if(!right||!jump){attempts.push({attempt,buttons:false});break;}
  await evaluate(`window.__pointers=0;document.addEventListener('pointerdown',()=>window.__pointers++,true)`);
  // Jump in place at the spawn first (later on the route a block or a patrol
  // can cut a jump short), then hold right.
  const a=await state();await page('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:jump.x,y:jump.y,id:1}]});
  let peak=-Infinity;for(let i=0;i<10;i++){await wait(60);const s=await state();peak=Math.max(peak,s.y);}
  await page('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(700);
  const before=await state();await page('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:right.x,y:right.y,id:2}]});await wait(900);const after=await state();
  await page('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(400);const moved={x:a.x+(after.x-before.x)};
  attempts.push({attempt,buttons:true,pointerEventsReachedPage:await evaluate('window.__pointers'),status:a.status,moved:+(moved.x-a.x).toFixed(2),jumped:+(peak-a.y).toFixed(2)});
  if(moved.x>a.x+2&&peak>a.y+.6)break;
 }
 const last=attempts.at(-1);
 checks.push({check:'touch buttons are shown in a touch viewport',ok:!!last?.buttons},{check:'holding the right button moves the player',ok:(last?.moved??0)>2,actual:last?.moved},{check:'the jump button makes the player jump',ok:(last?.jumped??0)>.6,actual:last?.jumped});
 const screen=await shot(`${lower}-touch-viewport`);await page('Emulation.setTouchEmulationEnabled',{enabled:false});
 return{checks,attempts,ok:checks.every(c=>c.ok),screens:[screen],note:'Chromium touch emulation on a laptop; not a real phone.'};
}

const only=args.only;
if(only==='touch'||only==='keyboard'){
 const report=JSON.parse(readFileSync(join(out,'playthrough-results.json'),'utf8')),check=only==='touch'?touch:keyboard;
 for(const code of codes){const entry=report.countries[code]??={};try{entry[only]=await check(code);}catch(error){entry[only]={error:String(error.message||error)};}console.log(code,only,entry[only].ok?'PASS':'FAIL',JSON.stringify(entry[only].checks));}
 report[only+'RerunAt']=new Date().toISOString();writeFileSync(join(out,'playthrough-results.json'),JSON.stringify(report,null,1));await Promise.race([send('Browser.close').catch(()=>{}),wait(3000)]);socket.close();child.kill();process.exit(0);
}
const report={base,startedAt:new Date().toISOString(),browser:version.Browser,countries:{}};
for(const code of codes){
 const lower=code.toLowerCase(),entry=report.countries[code]={};
 for(const kind of ['complete-bonus','hazard','complete-main']){
  const script=JSON.parse(readFileSync(join(out,`${lower}-${kind}.json`),'utf8'));
  try{entry[kind]=await replay(code,script);}catch(error){entry[kind]={error:String(error.message||error)};}
  console.log(code,kind,entry[kind].ok?'PASS':'FAIL',JSON.stringify(entry[kind].final||entry[kind].error));
  for(const c of entry[kind].checks||[])if(!c.ok)console.log('  failed:',c.check,JSON.stringify(c.actual),'expected',JSON.stringify(c.expected));
 }
 try{entry.keyboard=await keyboard(code);}catch(error){entry.keyboard={error:String(error.message||error)};}
 try{entry.touch=await touch(code);}catch(error){entry.touch={error:String(error.message||error)};}
 console.log(code,'keyboard',entry.keyboard.ok?'PASS':'FAIL',JSON.stringify(entry.keyboard.checks),'touch',entry.touch.ok?'PASS':'FAIL',JSON.stringify(entry.touch.checks));
}
// Saved progress: storage after the runs, then the country cards after a fresh load.
await viewport(1600,900,false);
report.savedProgress=await evaluate(`(()=>{try{return JSON.parse(localStorage.getItem('socialu.world-explorer.v1'));}catch{return null;}})()`);
report.cards={};
for(const code of codes){
 await page('Page.navigate',{url:`${base}/world-explorer?country=${code}`});await wait(5000);
 const text=await evaluate(`document.querySelector('[aria-label="Selected destination"]')?.innerText||''`);
 const saved=report.savedProgress?.countries?.[code];
 report.cards[code]={completedOnCard:/completed/i.test(text),cardText:text.split('\n').filter(Boolean).slice(0,10),saved,screens:[await shot(`${code.toLowerCase()}-card-after-reload`)],ok:/completed/i.test(text)&&!!saved?.completed};
 console.log(code,'saved progress',report.cards[code].ok?'PASS':'FAIL',JSON.stringify(saved));
}
report.pageErrors=errors;report.finishedAt=new Date().toISOString();
writeFileSync(join(out,'playthrough-results.json'),JSON.stringify(report,null,1));
await Promise.race([send('Browser.close').catch(()=>{}),wait(3000)]);socket.close();child.kill();
