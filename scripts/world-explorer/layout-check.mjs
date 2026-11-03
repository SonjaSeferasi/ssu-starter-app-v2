// Responsive layout check of the run screen for every listed adventure:
//   node --experimental-websocket scripts/world-explorer/layout-check.mjs --codes JPN,ECU --base http://localhost:3100
// In headless Edge, each level is opened in five viewports: desktop 1440x900
// and 1280x720, and with touch emulation tablet 768x1024, phone portrait
// 390x844 and phone landscape 844x390. In each it checks:
//   - the page does not scroll sideways;
//   - every visible HUD part (title panel, progress, counters, hearts, guide
//     and pause buttons, touch controls) lies inside the viewport;
//   - no two HUD groups overlap (a group nested in another is not an overlap;
//     the touch row is measured by its buttons, since the row itself lets touches through);
//   - in touch viewports the on-screen controls are shown;
//   - HUD text is at least 10 px;
//   - the level heading shows in full (not clipped), at least 12 px;
//   - the coin/star counters and hearts are shown;
//   - in touch viewports each on-screen button is at least 44 px;
//   - the 3D canvas fills the stage;
//   - the Country guide dialog and the pause dialog (with Settings open) fit the
//     viewport or scroll within it, have a heading of at least 14 px, text of
//     at least 10 px and buttons at least 24 px tall (32 px on touch screens).
// A check that could not run is recorded as 'not-run', never as passed.
// Writes <out>/layout-check.json and one screenshot per viewport to <out>/shots/.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'ECU').split(','),base=args.base||'http://localhost:3100',out=args.out||'documentation/world-explorer/review/acceptance-67/layout';
const viewports=[{id:'desktop',width:1440,height:900,touch:false},{id:'laptop',width:1280,height:720,touch:false},{id:'tablet',width:768,height:1024,touch:true},{id:'phone-portrait',width:390,height:844,touch:true},{id:'phone-landscape',width:844,height:390,touch:true}];
const wait=ms=>new Promise(r=>setTimeout(r,ms)),port=9400+Math.floor(Math.random()*90);mkdirSync(join(out,'shots'),{recursive:true});
const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-layout-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}});
const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
// The page's own measurement: HUD groups are found by their CSS-module class names.
const measure=`(()=>{
 const W=innerWidth,H=innerHeight,groups=['playIdentity','playProgress','referenceProgress','playCounters','playLives','playSecondary','touchControls','controlsHint'];
 const seen=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>0&&r.width>0&&r.height>0;};
 const find=g=>[...document.querySelectorAll('[class*="_'+g+'_"],[class*="'+g+'"]')].filter(el=>seen(el)&&!el.parentElement?.closest('[class*="'+g+'"]'));
 // The touch controls are a full-width, click-through row: its buttons are what can cover the HUD.
 const parts=groups.flatMap(g=>find(g).flatMap(el=>g==='touchControls'?[...el.querySelectorAll('button')].filter(seen):[el]).map(el=>{const r=el.getBoundingClientRect();return{group:g,el,left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
 const outside=parts.filter(p=>p.left<-1||p.top<-1||p.right>W+1||p.bottom>H+1).map(p=>p.group+' '+[p.left,p.top,p.right,p.bottom].map(Math.round).join(','));
 const overlaps=[];for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){const a=parts[i],b=parts[j];if(a.group===b.group||a.el.contains(b.el)||b.el.contains(a.el))continue;const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(x>2&&y>2)overlaps.push(a.group+'/'+b.group+' '+Math.round(x)+'x'+Math.round(y));}
 const hudText=[...document.querySelectorAll(groups.map(g=>'[class*="'+g+'"] *').join(','))].filter(el=>seen(el)&&el.childNodes.length&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
 const smallest=hudText.reduce((m,el)=>Math.min(m,parseFloat(getComputedStyle(el).fontSize)),99),smallText=[...new Set(hudText.filter(el=>parseFloat(getComputedStyle(el).fontSize)<10).map(el=>(String(el.className).match(/_([a-zA-Z]+)_/)?.[1]||el.tagName.toLowerCase())+' '+parseFloat(getComputedStyle(el).fontSize)+'px "'+el.textContent.trim().slice(0,18)+'"'))];
 const canvas=document.querySelector('canvas[data-ready="true"]'),stage=canvas?.parentElement?.getBoundingClientRect(),c=canvas?.getBoundingClientRect();
 // The level heading must show in full; counters and hearts must be on screen; touch buttons need a finger-sized target.
 // Clipped means text is actually hidden: the heading hides its own overflow (or ellipsis), or it runs past an ancestor that clips.
 const clippedText=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();if((s.overflowX!=='visible'||s.textOverflow==='ellipsis')&&el.scrollWidth>el.clientWidth+1)return true;if(s.overflowY!=='visible'&&el.scrollHeight>el.clientHeight+4)return true;for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const as=getComputedStyle(a);if(as.overflow==='visible'&&as.overflowX==='visible')continue;const ar=a.getBoundingClientRect();if(r.left<ar.left-1||r.right>ar.right+1||r.top<ar.top-1||r.bottom>ar.bottom+1)return true;}return false;};
 const h1=document.querySelector('[class*="playIdentity"] h1'),heading=h1&&seen(h1)?{text:h1.textContent.trim(),px:parseFloat(getComputedStyle(h1).fontSize),clipped:clippedText(h1)}:null;
 const touchButtons=find('touchControls').flatMap(el=>[...el.querySelectorAll('button')].filter(seen)).map(b=>{const r=b.getBoundingClientRect();return Math.round(Math.min(r.width,r.height));});
 return{scrollWidth:document.documentElement.scrollWidth,viewport:W,partsFound:parts.map(p=>p.group),outside,overlaps,touchShown:find('touchControls').length>0,smallestHudFontPx:smallest===99?null:smallest,smallText,heading,countersShown:find('playCounters').length>0,livesShown:find('playLives').length>0,smallestTouchButtonPx:touchButtons.length?Math.min(...touchButtons):null,canvasFills:!!(c&&stage&&Math.abs(c.width-stage.width)<2&&Math.abs(c.height-stage.height)<2)};
})()`;
// An open run dialog (guide or pause): it fits the screen or scrolls within it, has a
// heading, its text is at least 10 px and its buttons are tall enough to hit.
const measureDialog=`(()=>{
 const d=document.querySelector('[role="dialog"]');if(!d)return null;
 const seen=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>0&&r.width>0&&r.height>0;};
 const W=innerWidth,H=innerHeight,r=d.getBoundingClientRect(),scrolls=el=>el&&['auto','scroll'].includes(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+1;
 const fits=r.left>=-1&&r.top>=-1&&r.right<=W+1&&r.bottom<=H+1,scrollable=scrolls(d)||scrolls(d.parentElement);
 const texts=[...d.querySelectorAll('*')].filter(el=>seen(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
 const small=[...new Set(texts.filter(el=>parseFloat(getComputedStyle(el).fontSize)<10).map(el=>el.tagName.toLowerCase()+' '+parseFloat(getComputedStyle(el).fontSize)+'px "'+el.textContent.trim().slice(0,18)+'"'))];
 const h=d.querySelector('h1,h2'),buttons=[...d.querySelectorAll('button')].filter(seen).map(b=>({text:b.textContent.trim().slice(0,24),h:Math.round(b.getBoundingClientRect().height)}));
 return{title:h?.textContent.trim()||null,headingPx:h?parseFloat(getComputedStyle(h).fontSize):null,box:[r.left,r.top,r.right,r.bottom].map(Math.round),fits,scrollable,pageScrollWidth:document.documentElement.scrollWidth,viewport:W,smallestPx:texts.length?Math.min(...texts.map(el=>parseFloat(getComputedStyle(el).fontSize))):null,small,shortButtons:buttons.filter(b=>b.h<32)};
})()`;
// Dialog buttons: at least 24 px (WCAG 2.5.8) with a pointer, 32 px on touch screens.
const dialogChecks=(m,label,min)=>{const r=(ok,detail)=>({result:m?(ok?'pass':'fail'):'not-run',detail:m?detail:label+' did not open'});return m?{
 [label+'Fits']:r((m.fits||m.scrollable)&&m.pageScrollWidth<=m.viewport+1,m.fits?'inside the viewport':m.scrollable?'taller than the viewport and scrolls':`outside the viewport ${m.box.join(',')} and does not scroll`),
 [label+'Heading']:r(!!m.title&&m.headingPx>=14,m.title?`"${m.title}" ${m.headingPx} px`:'no heading'),
 [label+'Text']:r(m.smallestPx===null||m.smallestPx>=10,`smallest text ${m.smallestPx} px${m.small.length?': '+m.small.slice(0,4).join(', '):''}`),
 [label+'Buttons']:r(m.shortButtons.filter(b=>b.h<min).length===0,m.shortButtons.filter(b=>b.h<min).length?m.shortButtons.filter(b=>b.h<min).map(b=>`"${b.text}" ${b.h} px`).join(', ')+` (minimum ${min} px)`:`every button at least ${min} px tall`)}
 :{[label+'Fits']:r(false,''),[label+'Heading']:r(false,''),[label+'Text']:r(false,''),[label+'Buttons']:r(false,'')};};
const report={base,browser:version.Browser,viewports,checkedAt:new Date().toISOString(),levels:{}};
for(const code of codes){
 report.levels[code]={};
 for(const v of viewports){
  // A fresh tab per viewport, so touch support is decided at page load.
  const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const page=(m,p)=>send(m,p,sessionId),evaluate=async x=>(await page('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
  await page('Emulation.setDeviceMetricsOverride',{width:v.width,height:v.height,deviceScaleFactor:1,mobile:v.touch});
  if(v.touch)await page('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1`});
  let ready=false;for(let i=0;i<200&&!ready;i++){ready=await evaluate(`!!document.querySelector('canvas[data-ready="true"]')`);if(!ready)await wait(100);}
  let m=null;if(ready){await wait(1200);m=await evaluate(measure);}
  const {data}=await page('Page.captureScreenshot',{format:'jpeg',quality:70});const shot=`shots/${code.toLowerCase()}-${v.id}.jpg`;writeFileSync(join(out,shot),Buffer.from(data,'base64'));
  // Open the Country guide, then the pause dialog with its settings, measuring each.
  const opened=async(click,title)=>{await evaluate(click);for(let i=0;i<30;i++){const t=await evaluate(`document.querySelector('[role="dialog"] h1,[role="dialog"] h2')?.textContent||''`);if(title.test(t))return true;await wait(100);}return false;};
  let guide=null,pause=null;
  if(ready){
   if(await opened(`[...document.querySelectorAll('[class*="playSecondary"] button')].find(b=>/guide|discovery/i.test(b.textContent))?.click()`,/^Discover/)){await wait(1500);guide=await evaluate(measureDialog);const g=await page('Page.captureScreenshot',{format:'jpeg',quality:70});writeFileSync(join(out,`shots/${code.toLowerCase()}-${v.id}-guide.jpg`),Buffer.from(g.data,'base64'));
    await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b=>/continue adventure/i.test(b.textContent))?.click()`);await wait(400);}
   if(await opened(`document.querySelector('button[aria-label="Pause level"]')?.click()`,/paused/i)){await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b=>/^settings$/i.test(b.textContent.trim()))?.click()`);await wait(400);pause=await evaluate(measureDialog);const p=await page('Page.captureScreenshot',{format:'jpeg',quality:70});writeFileSync(join(out,`shots/${code.toLowerCase()}-${v.id}-pause.jpg`),Buffer.from(p.data,'base64'));}
  }
  const r=(ok,detail)=>({result:m?(ok?'pass':'fail'):'not-run',detail:m?detail:'level did not become ready'});
  report.levels[code][v.id]={ready,screenshot:shot,measured:m,dialogs:{guide,pause},checks:m?{
   heading:r(!!m.heading&&!m.heading.clipped&&m.heading.px>=12,m.heading?`"${m.heading.text}" ${m.heading.px} px${m.heading.clipped?', clipped':''}`:'no level heading'),
   counters:r(m.countersShown&&m.livesShown,`counters ${m.countersShown?'shown':'missing'}, hearts ${m.livesShown?'shown':'missing'}`),
   touchTargets:v.touch?(m.smallestTouchButtonPx===null?{result:'not-run',detail:'no touch buttons found'}:r(m.smallestTouchButtonPx>=44,`smallest touch button ${m.smallestTouchButtonPx} px`)):{result:'n/a',detail:'pointer viewport'},
   ...dialogChecks(guide,'guide',v.touch?32:24),...dialogChecks(pause,'pause',v.touch?32:24),
   noSidewaysScroll:r(m.scrollWidth<=m.viewport+1,`scroll width ${m.scrollWidth} in a ${m.viewport} px viewport`),
   hudInside:r(m.outside.length===0,m.outside.join('; ')||`${m.partsFound.length} HUD parts inside`),
   hudNoOverlap:r(m.overlaps.length===0,m.overlaps.join('; ')||'no overlapping HUD groups'),
   touchControls:v.touch?r(m.touchShown,m.touchShown?'on-screen controls shown':'no on-screen controls'):{result:'n/a',detail:'pointer viewport'},
   readableText:m.smallestHudFontPx===null?{result:'not-run',detail:'no HUD text found'}:r(m.smallestHudFontPx>=10,`smallest HUD text ${m.smallestHudFontPx} px${m.smallText.length?': '+m.smallText.slice(0,6).join(', '):''}`),
   canvasFills:r(m.canvasFills,m.canvasFills?'canvas fills the stage':'canvas does not fill the stage')}
   :{noSidewaysScroll:r(false,''),hudInside:r(false,''),hudNoOverlap:r(false,''),touchControls:r(false,''),readableText:r(false,''),canvasFills:r(false,''),heading:r(false,''),counters:r(false,''),touchTargets:r(false,''),...dialogChecks(null,'guide',0),...dialogChecks(null,'pause',0)}};
  await send('Target.closeTarget',{targetId});
 }
 const fails=Object.entries(report.levels[code]).flatMap(([v,x])=>Object.entries(x.checks).filter(([,c])=>c.result!=='pass'&&c.result!=='n/a').map(([k,c])=>`${v}:${k}=${c.result}`));
 console.log(code,fails.length?'ISSUES '+fails.join(' '):'all layout checks pass');
}
writeFileSync(join(out,args.file||'layout-check.json'),JSON.stringify(report,null,1));
await Promise.race([send('Browser.close'),wait(3000)]);socket.close();child.kill();
