// Africa review gallery: seven views per level in the running app, in headless
// Edge with hardware WebGL. Run from the repo root against a running build:
//   node scripts/world-explorer/africa-capture.cjs --base http://127.0.0.1:3117
// Views: card, start, gameplay frame mid-route, signature mechanic, landmark,
// full-level overview, phone portrait (390x844 touch) and phone landscape (844x390 touch).
// The WebGL renderer string is recorded per country so hardware rendering is shown, not assumed.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('../../tmp/tools/asia-browser/node_modules/playwright');
const args=Object.fromEntries(process.argv.slice(2).reduce((p,v,i,a)=>v.startsWith('--')?[...p,[v.slice(2),a[i+1]]]:p,[]));
const base=args.base||'http://127.0.0.1:3117',out=path.resolve(args.out||'documentation/world-explorer/review/africa/gallery');
const targets=JSON.parse(fs.readFileSync(path.join(__dirname,'africa-capture-targets.json'),'utf8'));
const codes=(args.codes||Object.keys(targets).join(',')).split(',');
const evidencePath=path.join(out,'gallery-evidence.json');
(async()=>{fs.mkdirSync(out,{recursive:true});const evidence=fs.existsSync(evidencePath)?JSON.parse(fs.readFileSync(evidencePath,'utf8')):{};
 const browser=await chromium.launch({executablePath:args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']});
 const ready=async p=>p.waitForFunction(()=>!!document.querySelector('canvas[data-ready="true"]')&&!!window.worldExplorerReview,null,{timeout:180000});
 const renderer=p=>p.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2');const e=gl&&gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null;});
 const shot=(p,name)=>p.screenshot({path:path.join(out,name),type:'jpeg',quality:84,timeout:120000});
 try{for(const code of codes){const t=targets[code],l=code.toLowerCase(),e={code,errors:[],consoleErrors:[],httpErrors:[]},started=Date.now();
  try{
   const page=await browser.newPage({viewport:{width:1440,height:810}});
   page.on('pageerror',x=>e.errors.push(x.message.slice(0,400)));page.on('console',m=>{if(m.type()==='error')e.consoleErrors.push(m.text().slice(0,400));});page.on('response',r=>{if(r.status()>=400)e.httpErrors.push(r.status()+' '+r.url().slice(0,160));});
   await page.goto(`${base}/world-explorer?country=${code}`,{timeout:180000});await page.waitForTimeout(5000);
   e.card=(await page.locator('[aria-label="Selected destination"]').first().innerText().catch(()=>'')).split('\n').filter(Boolean).slice(0,16);
   e.cardPhoto=await page.evaluate(()=>{const img=document.querySelector('[aria-label="Selected destination"] img[src*="wikimedia"],[aria-label="Selected destination"] figure img');return img?{src:img.getAttribute('src'),alt:img.getAttribute('alt'),caption:img.closest('figure')?.innerText||null,loaded:img.complete&&img.naturalWidth>0}:null;});
   await shot(page,`${l}-0-card.jpg`);
   await page.goto(`${base}/world-explorer?country=${code}&play=1&review=1`,{timeout:180000});await ready(page);await page.waitForTimeout(2000);
   e.renderer=await renderer(page);const R=(fn,...a)=>page.evaluate(([fn,a])=>window.worldExplorerReview[fn](...a),[fn,a]);
   await R('pause');await shot(page,`${l}-1-start.jpg`);
   await R('setReviewView','scan',t.mid[0],t.mid[1]);await shot(page,`${l}-2-gameplay.jpg`);
   await R('setReviewView','scan',t.signature[0],t.signature[1]);await shot(page,`${l}-3-signature.jpg`);
   const L=t.landmark&&t.landmark.size[0]<300?t.landmark:null,lx=L?Math.max(0,Math.min(t.finish,L.center[0])):t.finish*.5,ly=L?L.center[1]:2,lz=L?L.center[2]:-14;
   await R('setReviewCamera',{position:[lx,ly+5,lz+Math.max(22,Math.min(46,(L?L.size[0]:40)*.5))],target:[lx,ly+1.5,lz],fov:48});await shot(page,`${l}-4-landmark.jpg`);
   await R('setReviewView','overview');await shot(page,`${l}-5-overview.jpg`);
   const stats=await R('reviewStats');e.render={calls:stats.calls,triangles:stats.triangles,geometries:stats.geometries,textures:stats.textures,averageFrameMs:stats.frameTimes.length?+(stats.frameTimes.reduce((a,b)=>a+b,0)/stats.frameTimes.length).toFixed(2):null};
   await page.close();
   for(const [name,w,h] of [['6-phone-portrait',390,844],['7-phone-landscape',844,390]]){
    const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:2});const m=await ctx.newPage();m.on('pageerror',x=>e.errors.push(name+': '+x.message.slice(0,300)));
    await m.goto(`${base}/world-explorer?country=${code}&play=1&review=1`,{timeout:180000});await ready(m);await m.waitForTimeout(2000);await m.evaluate(()=>window.worldExplorerReview.pause());
    e[name]=await m.evaluate(()=>{const h=document.querySelector('section[data-environment] h1');const node=h.firstChild,text=h.textContent,split=[];for(const x of text.matchAll(/[^\s-]+/g)){const r=document.createRange();r.setStart(node,x.index);r.setEnd(node,x.index+x[0].length);if(new Set([...r.getClientRects()].map(q=>Math.round(q.top))).size>1)split.push(x[0]);}
     const buttons=['Move left','Move right','Jump'].map(label=>{const b=document.querySelector(`button[aria-label="${label}"]`);if(!b)return [label,null];const r=b.getBoundingClientRect();return [label,Math.round(r.width),Math.round(r.height),r.right<=innerWidth&&r.bottom<=innerHeight];});
     return{title:text,splitWords:split,touchButtons:buttons,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};});
    await shot(m,`${l}-${name}.jpg`);await ctx.close();
   }
  }catch(x){e.failure=String(x.message||x).slice(0,500);}
  e.seconds=Math.round((Date.now()-started)/1000);evidence[code]=e;fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,1));
  console.log(code,e.failure?'FAIL '+e.failure:'ok',e.renderer,e.errors.length+' errors',e.consoleErrors.length+' console',e.seconds+'s');
 }}finally{await browser.close();}
})().catch(x=>{console.error(x);process.exitCode=1;});
