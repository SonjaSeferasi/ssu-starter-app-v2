// Capture review evidence for World Explorer levels from the real running app
// in headless Microsoft Edge (or Chrome). Nothing is retouched.
//
// For each country it saves, from the actual game:
//   <code>-a-start.jpg     the start, in the normal gameplay camera
//   <code>-b-gameplay.jpg  the defining mechanic (gameplay camera at ground height)
//   <code>-c-landmark.jpg  the landmark from an explicit review camera
//   <code>-d-overview.jpg  the full-level overview
//   <code>-phone.jpg       the start in an 844x390 phone-landscape viewport
// and measures, while the level runs: load time to ready, average FPS and the
// 1% low from recorded frame times, draw calls, triangles, GPU geometries and
// textures, and the JS heap.
//
// Usage (with `npm run dev` already serving the app):
//   node --experimental-websocket scripts/world-explorer/capture-levels.mjs \
//     --codes BOL,BRA,VEN --out documentation/world-explorer/review/south-america/art-polish/after
// Options: --base http://localhost:3000  --browser "<path>"  --gpu 1 (hardware WebGL)
//          --uncapped 1 (disable vsync and the frame-rate limit, to see the margin)
//          --shots scripts/world-explorer/south-america-shots.json
//          --perf-only 1 (measure without screenshots; pair with --uncapped)
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'URY').split(','),out=args.out||'documentation/world-explorer/review/south-america',base=args.base||'http://localhost:3000';
const shots=JSON.parse(readFileSync(args.shots||'scripts/world-explorer/south-america-shots.json','utf8'));
const browser=args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',port=9300+Math.floor(Math.random()*500);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
mkdirSync(out,{recursive:true});
const flags=[...(args.gpu?['--enable-gpu','--use-angle=d3d11']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),...(args.uncapped?['--disable-gpu-vsync','--disable-frame-rate-limit']:[])];
const child=spawn(browser,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-capture-'))}`,...flags,'--ignore-gpu-blocklist','--enable-precise-memory-info','--no-first-run','--no-default-browser-check','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
if(!version)throw new Error('The browser did not open a DevTools endpoint.');
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result);}});
// Every call times out, so one unresponsive page cannot stall the whole run.
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(new Error(`${method} timed out`));},45000);pending.set(n,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
/** Average FPS and the 1% low (the FPS of the slowest 1% of frames). */
const frameStats=times=>{const t=times.filter(v=>v>0);if(!t.length)return null;const sorted=[...t].sort((a,b)=>b-a),worst=sorted.slice(0,Math.max(1,Math.ceil(t.length*.01))),mean=t.reduce((a,b)=>a+b,0)/t.length;return{frames:t.length,averageFps:Math.round(1000/mean),onePercentLowFps:Math.round(1000/(worst.reduce((a,b)=>a+b,0)/worst.length)),worstFrameMs:Math.round(sorted[0]*10)/10};};
const results=[];
for(const code of codes){
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const page=(method,params)=>send(method,params,sessionId),evaluate=async expression=>(await page('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
 const shot=async name=>{const {data}=await page('Page.captureScreenshot',{format:'jpeg',quality:86});writeFileSync(join(out,`${code.toLowerCase()}-${name}.jpg`),Buffer.from(data,'base64'));};
 const ready=async()=>{for(let i=0;i<120;i++){if(await evaluate(`!!document.querySelector('canvas[data-ready="true"]')&&!!window.worldExplorerReview`))return true;await wait(250);}return false;};
 const record={code,shots:shots[code]||null,desktop:{},phone:{}};
 for(const [view,width,height,mobile] of [['desktop',1600,900,false],['phone',844,390,true]])try{
  await page('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  const started=Date.now();await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});
  if(!await ready()){record[view].error='Level did not report ready within 30 s.';continue;}
  record[view].readyMs=Date.now()-started;
  // Settle, then sample five seconds of the running level.
  await wait(8000);
  const stats=await evaluate(`(()=>{const s=window.worldExplorerReview.reviewStats();return{...s,frameTimes:s.frameTimes.slice(-600),heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null};})()`);
  Object.assign(record[view],{...frameStats(stats.frameTimes),drawCalls:stats.calls,triangles:stats.triangles,geometries:stats.geometries,textures:stats.textures,jsHeapMB:stats.heap});
  if(args['perf-only'])continue;
  if(view==='phone'){await shot('phone');continue;}
  await shot('a-start');
  const s=shots[code];
  if(s?.b){await evaluate(`window.worldExplorerReview.setReviewView('scan',${s.b.x})`);await wait(1500);await shot('b-gameplay');}
  if(s?.c){await evaluate(`window.worldExplorerReview.setReviewCamera(${JSON.stringify({position:s.c.position,target:s.c.target,fov:s.c.fov??44})})`);await wait(1500);await shot('c-landmark');}
  await evaluate(`window.worldExplorerReview.setReviewView('overview')`);await wait(2500);await shot('d-overview');
  await evaluate(`window.worldExplorerReview.setReviewView('gameplay')`);
 }catch(error){record[view].error=String(error.message||error);}
 results.push(record);console.log(JSON.stringify({code,desktop:record.desktop,phone:record.phone}));
 await send('Target.closeTarget',{targetId});
}
writeFileSync(join(out,'capture-results.json'),JSON.stringify({capturedAt:new Date().toISOString(),browser,base,renderer:args.gpu?'hardware (ANGLE D3D11) in headless Edge':'SwiftShader software WebGL',frameRate:args.uncapped?'uncapped (vsync and frame-rate limit disabled)':'browser default (capped)',note:'Measured on the development laptop in a headless browser while the level idles at its start. The phone figures emulate an 844x390 viewport on the laptop GPU; they are not a phone. Real-device testing is still required.',results},null,1));
await Promise.race([send('Browser.close').catch(()=>{}),wait(3000)]);socket.close();child.kill();
