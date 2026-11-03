// Time every WebGL shader-program link, link-status wait and texture upload in
// a level's first seconds, in a fresh (cold) browser profile:
//   node --experimental-websocket scripts/world-explorer/shader-timeline.mjs --codes ECU --base http://localhost:3100
// The WebGL calls are wrapped before the page loads, so nothing in the app is
// changed. For each level it reports when the level became ready, each program
// link (with three.js's SHADER_NAME and the time spent in the first status
// query, which is where the browser blocks), texture uploads, and every frame
// over 50 ms with the GL work done inside it. Writes <out>/shader-timeline.json.
//
// Fault injection, to exercise the start-up timeout paths:
//   --delay-textures <ms>  hold every photographic surface map request
//                          (/world-explorer/materials/*) for this long
//   --slow-compile <ms>    report shader links as unfinished
//                          (COMPLETION_STATUS_KHR false) for this long after load
//   --no-parallel 1        hide KHR_parallel_shader_compile, as on browsers without it
//   --fail-textures 1      fail every surface map request, as when the files cannot load
//   --warm 1               load the level once, then trace a reload in the same
//                          browser (HTTP, shader and GPU caches warm)
// It also records when the surface maps were applied (canvas data-surface-detail).
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'ECU').split(','),base=args.base||'http://localhost:3100',out=args.out||'documentation/world-explorer/review/south-america/shader-prep',seconds=Number(args.seconds||10);
const wait=ms=>new Promise(r=>setTimeout(r,ms));mkdirSync(out,{recursive:true});
const slowCompile=Number(args['slow-compile']||0),noParallel=args['no-parallel']==='1',delayTextures=Number(args['delay-textures']||0),failTextures=args['fail-textures']==='1';
const hook=`(()=>{const t0=performance.now(),log=[];window.__glTimeline={t0,log,ready:null,surfaces:null};
 const names=new WeakMap(),slowCompile=${slowCompile},noParallel=${noParallel};
 for(const C of [WebGL2RenderingContext,WebGLRenderingContext]){const p=C.prototype;
  if(slowCompile){const g=p.getProgramParameter;p.getProgramParameter=function(program,pname){if(pname===0x91B1&&performance.now()-t0<slowCompile)return false;return g.call(this,program,pname);};}
  if(noParallel){const ge=p.getExtension,gs=p.getSupportedExtensions;p.getExtension=function(name){return /parallel_shader_compile/i.test(name)?null:ge.call(this,name);};p.getSupportedExtensions=function(){return (gs.call(this)||[]).filter(n=>!/parallel_shader_compile/i.test(n));};}
  const link=p.linkProgram;p.linkProgram=function(program){const shaders=this.getAttachedShaders(program)||[];let name='';for(const s of shaders){const src=this.getShaderSource(s)||'',type=/#define SHADER_TYPE ([^\\n]+)/.exec(src),label=/#define SHADER_NAME ([^\\n]+)/.exec(src);if(!type&&!label)continue;const flags=['USE_INSTANCING','USE_SHADOWMAP','DEPTH_PACKING','USE_MAP','USE_ENVMAP','USE_COLOR','FLAT_SHADED','DOUBLE_SIDED','USE_FOG','USE_SKINNING','USE_ALPHAHASH','ALPHATEST','USE_BATCHING'].filter(f=>src.includes('#define '+f));name=[type&&type[1],label&&label[1]].filter(Boolean).join(' / ')+(flags.length?' ['+flags.join(' ')+']':'');}names.set(program,name);const a=performance.now();const r=link.call(this,program);log.push({kind:'link',t:a-t0,ms:performance.now()-a,name});return r;};
  for(const f of ['getProgramParameter','getProgramInfoLog']){const g=p[f];p[f]=function(program,...x){const a=performance.now();const r=g.call(this,program,...x);const ms=performance.now()-a;if(ms>2)log.push({kind:'program-wait',t:a-t0,ms,name:names.get(program)||'',fn:f});return r;};}
  for(const f of ['texImage2D','texSubImage2D','compressedTexImage2D','texImage3D']){const g=p[f];if(!g)continue;p[f]=function(...x){const a=performance.now();const r=g.apply(this,x);const ms=performance.now()-a;if(ms>2)log.push({kind:'texture',t:a-t0,ms,fn:f});return r;};}
 }
 const frames=[];window.__glTimeline.frames=frames;let last=performance.now();const tick=now=>{frames.push({t:now-t0,ms:now-last});last=now;requestAnimationFrame(tick);};requestAnimationFrame(tick);
 const watch=setInterval(()=>{const g=window.__glTimeline,c=document.querySelector('canvas[data-ready="true"]'),s=document.querySelector('canvas[data-surface-detail]');if(c&&g.ready===null)g.ready=performance.now()-t0;if(s&&g.surfaces===null)g.surfaces=performance.now()-t0;if(g.ready!==null&&g.surfaces!==null)clearInterval(watch);},5);
})();`;
const report={base,browser:'',seconds,faults:{delayTextures,slowCompile,noParallel,failTextures},warm:args.warm==='1',levels:{}};
for(const code of codes){
 // A fresh browser and profile per level: every level starts cold.
 const port=9600+Math.floor(Math.random()*90);
 const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-shader-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--mute-audio','about:blank'],{stdio:'ignore'});
 let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
 report.browser=version.Browser;
 const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}
  // Held surface-map requests continue after the injected delay.
  else if(m.method==='Fetch.requestPaused')setTimeout(()=>failTextures?send('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'},m.sessionId):send('Fetch.continueRequest',{requestId:m.params.requestId},m.sessionId),delayTextures);});
 const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const page=(m,p)=>send(m,p,sessionId),evaluate=async x=>(await page('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
 await page('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:1,mobile:false});
 await page('Page.enable');await page('Page.addScriptToEvaluateOnNewDocument',{source:hook});
 if(delayTextures||failTextures)await page('Fetch.enable',{patterns:[{urlPattern:'*/world-explorer/materials/*'}]});
 if(args.warm==='1'){await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});for(let i=0;i<300;i++){if(await evaluate('!!(window.__glTimeline&&window.__glTimeline.ready)'))break;await wait(100);}await wait(3000);}
 await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});
 for(let i=0;i<300;i++){if(await evaluate('!!(window.__glTimeline&&window.__glTimeline.ready)'))break;await wait(100);}
 await wait(seconds*1000);
 const data=await evaluate('JSON.stringify(window.__glTimeline)');const g=JSON.parse(data||'{}');
 const ready=g.ready??NaN,log=g.log||[],frames=(g.frames||[]).slice(1);
 const r1=v=>Math.round(v*10)/10,after=t=>r1(t-ready);
 const long=frames.filter(f=>f.ms>50).map(f=>{const inside=log.filter(e=>e.t>=f.t-f.ms&&e.t<=f.t);return{atMsAfterReady:after(f.t),ms:r1(f.ms),links:inside.filter(e=>e.kind==='link').length,programWaitMs:r1(inside.filter(e=>e.kind==='program-wait').reduce((a,e)=>a+e.ms,0)),textureMs:r1(inside.filter(e=>e.kind==='texture').reduce((a,e)=>a+e.ms,0)),programs:[...new Set(inside.filter(e=>e.kind!=='texture').map(e=>e.name))]};});
 const linksAfterReady=log.filter(e=>e.kind==='link'&&e.t>ready).map(e=>({atMsAfterReady:after(e.t),name:e.name}));
 const steady=frames.filter(f=>f.t>ready+1000);
 report.levels[code]={readyMs:r1(ready),surfacesAtMsAfterReady:g.surfaces==null?null:after(g.surfaces),programsLinked:log.filter(e=>e.kind==='link').length,programsLinkedAfterReady:linksAfterReady.length,linksAfterReady,programWaitMsTotal:r1(log.filter(e=>e.kind==='program-wait').reduce((a,e)=>a+e.ms,0)),framesOver50msAfterReady:long.filter(f=>f.atMsAfterReady>0).length,worstFrameAfterReadyMs:r1(Math.max(0,...frames.filter(f=>f.t>ready).map(f=>f.ms))),worstFrameFrom1sAfterReadyMs:r1(Math.max(0,...steady.map(f=>f.ms))),long};
 const L=report.levels[code];console.log(`${code} ready ${L.readyMs} ms · surfaces ${L.surfacesAtMsAfterReady??'none'} ms after ready · programs ${L.programsLinked} (after ready ${L.programsLinkedAfterReady}) · worst after ready ${L.worstFrameAfterReadyMs} ms · worst from +1 s ${L.worstFrameFrom1sAfterReadyMs} ms · >50 ms after ready ${L.framesOver50msAfterReady}`);
 for(const f of L.long)console.log(`   frame ${f.atMsAfterReady} ms after ready · ${f.ms} ms · links ${f.links} · program wait ${f.programWaitMs} ms · textures ${f.textureMs} ms · ${f.programs.join(', ')}`);
 await Promise.race([send('Browser.close'),wait(3000)]);socket.close();child.kill();await wait(500);
}
writeFileSync(join(out,args.file||'shader-timeline.json'),JSON.stringify(report,null,1));
