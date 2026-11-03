// Compare two builds of the app level by level: the same view must look the
// same and the game must still play.
//   node --experimental-websocket scripts/world-explorer/compare-builds.mjs --before http://127.0.0.1:3101 --after http://localhost:3100 --codes JPN,ECU
// For each level and build, in one headless Edge with reduced motion (so
// clouds, water and wildlife hold still): load the level, wait until it is
// ready and its photographic surface maps are on, pause the run, and capture
// the 3D canvas alone (all page UI hidden). The two captures are compared in
// the browser: mean absolute difference per channel (0-255) and the share of
// pixels differing by more than 24 in any channel. Then, in the after build,
// hold the right arrow and press jump and check the player moves and jumps.
// Page errors are recorded for both builds. Writes <out>/compare-builds.json
// and the capture pairs to <out>/compare/.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'JPN').split(','),before=args.before||'http://127.0.0.1:3101',after=args.after||'http://localhost:3100',out=args.out||'documentation/world-explorer/review/south-america/shader-prep';
const shots=join(out,'compare');mkdirSync(shots,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),port=9500+Math.floor(Math.random()*90);
const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-compare-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]||m.params.exceptionDetails?.text);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description??'').join(' ').slice(0,200));});
const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
const page=(m,p)=>send(m,p,sessionId),evaluate=async x=>(await page('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await page('Runtime.enable');await page('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await page('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const key=async(type,k,code,keyCode)=>page('Input.dispatchKeyEvent',{type,key:k,code,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});
const capture=async(base,code)=>{
 errors.length=0;await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});
 let ready=false;for(let i=0;i<450&&!ready;i++){ready=await evaluate(`!!document.querySelector('canvas[data-ready="true"]')&&!!window.worldExplorerReview`);if(!ready)await wait(100);}
 // Photographic surface maps arrive after mount in the old build; wait for them in both.
 for(let i=0;i<50;i++){if(await evaluate(`(()=>{const c=document.querySelector('canvas[data-ready="true"]');return !!c&&(c.dataset.surfaceDetail==='natural-rock-pbr')})()`))break;await wait(100);}
 await wait(2500);await evaluate('window.worldExplorerReview?.pause()');await wait(400);
 await evaluate(`(()=>{const s=document.createElement('style');s.textContent='*{visibility:hidden!important}canvas{visibility:visible!important}';document.head.appendChild(s);})()`);await wait(300);
 const {data}=await page('Page.captureScreenshot',{format:'png'});return{ready,data,errors:[...errors]};
};
// A play smoke check: the player jumps and runs. Key timing goes through the
// debugging protocol, so distances vary a little run to run; exact gameplay
// equality is checked separately by replaying recorded routes.
const playCheck=async(base,code)=>{
 errors.length=0;await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1&review=1`});
 let ready=false;for(let i=0;i<450&&!ready;i++){ready=await evaluate(`!!document.querySelector('canvas[data-ready="true"]')&&!!window.worldExplorerReview`);if(!ready)await wait(100);}
 if(!ready)return{moved:0,jumped:0,ok:false,errors:[...errors,'level did not become ready within 45 s']};
 await wait(800);await evaluate(`document.querySelector('canvas')?.focus()`);
 const state=()=>evaluate('window.worldExplorerReview.reviewState()');
 // Jump in place first (a "?" block can sit above a spot a few steps on), then run.
 const s0=await state();await key('rawKeyDown',' ','Space',32);let top=s0.y;for(let i=0;i<30;i++){await wait(35);top=Math.max(top,(await state()).y);}await key('keyUp',' ','Space',32);await wait(600);
 const x0=(await state()).x;await key('rawKeyDown','ArrowRight','ArrowRight',39);await wait(700);await key('keyUp','ArrowRight','ArrowRight',39);await wait(200);const x1=(await state()).x;
 return{moved:+(x1-x0).toFixed(2),jumped:+(top-s0.y).toFixed(2),ok:x1-x0>1&&top-s0.y>.5,errors:[...errors]};
};
const report={before,after,browser:version.Browser,reducedMotion:true,levels:{}};
for(const code of codes){
 const a=await capture(before,code),b=await capture(after,code);
 writeFileSync(join(shots,`${code.toLowerCase()}-before.png`),Buffer.from(a.data,'base64'));writeFileSync(join(shots,`${code.toLowerCase()}-after.png`),Buffer.from(b.data,'base64'));
 const play={before:await playCheck(before,code),after:await playCheck(after,code)};play.ok=play.before.ok&&play.after.ok;
 // Pixel comparison in the browser.
 const diff=await evaluate(`(async()=>{const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});const [p,q]=await Promise.all([load('data:image/png;base64,${a.data}'),load('data:image/png;base64,${b.data}')]);const c=document.createElement('canvas');c.width=p.width;c.height=p.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(p,0,0);const A=g.getImageData(0,0,c.width,c.height).data;g.clearRect(0,0,c.width,c.height);g.drawImage(q,0,0);const B=g.getImageData(0,0,c.width,c.height).data;let sum=0,over=0;for(let i=0;i<A.length;i+=4){const d=Math.max(Math.abs(A[i]-B[i]),Math.abs(A[i+1]-B[i+1]),Math.abs(A[i+2]-B[i+2]));sum+=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]);if(d>24)over++;}const n=A.length/4;return{meanAbsDiff:+(sum/(n*3)).toFixed(2),pixelsOver24Pct:+(over/n*100).toFixed(2)};})()`);
 report.levels[code]={readyBefore:a.ready,readyAfter:b.ready,...diff,errorsBefore:a.errors,errorsAfter:b.errors,play};
 console.log(`${code} · mean diff ${diff?.meanAbsDiff} · pixels >24: ${diff?.pixelsOver24Pct}% · play ${play.ok?'PASS':'FAIL'} (moved ${play.before.moved}→${play.after.moved}, jumped ${play.before.jumped}→${play.after.jumped}) · errors before ${a.errors.length+play.before.errors.length} after ${b.errors.length+play.after.errors.length}`);
}
writeFileSync(join(out,'compare-builds.json'),JSON.stringify(report,null,1));
await Promise.race([send('Browser.close'),wait(3000)]);socket.close();child.kill();
