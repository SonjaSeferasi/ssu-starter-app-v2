const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('../../tmp/tools/asia-browser/node_modules/playwright');
const output=path.resolve('documentation/world-explorer/review/north-america');
const base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3012';
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let results=process.env.COUNTRY&&fs.existsSync(path.join(output,'browser-evidence.json'))?JSON.parse(fs.readFileSync(path.join(output,'browser-evidence.json'),'utf8')):[];
 try{
  for(const [code,x,y] of [['CAN',60,1],['USA',51,1],['MEX',36,1],['GTM',49,2],['CRI',47,1.2],['JAM',56,2.3]].filter(([code])=>!process.env.COUNTRY||code===process.env.COUNTRY)){
   const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[],httpErrors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,700));});
   page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
   const response=await page.goto(`${base}/world-explorer?country=${code}&play=1&review=1`,{waitUntil:'domcontentloaded',timeout:180000});
   try{
    for(let attempt=0;attempt<3;attempt++){
     await page.locator('canvas[data-ready="true"], button:has-text("Try again")').first().waitFor({state:'attached',timeout:90000});
     if(await page.getByRole('button',{name:'Try again',exact:true}).count()){
      await page.getByRole('button',{name:'Try again',exact:true}).click();
     }else break;
    }
    if(await page.getByText('The world could not open',{exact:true}).count())throw Error('Loading error remains visible');
   }catch(e){
    await page.screenshot({path:path.join(output,code.toLowerCase()+'-load-error.png')});
    console.log(JSON.stringify({code,errors,text:(await page.locator('body').innerText()).slice(-1800)}));
    throw e;
   }
   await page.waitForFunction(()=>!!window.worldExplorerReview,null,{timeout:60000});
   await page.locator('canvas[data-surface-detail="natural-rock-pbr"]').waitFor({timeout:45000});
   await page.evaluate(()=>window.worldExplorerReview.pause());
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await page.screenshot({path:path.join(output,code.toLowerCase()+'-gameplay.png')});
   await page.evaluate(([x,y])=>window.worldExplorerReview.setReviewView('scan',x,y),[x,y]);
   await page.screenshot({path:path.join(output,code.toLowerCase()+'-mechanic.png')});
   await page.evaluate(()=>window.worldExplorerReview.setReviewView('overview'));
   await page.screenshot({path:path.join(output,code.toLowerCase()+'-overview.png')});
   const state=await page.evaluate(()=>window.worldExplorerReview.reviewState());
   results=results.filter(row=>row.code!==code);results.push({code,httpStatus:response.status(),errors,httpErrors,state,renderer:'Edge SwiftShader; not hardware performance',humanPlaytest:false});
   console.log(code+': '+response.status()+'; '+errors.length+' browser errors');await page.close();
  }
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await phone.goto(base+'/world-explorer?country=MEX&play=1&review=1',{waitUntil:'domcontentloaded',timeout:90000});
  await phone.locator('canvas[data-ready="true"]').waitFor({timeout:90000});
  await phone.evaluate(()=>window.worldExplorerReview.pause());
  await phone.screenshot({path:path.join(output,'mex-mobile.png')});await phone.close();
  fs.writeFileSync(path.join(output,'browser-evidence.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
