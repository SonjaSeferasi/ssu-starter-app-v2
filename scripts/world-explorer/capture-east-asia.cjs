/* Review-only browser automation. Install Playwright under tmp/tools/asia-browser;
 * the application has no new runtime dependency. No saved account is used. */
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('../../tmp/tools/asia-browser/node_modules/playwright');
const output=path.resolve('documentation/world-explorer/review/asia/east-asia');
const base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3003';
const countries=[['CHN',39,'vertical lift and crumbling ridge'],['JPN',25,'lower rope bridge and upper island route'],['MNG',21,'wind corridor and windsock'],['PRK',45,'warned steam vent and volcanic terraces'],['KOR',31,'urban rooftop stairs and maintenance lift']];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
 const records=[];
 try{
  for(const [code,x,mechanic] of countries){
   const page=await context.newPage(),errors=[],consoleErrors=[],failedRequests=[],httpErrors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error')consoleErrors.push({message:message.text(),location:message.location()});});
   page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
   page.on('response',response=>{if(response.status()>=400)httpErrors.push({url:response.url(),status:response.status()});});
   const url=`${base}/world-explorer?country=${code}&play=1&review=1`,response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   await page.locator('canvas[data-ready="true"]').waitFor({timeout:45000});
   await page.waitForFunction(()=>!!window.worldExplorerReview);
   await page.locator('canvas[data-surface-detail="natural-rock-pbr"]').waitFor({timeout:30000});
   await page.evaluate(()=>window.worldExplorerReview.pause());
   // Wait for a rendered frame, not an arbitrary sleep or artificial image.
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.screenshot({path:path.join(output,`${code.toLowerCase()}-gameplay.png`)});
   await page.getByRole('button',{name:'Full-level overview',exact:true}).click();
   await page.screenshot({path:path.join(output,`${code.toLowerCase()}-overview.png`)});
   await page.evaluate(x=>window.worldExplorerReview.setReviewView('scan',x),x);
   if(code==='PRK'||code==='MNG'){
    // Advance the real running engine to an active steam/gust phase, then
    // pause the scan. No hazard clock or player coordinates are rewritten.
    await page.evaluate(()=>window.worldExplorerReview.resume());
    await page.waitForFunction(()=>{const text=document.querySelector('[aria-label$="hearts remaining"]')?.textContent||'';const m=text.match(/(\d+):(\d+)/);return m&&Number(m[1])*60+Number(m[2])>=6;},null,{timeout:90000});
    await page.evaluate(()=>window.worldExplorerReview.pause());
   }
   await page.screenshot({path:path.join(output,`${code.toLowerCase()}-mechanic.png`)});
   await page.getByRole('button',{name:'Player camera',exact:true}).click();
   await page.locator('canvas').focus();
   await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.press('Space');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');
   await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');
   await page.evaluate(()=>window.worldExplorerReview.pause());
   const counters=await page.locator('[aria-label$="coins"],[aria-label$="stars"],[aria-label$="hearts remaining"]').allTextContents();
   records.push({code,url,httpStatus:response.status(),viewport:{width:1600,height:900},renderer:'Headless Edge / ANGLE SwiftShader software rendering; not representative device performance',mechanic,mechanicCameraX:x,errors,consoleErrors,failedRequests,httpErrors,counters,screenshots:['gameplay','overview','mechanic'].map(type=>`${code.toLowerCase()}-${type}.png`),inputSmoke:'Scripted right, jump and left input only; not a human playthrough',humanPlaytest:'not-run',mobileHardware:'not-available',released:false});
   fs.writeFileSync(path.join(output,'browser-evidence.json'),JSON.stringify({capturedAt:new Date().toISOString(),records},null,2)+'\n');
   console.log(JSON.stringify({code,httpStatus:response.status(),errors,consoleErrors,screenshots:3}));
   await page.close();
  }
 }finally{await context.close();await browser.close();}
})().catch(error=>{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'capture-failure.txt'),error.stack+'\n');console.error(error);process.exitCode=1;});
