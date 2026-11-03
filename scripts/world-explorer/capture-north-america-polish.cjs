const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('../../tmp/tools/asia-browser/node_modules/playwright');
const dir=path.resolve('documentation/world-explorer/review/north-america/art-polish');
const base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3016';
const countries=[['CAN',58,1,27,1],['USA',48,1,62,1],['MEX',35,.7,69,1.9],['GTM',51,2,40,1.9],['CRI',47,1.2,64,1.2],['JAM',55,2.3,31,.6]];
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let evidence=process.env.COUNTRY&&fs.existsSync(path.join(dir,'browser-evidence.json'))?JSON.parse(fs.readFileSync(path.join(dir,'browser-evidence.json'),'utf8')):[];
 try{
  for(const [code,vistaX,vistaY,enemyX,enemyY] of countries.filter(([code])=>!process.env.COUNTRY||process.env.COUNTRY.split(',').includes(code))){
   const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[],consoleErrors=[],httpErrors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,800));});
   page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
   await page.goto(`${base}/world-explorer?country=${code}&play=1&review=1`,{waitUntil:'domcontentloaded',timeout:150000});
   for(let attempt=0;attempt<4;attempt++){
    await page.locator('canvas[data-ready="true"], button:has-text("Try again")').first().waitFor({state:'attached',timeout:90000});
    if(await page.getByRole('button',{name:'Try again',exact:true}).count())await page.getByRole('button',{name:'Try again',exact:true}).click();else break;
   }
   await page.locator('canvas[data-ready="true"]').waitFor({timeout:90000});
   await page.waitForFunction(()=>!!window.worldExplorerReview,null,{timeout:60000});
   await page.locator('canvas[data-surface-detail="natural-rock-pbr"]').waitFor({timeout:60000});
   if(await page.getByText('The world could not open',{exact:true}).count())throw Error(code+' loading failed');
   const expected=code==='CAN'?'Glacier Pass':code==='USA'?'Harbor Shift':null;
   if(expected&&!(await page.locator('body').innerText()).includes(expected))throw Error(code+': stale preview, expected '+expected);
   await page.evaluate(()=>window.worldExplorerReview.pause());
   await page.screenshot({path:path.join(dir,code.toLowerCase()+'-gameplay.png')});
   await page.evaluate(([x,y])=>window.worldExplorerReview.setReviewView('scan',x,y),[vistaX,vistaY]);
   await page.screenshot({path:path.join(dir,code.toLowerCase()+'-vista.png')});
   await page.evaluate(([x,y])=>window.worldExplorerReview.setReviewCamera({position:[x,y+1,5.3],target:[x,y+.4,0],fov:38}),[enemyX,enemyY]);
   await page.screenshot({path:path.join(dir,code.toLowerCase()+'-enemy.png')});
   const stats=await page.evaluate(()=>({state:window.worldExplorerReview.reviewState(),render:window.worldExplorerReview.reviewStats()}));
   evidence=evidence.filter(row=>row.code!==code);evidence.push({code,errors,consoleErrors,httpErrors,stats,humanPlaytest:false,hardwarePerformance:false});
   fs.writeFileSync(path.join(dir,'browser-evidence.json'),JSON.stringify(evidence,null,2));console.log(code+': '+errors.length+' runtime errors; '+consoleErrors.length+' console errors');await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
