// Name the objects whose shader programs are created after a level is ready,
// and explain programs compiled twice (a material whose program key changed),
// in a fresh (cold) browser:
//   node --experimental-websocket scripts/world-explorer/shader-diagnose.mjs --code ECU --base http://localhost:3100
// three.js announces its scene and renderer to window.__THREE_DEVTOOLS__; the
// page script listens there, so the app itself is not changed. Each frame it
// compares the renderer's program list with the previous one and, for every
// new program, records which meshes use it, whether they existed when the
// level became ready, and, when the material already had another program, the
// parameters that differ between the two program keys.
// --delay-textures <ms> holds the photographic surface maps back, to see what a
// late swap compiles.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const delayTextures=Number(args['delay-textures']||0),code=args.code||'ECU',base=args.base||'http://localhost:3100',out=args.out||'documentation/world-explorer/review/south-america/shader-prep',seconds=Number(args.seconds||8);
const wait=ms=>new Promise(r=>setTimeout(r,ms));mkdirSync(out,{recursive:true});
const hook=`(()=>{const t0=performance.now(),found={scenes:[],renderers:[]},log=[];window.__shaderDiag={found,log,ready:null};
 const devtools=new EventTarget();devtools.addEventListener('observe',e=>{const o=e.detail;if(o&&o.isScene)found.scenes.push(o);else if(o&&typeof o.render==='function'&&o.info)found.renderers.push(o);});window.__THREE_DEVTOOLS__=devtools;
 const path=o=>{const names=[];for(let n=o;n&&names.length<5;n=n.parent)names.push(n.name||n.type);return names.join(' < ');};
 const known=new Set();let atReady=null;
 const tick=()=>{const renderer=found.renderers[0],scene=found.scenes.find(s=>s.children.length>0);
  if(renderer&&scene){
   if(!window.__shaderDiag.ready&&document.querySelector('canvas[data-ready="true"]')){window.__shaderDiag.ready=performance.now()-t0;atReady=new WeakSet();scene.traverse(o=>atReady.add(o));}
   for(const program of renderer.info.programs||[]){if(known.has(program.id))continue;known.add(program.id);
    const users=[];scene.traverse(o=>{const ms=Array.isArray(o.material)?o.material:o.material?[o.material]:[];for(const m of ms){const p=renderer.properties.get(m);if(p.currentProgram===program||(p.programs&&[...p.programs.values()].includes(program))){
     let changed=null;if(p.programs&&p.programs.size>1){const keys=[...p.programs.keys()].map(k=>k.split(','));const [a,b]=keys;changed=a.map((v,i)=>v!==b[i]?i+':'+v+'→'+b[i]:null).filter(Boolean).slice(0,12);}
     users.push({object:path(o),material:m.type+(m.name?' '+m.name:''),visible:o.visible,existedAtReady:atReady?atReady.has(o):'before-ready',programsOnMaterial:p.programs?p.programs.size:0,changedKeyParts:changed});}}});
    log.push({t:performance.now()-t0,program:program.name||'',id:program.id,key:program.cacheKey,users:users.slice(0,8),userCount:users.length});}
  }
  requestAnimationFrame(tick);};requestAnimationFrame(tick);
})();`;
const port=9600+Math.floor(Math.random()*90);
const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-shader-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}else if(m.method==='Fetch.requestPaused')setTimeout(()=>send('Fetch.continueRequest',{requestId:m.params.requestId},m.sessionId),delayTextures);});
const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
const page=(m,p)=>send(m,p,sessionId),evaluate=async x=>(await page('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await page('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:1,mobile:false});
await page('Page.enable');await page('Page.addScriptToEvaluateOnNewDocument',{source:hook});
if(delayTextures)await page('Fetch.enable',{patterns:[{urlPattern:'*/world-explorer/materials/*'}]});
await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});
for(let i=0;i<300;i++){if(await evaluate('!!(window.__shaderDiag&&window.__shaderDiag.ready)'))break;await wait(100);}
await wait(seconds*1000);
const result=JSON.parse(await evaluate('JSON.stringify({ready:window.__shaderDiag.ready,log:window.__shaderDiag.log,scenes:window.__shaderDiag.found.scenes.length,renderers:window.__shaderDiag.found.renderers.length})'));
for(const e of result.log)e.atMsAfterReady=Math.round(e.t-result.ready);
writeFileSync(join(out,`diagnose-${code.toLowerCase()}${args.tag?'-'+args.tag:''}.json`),JSON.stringify(result,null,1));
console.log(`${code} ready ${Math.round(result.ready)} ms · scenes ${result.scenes} · renderers ${result.renderers} · programs seen ${result.log.length}`);
for(const e of result.log.filter(e=>e.atMsAfterReady>-2000))console.log(`  +${e.atMsAfterReady} ms program ${e.id} ${e.program} · users ${e.userCount}: ${e.users.slice(0,3).map(u=>`${u.object} [${u.material}] visible=${u.visible} atReady=${u.existedAtReady} programs=${u.programsOnMaterial}${u.changedKeyParts?' diff '+u.changedKeyParts.join(' | '):''}`).join(' ;; ')}`);
await Promise.race([send('Browser.close'),wait(3000)]);socket.close();child.kill();
