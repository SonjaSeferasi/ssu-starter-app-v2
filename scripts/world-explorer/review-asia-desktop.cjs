/* Actual in-page simulation playback, not teleportation or a human playtest.
 * Requires the existing opt-in review autoplay controller in country-scene.
 * Input tapes are recorded from real simulation runs by the review harness. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.EXPLORER_PLAYWRIGHT_MODULE||'../../tmp/tools/asia-browser/node_modules/playwright');
const out=path.resolve(process.env.EXPLORER_REVIEW_OUTPUT||'documentation/world-explorer/review/asia/phase-a-revision-2'),base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3006';
(async()=>{
 const tapes=JSON.parse(fs.readFileSync(process.env.EXPLORER_INPUT_TAPES||'tmp/tools/asia-review/desktop-inputs.json','utf8'));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=d3d11']});const records=[];
 try{for(const tape of tapes){
  const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`${base}/world-explorer?country=${tape.code}&play=1&review=1&autoplay=1`;await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('canvas[data-ready="true"]').waitFor({timeout:60000});await page.waitForFunction(()=>typeof window.worldExplorerReview?.autoplay==='function');
  const renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'not exposed';});
  const began=Date.now();await page.evaluate(inputs=>window.worldExplorerReview.autoplay(inputs),tape.inputs);
  while(Date.now()-began<120000){
   const status=await page.evaluate(()=>window.worldExplorerReview.reviewState().status);if(status==='completed'||status==='failed')break;
   if(status==='discovery'){const resume=page.getByRole('button',{name:/Continue adventure|Continue exploring|Keep exploring/i});if(await resume.count())await resume.first().click();else throw Error('Discovery cannot resume through the UI');}
   await page.waitForTimeout(200);
  }
  const actual=await page.evaluate(()=>window.worldExplorerReview.reviewState()),stats=await page.evaluate(()=>window.worldExplorerReview.reviewStats());
  if(actual.status!=='completed'||actual.hearts!==3||actual.stars!==tape.expected.stars||actual.coins!==tape.expected.coins||!actual.discoveryFound||errors.length)throw Error(tape.code+'/'+tape.route+' browser mismatch: '+JSON.stringify({actual,expected:tape.expected,errors}));
  const times=stats.frameTimes.slice(120).filter(t=>t>0),sorted=[...times].sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/Math.max(1,times.length),percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]??null;
  const screenshot=`${tape.code.toLowerCase()}-${tape.route}-completed.png`;await page.screenshot({path:path.join(out,screenshot)});
  records.push({code:tape.code,route:tape.route,url,inputFrames:tape.inputs.length,simulationSeconds:tape.seconds,wallSeconds:(Date.now()-began)/1000,actual,errors,screenshot,performance:{renderer,viewport:{width:1600,height:900},deviceScaleFactor:1,graphicsQuality:'standard',frames:times.length,measuredSeconds:times.reduce((a,b)=>a+b,0)/1000,averageFps:1000/mean,p95FrameMs:percentile(.95),p99FrameMs:percentile(.99),drawCalls:stats.calls,triangles:stats.triangles,geometries:stats.geometries,textures:stats.textures,hardwareRenderer:/Intel|NVIDIA|AMD|Radeon/i.test(renderer)&&!/SwiftShader|WARP|Basic Render/i.test(renderer)},humanPlaytest:false,accountSave:'pending-user-request',physicalPhone:'pending-user-request',released:false});
  fs.writeFileSync(path.join(out,'desktop-playthroughs.json'),JSON.stringify({method:'Recorded input frames fed to the opt-in in-page review controller; real simulation, rendering, HUD and result callback. No position, reward or checkpoint injection. Not a human playtest.',records},null,2)+'\n');
  console.log(JSON.stringify({code:tape.code,route:tape.route,status:actual.status,hearts:actual.hearts,stars:actual.stars,fps:Math.round(1000/mean),renderer}));await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
