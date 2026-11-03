// Compose review sheets and country-card previews from real in-game captures
// (made by capture-levels.mjs). Images are only arranged and scaled, never
// retouched. Uses headless Edge to lay out the page and save it as JPEG.
//
//   node --experimental-websocket scripts/world-explorer/compose-review.mjs \
//     --codes BOL,BRA,VEN --dir documentation/world-explorer/review/south-america/art-polish
// Writes <dir>/compare-<code>.jpg (before | after for shots A–D, where both
// exist) and public/world-explorer/previews/<iso2>.jpg from the latest start shot.
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'BOL').split(','),dir=args.dir||'documentation/world-explorer/review/south-america/art-polish',previews='public/world-explorer/previews';
const iso2={ARG:'ar',BOL:'bo',BRA:'br',CHL:'cl',COL:'co',ECU:'ec',GUY:'gy',PRY:'py',PER:'pe',SUR:'sr',URY:'uy',VEN:'ve'};
const shots=[['a-start','A · Start'],['b-gameplay','B · Main gameplay'],['c-landmark','C · Landmark'],['d-overview','D · Overview']];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),port=9900+Math.floor(Math.random()*90);
mkdirSync(previews,{recursive:true});
const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-compose-'))}`,'about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}});
const send=(method,params={},sessionId)=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
const page=(method,params)=>send(method,params,sessionId);
const dataUri=file=>`data:image/jpeg;base64,${readFileSync(file).toString('base64')}`;
const render=async(html,width,height,file,quality=84)=>{
 await page('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 const {frameTree}=await page('Page.getFrameTree');await page('Page.setDocumentContent',{frameId:frameTree.frame.id,html});await wait(800);
 const {data}=await page('Page.captureScreenshot',{format:'jpeg',quality});writeFileSync(file,Buffer.from(data,'base64'));
};
for(const code of codes){
 const lower=code.toLowerCase(),rows=shots.map(([shot,label])=>[label,join(dir,'before',`${lower}-${shot}.jpg`),join(dir,'after',`${lower}-${shot}.jpg`)]).filter(([,before])=>existsSync(before));
 const hasAfter=rows.some(([,,after])=>existsSync(after));
 if(hasAfter){
  const cell=(file,caption)=>existsSync(file)?`<figure><img src="${dataUri(file)}"><figcaption>${caption}</figcaption></figure>`:`<figure class="missing"><figcaption>${caption} · not captured</figcaption></figure>`;
  const html=`<!doctype html><html><body style="margin:0;background:#11161c;font:600 18px system-ui;color:#e8eef2"><h1 style="margin:14px 20px;font-size:24px">${code} · before (left) and after (right) · actual in-game captures</h1>${rows.map(([label,before,after])=>`<section style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px 10px">${cell(before,label+' · before')}${cell(after,label+' · after')}</section>`).join('')}<style>figure{margin:0}img{width:100%;display:block;border-radius:6px}figcaption{padding:4px 2px 0;font-size:15px;color:#b9c6d0}</style></body></html>`;
  await render(html,1600,70+rows.length*(780*9/16+34),join(dir,`compare-${lower}.jpg`),80);
 }
 const start=[join(dir,'after',`${lower}-a-start.jpg`),join(dir,'before',`${lower}-a-start.jpg`)].find(existsSync);
 if(start&&iso2[code])await render(`<!doctype html><html><body style="margin:0;background:#000"><img src="${dataUri(start)}" style="width:800px;height:450px;object-fit:cover;display:block"></body></html>`,800,450,join(previews,`${iso2[code]}.jpg`),82);
 console.log(code,hasAfter?'compare + preview':'preview');
}
await Promise.race([send('Browser.close').catch(()=>{}),wait(3000)]);socket.close();child.kill();
