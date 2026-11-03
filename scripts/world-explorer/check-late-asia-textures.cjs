const fs=require('fs'),path=require('path'),{chromium}=require('../../tmp/tools/asia-browser/node_modules/playwright');
(async()=>{const base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3013',phase=process.env.EXPLORER_TEXTURE_PHASE||'after',root=path.resolve('documentation/world-explorer/review/asia/enhancement/loading'),records=[];fs.mkdirSync(root,{recursive:true});
 const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=d3d11']});
 try{for(const code of ['JPN','CHN','OMN'])for(const disableParallel of (phase==='before'?[false]:[false,true])){
  const c=await b.newContext({viewport:{width:1280,height:800}}),p=await c.newPage(),errors=[],held=[];p.on('pageerror',e=>errors.push(e.message));
  if(disableParallel)await c.addInitScript(()=>{const original=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='KHR_parallel_shader_compile'?null:original.call(this,name)};});
  await p.route('**/world-explorer/materials/*.jpg',async route=>{const response=await route.fetch();await new Promise(resolve=>held.push(resolve));await route.fulfill({response});});
  await p.goto(base+`/world-explorer?country=${code}&play=1&review=1`,{waitUntil:'domcontentloaded'});await p.locator('canvas[data-ready="true"]').waitFor({timeout:60000});await p.waitForFunction(()=>!!window.worldExplorerReview);
  await p.evaluate(()=>{window.textureFrames=[];let last=performance.now();function sample(t){window.textureFrames.push(t-last);last=t;requestAnimationFrame(sample)}requestAnimationFrame(sample)});
  const heldCount=held.length;held.splice(0).forEach(r=>r());await p.waitForTimeout(5000);
  const during=await p.evaluate(()=>({surface:document.querySelector('canvas').dataset.surfaceDetail||'fallback',upgrades:document.querySelector('canvas').dataset.materialUpgrades||'legacy',status:window.worldExplorerReview.reviewState().status,frames:window.textureFrames.splice(0)}));
  if(phase==='after'&&(during.surface!=='fallback'||during.upgrades!=='queued'||during.status!=='playing'))throw Error(code+': late upgrades were not held during active gameplay '+JSON.stringify(during));
  await p.evaluate(()=>window.worldExplorerReview.pause());await p.locator('canvas[data-surface-detail="natural-rock-pbr"]').waitFor({timeout:60000});await p.screenshot({path:path.join(root,`${phase}-${code.toLowerCase()}-${disableParallel?'serial':'native'}-paused.png`)});
  await p.evaluate(()=>window.worldExplorerReview.resume());await p.waitForTimeout(1000);const after=await p.evaluate(()=>({status:window.worldExplorerReview.reviewState().status,upgrades:document.querySelector('canvas').dataset.materialUpgrades||'legacy'}));
  if(errors.length||after.status!=='playing')throw Error('Stage did not resume cleanly');const sorted=during.frames.filter(t=>t>0).sort((a,b)=>a-b);delete during.frames;
  records.push({code,disableParallel,heldResponses:heldCount,during,after,errors,frameDiagnostic:{count:sorted.length,maxMs:sorted.at(-1),p95Ms:sorted[Math.floor(sorted.length*.95)]},confirmedPerformance:false,physicalPhone:false,released:false});console.log(code,disableParallel,during.surface,during.upgrades);await c.close();
 }
 fs.writeFileSync(path.join(root,phase+'.json'),JSON.stringify({buildId:process.env.EXPLORER_BUILD_ID,phase,method:'Hold all surface-map JPG responses until gameplay starts, release during play, then pause and resume. Optional KHR extension masking tests the serial shader fallback. Frame samples are diagnostics, not a confirmed-refresh-rate performance certification.',records,passed:true},null,2)+'\n');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
