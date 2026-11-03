// Profile a level's start-up frame hitches in the production build, cold and warm:
//   node --experimental-websocket scripts/world-explorer/profile-hitch.mjs --code ECU --base http://localhost:3100 --runs 3
// Run 1 uses a fresh browser profile (cold HTTP, shader and GPU caches); later
// runs reload the same level in the same browser (warm). For each run it
// records a Chromium trace and a JavaScript CPU profile from navigation until
// 10 s after the level is ready, then reports every animation frame and every
// main-thread task over 50 ms, the trace events inside them, and the
// JavaScript functions sampled during them. No cause is assumed.
// Writes <out>/<code>-hitch-profile.json.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const code=args.code||'ECU',base=args.base||'http://localhost:3100',runs=Number(args.runs||3),out=args.out||'documentation/world-explorer/review/south-america/acceptance';
const wait=ms=>new Promise(r=>setTimeout(r,ms)),port=9500+Math.floor(Math.random()*90);mkdirSync(out,{recursive:true});
const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-prof-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),listeners=[];
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}else if(m.method)for(const l of listeners)l(m);});
const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
const page=(m,p)=>send(m,p,sessionId),evaluate=async x=>(await page('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await page('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:1,mobile:false});await page('Profiler.enable');
const categories=['devtools.timeline','disabled-by-default-devtools.timeline','disabled-by-default-devtools.timeline.frame','v8','v8.execute','blink.user_timing','gpu','toplevel','disabled-by-default-gpu.service'].join(',');
const report={code,base,browser:version.Browser,startedAt:new Date().toISOString(),runs:[]};

for(let run=1;run<=runs;run++){
 const events=[];const done=new Promise(resolve=>{listeners.push(m=>{if(m.method==='Tracing.dataCollected')events.push(...m.params.value);if(m.method==='Tracing.tracingComplete')resolve();});});
 await page('Tracing.start',{categories,transferMode:'ReportEvents'});await page('Profiler.setSamplingInterval',{interval:500});await page('Profiler.start');
 const started=Date.now();await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});
 for(let i=0;i<200;i++){if(await evaluate(`!!document.querySelector('canvas[data-ready="true"]')&&!!window.worldExplorerReview`))break;await wait(150);}
 const readyMs=Date.now()-started;await wait(10000);
 const frameTimes=await evaluate('window.worldExplorerReview.reviewStats().frameTimes');
 const {profile}=await page('Profiler.stop');await page('Tracing.end');await done;listeners.length=0;
 // The renderer main thread: the thread that ran the animation-frame callbacks.
 const fire=events.filter(e=>e.name==='FireAnimationFrame'&&e.ph==='X');const main=fire[0]?{pid:fire[0].pid,tid:fire[0].tid}:null;
 const onMain=e=>main&&e.pid===main.pid&&e.tid===main.tid;
 const long=[...fire.filter(e=>e.dur>50000).map(e=>({kind:'animation-frame',ts:e.ts,dur:e.dur})),...events.filter(e=>onMain(e)&&e.ph==='X'&&(e.name==='RunTask'||e.name==='ThreadControllerImpl::RunTask')&&e.dur>50000).map(e=>({kind:'task',ts:e.ts,dur:e.dur}))];
 let firstTs=Infinity;for(const e of events)if(e.ts>0&&e.ts<firstTs)firstTs=e.ts;
 // JavaScript samples: profile time deltas are in microseconds on the same clock as the trace.
 const nodes=new Map(profile.nodes.map(n=>[n.id,n]));let t=profile.startTime;const samples=profile.samples.map((nodeId,i)=>{t+=profile.timeDeltas[i];return{t,node:nodes.get(nodeId)};});
 const stack=node=>{const names=[];for(let n=node;n;n=[...nodes.values()].find(p=>p.children?.includes(n.id))){const f=n.callFrame;if(f.functionName||f.url)names.push(`${f.functionName||'(anonymous)'}@${(f.url||'').split('/').pop()}:${f.lineNumber}`);if(names.length>6)break;}return names;};
 const detail=long.map(item=>{
  const inside=events.filter(e=>e.ph==='X'&&e.ts>=item.ts&&e.ts+(e.dur||0)<=item.ts+item.dur&&e.dur>2000).reduce((a,e)=>{const k=`${e.name}${e.args?.data?.url?' '+String(e.args.data.url).split('/').pop():''}`;a[k]=(a[k]||0)+e.dur;return a;},{});
  const js=samples.filter(s=>s.t>=item.ts&&s.t<=item.ts+item.dur).reduce((a,s)=>{const f=s.node.callFrame,k=`${f.functionName||'(anonymous)'}@${(f.url||'').split('/').pop()}:${f.lineNumber}`;a[k]=(a[k]||0)+1;return a;},{});
  const topJs=Object.entries(js).sort((a,b)=>b[1]-a[1]).slice(0,10);const hot=samples.filter(s=>s.t>=item.ts&&s.t<=item.ts+item.dur&&`${s.node.callFrame.functionName||'(anonymous)'}@${(s.node.callFrame.url||'').split('/').pop()}:${s.node.callFrame.lineNumber}`===topJs[0]?.[0])[0];
  return{...item,atMsFromStart:Math.round((item.ts-firstTs)/1000),durMs:Math.round(item.dur/1000),traceEventsMs:Object.fromEntries(Object.entries(inside).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>[k,Math.round(v/1000)])),jsSamples:topJs,topStack:hot?stack(hot.node):[]};
 });
 const ft=frameTimes.filter(v=>v>0),sorted=[...ft].sort((a,b)=>b-a);
 report.runs.push({run,cache:run===1?'cold (fresh profile)':'warm (same browser, reload)',readyMs,frames:ft.length,worstFrameMs:+sorted[0].toFixed(1),framesOver50ms:ft.filter(v=>v>50).length,framesOver20ms:ft.filter(v=>v>20).length,long:detail});
 console.log(`run ${run} ${run===1?'cold':'warm'} ready ${readyMs} ms · worst frame ${sorted[0].toFixed(1)} ms · frames >50 ms ${ft.filter(v=>v>50).length} · long items ${detail.length}`);
 for(const d of detail)console.log(`  ${d.kind} at ${d.atMsFromStart} ms · ${d.durMs} ms · trace ${JSON.stringify(d.traceEventsMs)} · js ${JSON.stringify(d.jsSamples.slice(0,4))}`);
}
writeFileSync(join(out,`${code.toLowerCase()}-hitch-profile.json`),JSON.stringify(report,null,1));
await Promise.race([send('Browser.close'),wait(3000)]);socket.close();child.kill();
