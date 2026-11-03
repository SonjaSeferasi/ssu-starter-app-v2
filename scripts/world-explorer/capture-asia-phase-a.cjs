/* Actual browser captures only. Install Playwright in ignored tmp/tools/asia-browser
 * or pass EXPLORER_PLAYWRIGHT_MODULE. No app runtime dependency or account session. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.EXPLORER_PLAYWRIGHT_MODULE||'../../tmp/tools/asia-browser/node_modules/playwright');
const base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3006';
const output=path.resolve(process.env.EXPLORER_REVIEW_OUTPUT||'documentation/world-explorer/review/asia/phase-a');
const selected=process.env.EXPLORER_REVIEW_COUNTRIES?.split(',')||['CHN','JPN','MNG','PRK','KOR'];
const cameras={CHN:{mechanic:24,landmark:30},JPN:{mechanic:25,landmark:15},MNG:{mechanic:21,landmark:48},PRK:{mechanic:45,landmark:54},KOR:{mechanic:31,landmark:44}};
async function ready(page){await page.locator('canvas[data-ready="true"]').waitFor({timeout:60000});await page.locator('canvas[data-surface-detail="natural-rock-pbr"]').waitFor({timeout:30000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
(async()=>{
 fs.mkdirSync(output,{recursive:true});const resultPath=path.join(output,'browser-evidence.json');
 const records=fs.existsSync(resultPath)?JSON.parse(fs.readFileSync(resultPath,'utf8')).records:[];
 const hardware=process.env.EXPLORER_GPU==='hardware';
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:hardware?['--use-angle=d3d11']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const code of selected){
   const desktop=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1}),page=await desktop.newPage(),errors=[],consoleErrors=[],failedRequests=[],httpErrors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({message:m.text(),location:m.location()});});page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
   const url=`${base}/world-explorer?country=${code}&play=1`,begin=Date.now(),response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await ready(page);const loadingMilliseconds=Date.now()-begin;
   await page.screenshot({path:path.join(output,`${code.toLowerCase()}-start.png`)});
   const reviewUrl=url+'&review=1',reviewResponse=await page.goto(reviewUrl,{waitUntil:'domcontentloaded',timeout:60000});await ready(page);await page.waitForFunction(()=>!!window.worldExplorerReview);await page.evaluate(()=>window.worldExplorerReview.pause());
   await page.getByRole('button',{name:'Full-level overview',exact:true}).click();await page.screenshot({path:path.join(output,`${code.toLowerCase()}-overview.png`)});
   await page.evaluate(x=>window.worldExplorerReview.setReviewView('scan',x),cameras[code].mechanic);
   if(code==='PRK'||code==='MNG'){
    await page.evaluate(()=>window.worldExplorerReview.resume());
    await page.waitForFunction(()=>{const m=(document.querySelector('[aria-label$="hearts remaining"]')?.textContent||'').match(/(\d+):(\d+)/);return m&&Number(m[1])*60+Number(m[2])>=6;},null,{timeout:120000});await page.evaluate(()=>window.worldExplorerReview.pause());
   }
   await page.screenshot({path:path.join(output,`${code.toLowerCase()}-mechanic.png`)});
   await page.evaluate(x=>window.worldExplorerReview.setReviewView('scan',x),cameras[code].landmark);await page.screenshot({path:path.join(output,`${code.toLowerCase()}-landmark.png`)});
   const statistics=await page.locator('[class*="reviewTools"]').textContent(),jsHeapBytes=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
   const renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),e=gl?.getExtension('WEBGL_debug_renderer_info');return gl&&e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'not exposed';});
   const frameSample=await page.evaluate(()=>new Promise(resolve=>{const times=[],start=performance.now();let last=start;const sample=t=>{times.push(t-last);last=t;if(times.length>=30||t-start>3000){const sorted=[...times].sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/times.length;resolve({frames:times.length,averageFps:1000/mean,meanFrameMs:mean,p95FrameMs:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]});}else requestAnimationFrame(sample);};requestAnimationFrame(sample);}));
   await page.close();await desktop.close();
   let mobile=null;
   if(!process.env.EXPLORER_SKIP_MOBILE){
    const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}),phone=await mobileContext.newPage(),mobileErrors=[];phone.on('pageerror',e=>mobileErrors.push(e.message));await phone.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await ready(phone);await phone.screenshot({path:path.join(output,`${code.toLowerCase()}-mobile.png`)});
    const controls=phone.locator('[class*="touchControls"] button'),bounds=await controls.evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return{label:b.getAttribute('aria-label'),visible:r.width>0&&r.height>0,width:r.width,height:r.height,inViewport:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};}));
    let movementResponse=false;const move=phone.getByRole('button',{name:'Move right',exact:true});
    if(await move.isVisible()){
     const before=await phone.getByRole('progressbar',{name:'Level progress',exact:true}).getAttribute('value'),box=await move.boundingBox();await phone.mouse.move(box.x+box.width/2,box.y+box.height/2);await phone.mouse.down();
     try{await phone.waitForFunction(value=>{const p=document.querySelector('progress[aria-label="Level progress"]');return p&&Number(p.value)>Number(value)+.02;},before,{timeout:15000});movementResponse=true;}finally{await phone.mouse.up();}
    }
    const heading=await phone.locator('h1').evaluate(h=>{const r=h.getBoundingClientRect(),text=document.createRange();text.selectNodeContents(h);const t=text.getBoundingClientRect();return{text:h.textContent,clientWidth:h.clientWidth,scrollWidth:h.scrollWidth,textWidth:t.width,boxWidth:r.width,textHeight:t.height,lineHeight:parseFloat(getComputedStyle(h).lineHeight)};});
    mobile={viewport:{width:390,height:844},emulated:true,physicalDevice:false,pageErrors:mobileErrors,horizontalOverflow:await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),heading,controls:bounds,movementResponse,inputMethod:'Mouse pointer held on the emulated touch control; not a physical touch-device test'};await phone.close();await mobileContext.close();
   }
   const record={code,url,reviewUrl,httpStatus:response.status(),reviewHttpStatus:reviewResponse.status(),capturedAt:new Date().toISOString(),viewport:{width:1600,height:900},screenshots:['start','mechanic','landmark','overview'].map(v=>`${code.toLowerCase()}-${v}.png`),errors,consoleErrors,failedRequests,httpErrors,loadingMilliseconds,statistics,jsHeapBytes,frameSample,mobile,renderer,hardwareRequested:hardware,humanPlaytest:'not-run',physicalMobileTest:'pending-user-request',released:false};
   const previous=records.findIndex(r=>r.code===code);if(previous<0)records.push(record);else records[previous]=record;
   fs.writeFileSync(resultPath,JSON.stringify({scope:'Phase A art review; no release approval',records},null,2)+'\n');console.log(JSON.stringify({code,httpStatus:response.status(),captures:mobile?5:4,pageErrors:errors,mobileErrors:mobile?.pageErrors||[]}));
  }
 }finally{await browser.close();}
})().catch(e=>{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'capture-failure.txt'),e.stack+'\n');console.error(e);process.exitCode=1;});
