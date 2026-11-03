/* Focused visual check only: no simulation/collision changes or result injection. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.EXPLORER_PLAYWRIGHT_MODULE||'../../tmp/tools/asia-browser/node_modules/playwright');
const base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3011',out=path.resolve('documentation/world-explorer/review/asia/phase-a-revision-2/mongolia-seam');
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=d3d11']});const expectedBuild=fs.readFileSync('.next-asia-phase-a/BUILD_ID','utf8').trim(),records=[];
 try{for(const view of [{id:'desktop',width:1600,height:900,mobile:false},{id:'phone',width:390,height:844,mobile:true},{id:'small-phone',width:320,height:693,mobile:true},{id:'landscape-phone',width:844,height:390,mobile:true}]){
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:1,isMobile:view.mobile,hasTouch:view.mobile}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=base+'/world-explorer?country=MNG&play=1',response=await page.goto(url,{waitUntil:'domcontentloaded'});if(!(await response.text()).includes(expectedBuild))throw Error('Wrong production build');
  await page.locator('canvas[data-ready="true"]').waitFor({timeout:60000});await page.locator('canvas[data-surface-detail="natural-rock-pbr"]').waitFor({timeout:30000});
  await page.screenshot({path:path.join(out,view.id+'-start-after.png')});
  const heading=await page.locator('h1').evaluate(h=>({text:h.textContent,fits:h.scrollWidth<=h.clientWidth,rect:h.getBoundingClientRect().toJSON()}));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),screenshots=[view.id+'-start-after.png'];
  if(view.id==='desktop'||view.id==='phone'){
   await page.goto(url+'&review=1',{waitUntil:'domcontentloaded'});await page.locator('canvas[data-ready="true"]').waitFor({timeout:60000});await page.locator('canvas[data-surface-detail="natural-rock-pbr"]').waitFor({timeout:30000});await page.waitForFunction(()=>!!window.worldExplorerReview);
   for(const [label,x]of [['riverbank',21],['far-bank',74]]){await page.evaluate(x=>window.worldExplorerReview.setReviewView('scan',x),x);await page.screenshot({path:path.join(out,view.id+'-'+label+'-after.png')});screenshots.push(view.id+'-'+label+'-after.png');}
  }
  if(errors.length||overflow||!heading.fits)throw Error('Layout or scene failure: '+JSON.stringify({view,errors,overflow,heading}));
  records.push({view,buildId:expectedBuild,url,httpStatus:response.status(),heading,horizontalOverflow:overflow,errors,screenshots,physicalPhone:false});console.log(JSON.stringify({view:view.id,captures:screenshots.length,errors:errors.length}));await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'browser-evidence.json'),JSON.stringify({scope:'Mongolia presentation-only seam patch on the revision 2 testing candidate; not a human playtest',records},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
