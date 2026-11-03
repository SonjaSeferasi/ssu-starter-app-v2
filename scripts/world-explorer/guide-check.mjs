// Check each South American country guide in the running app: the guide's
// Capital, Place and Landscape lines and its reference photograph.
//   node --experimental-websocket scripts/world-explorer/guide-check.mjs --base http://localhost:3100
// Opens each level, presses "Country guide", waits for the photo, and writes
// <out>/guide-check.json with the text read from the page and a screenshot each.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const base=args.base||'http://localhost:3100',out=args.out||'documentation/world-explorer/review/south-america/guide-fix',codes=(args.codes||'BRA,BOL,URY,PER,ARG,CHL,COL,ECU,GUY,PRY,SUR,VEN').split(',');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),port=9700+Math.floor(Math.random()*90);mkdirSync(out,{recursive:true});
const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-guide-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}});
const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
const page=(m,p)=>send(m,p,sessionId),evaluate=async x=>(await page('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await page('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
const results={base,checkedAt:new Date().toISOString(),countries:{}};
for(const code of codes){
 await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1`});
 for(let i=0;i<160;i++){if(await evaluate(`!!document.querySelector('canvas[data-ready="true"]')`))break;await wait(250);}await wait(800);
 const opened=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Country guide');if(!b)return false;b.click();return true;})()`);
 let photo=null;for(let i=0;i<40&&!photo;i++){await wait(250);photo=await evaluate(`(()=>{const img=document.querySelector('[role="dialog"] figure img, figure img');return img&&img.complete&&img.naturalWidth>0?{alt:img.alt,src:img.src,caption:img.closest('figure')?.querySelector('figcaption')?.innerText||''}:null;})()`);}
 const facts=await evaluate(`(()=>{const out={};for(const div of document.querySelectorAll('dl div')){const dt=div.querySelector('dt')?.innerText,dd=div.querySelector('dd')?.innerText;if(dt)out[dt]=dd;}out.heading=document.querySelector('#run-dialog-title')?.innerText||'';out.discovery=document.querySelector('dl')?.previousElementSibling?.innerText?.slice(0,160)||'';return out;})()`);
 const {data}=await page('Page.captureScreenshot',{format:'jpeg',quality:82});const shot=`guide-${code.toLowerCase()}.jpg`;writeFileSync(join(out,shot),Buffer.from(data,'base64'));
 results.countries[code]={opened,...facts,photo,screenshot:shot};
 console.log(code,'|',facts['Capital / seat'],'|',facts.Place,'|',facts.Landscape,'|',photo?photo.alt:'no photo');
}
writeFileSync(join(out,'guide-check.json'),JSON.stringify(results,null,1));
await Promise.race([send('Browser.close'),wait(3000)]);socket.close();child.kill();
