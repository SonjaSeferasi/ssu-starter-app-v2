// Records which WebGL renderer the playthrough browser actually uses, with the
// same launch flags as scripts/world-explorer/playthrough.mjs. Software
// renderers (SwiftShader, llvmpipe, "Basic Render Driver") are reported as such.
//   node --experimental-websocket scripts/world-explorer/africa-gpu-probe.mjs --base http://127.0.0.1:3117 --out <file>
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).reduce((p,v,i,a)=>v.startsWith('--')?[...p,[v.slice(2),a[i+1]]]:p,[]));
const browser=args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',base=args.base||'http://127.0.0.1:3117',port=9950+Math.floor(Math.random()*40);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(browser,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-gpu-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--no-default-browser-check','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
const {result:{targetId}}=await send('Target.createTarget',{url:`${base}/world-explorer?country=KEN&play=1&review=1`});
const {result:{sessionId}}=await send('Target.attachToTarget',{targetId,flatten:true});
let info=null;
for(let i=0;i<120&&!info?.ready;i++){await wait(1000);const r=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const c=document.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');const ext=gl&&gl.getExtension('WEBGL_debug_renderer_info');return{ready:!!document.querySelector('canvas[data-ready="true"]')&&!!window.worldExplorerReview,vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,frameTimes:window.worldExplorerReview?.reviewStats?.().frameTimes?.slice(-60)??[]};})()`},sessionId);info=r.result?.result?.value;}
const ft=info?.frameTimes||[],avg=ft.length?ft.reduce((a,b)=>a+b,0)/ft.length:null;
const software=/swiftshader|llvmpipe|basic render|software|microsoft basic/i.test(info?.renderer||'');
const report={checkedAt:new Date().toISOString(),browser:version.Browser,flags:'--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist (as playthrough.mjs)',vendor:info?.vendor,renderer:info?.renderer,hardware:!!info?.renderer&&!software,levelReady:!!info?.ready,averageFrameMs:avg&&+avg.toFixed(2)};
writeFileSync(args.out||'tmp/africa-verify/gpu-probe.json',JSON.stringify(report,null,1));console.log(JSON.stringify(report));
await send('Browser.close').catch(()=>{});socket.close();child.kill();process.exit(0);
