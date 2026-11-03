const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.EXPLORER_PLAYWRIGHT_MODULE||'../../tmp/tools/asia-browser/node_modules/playwright');
(async()=>{const root=path.resolve('documentation/world-explorer/review/asia/west-asia'),b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const results=[];
 for(const [folder,expected]of [[root,221],[path.join(root,'responsive-layouts'),136]]){
  const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('file:///'+folder.replace(/\\/g,'/')+'/index.html');
  const qa=await p.evaluate(async()=>{let decoded=0;const errors=[];for(const image of document.images){image.loading='eager';try{await image.decode();decoded++;}catch{errors.push(image.getAttribute('src'));}}return{decodedImages:decoded,imageErrors:errors,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))};});
  qa.missingLinks=qa.links.filter(h=>!/^https?:|^#/.test(h)&&!fs.existsSync(path.resolve(folder,h)));delete qa.links;
  await p.screenshot({path:folder+'/gallery-desktop.png'});await p.setViewportSize({width:390,height:844});qa.mobileOverflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);await p.screenshot({path:folder+'/gallery-mobile.png'});await p.close();
  qa.passed=qa.decodedImages===expected&&!qa.imageErrors.length&&!qa.missingLinks.length&&!qa.horizontalOverflow&&!qa.mobileOverflow;fs.writeFileSync(folder+'/gallery-validation.json',JSON.stringify(qa,null,2)+'\n');results.push(qa);if(!qa.passed)throw Error('Gallery QA failed: '+JSON.stringify(qa));
 }
 const p=await b.newPage(),response=await p.goto((process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3011')+'/world-explorer?country=YEM&play=1'),html=await response.text(),id=fs.readFileSync(path.join(process.env.EXPLORER_CANDIDATE_ROOT||'.','.next-asia-phase-a/BUILD_ID'),'utf8').trim();if(!html.includes(id))throw Error('Final preview build mismatch');await p.locator('canvas[data-ready="true"]').waitFor({timeout:60000});console.log(JSON.stringify({galleries:results,finalPreviewBuildId:id,httpStatus:response.status(),humanPlaytest:false,physicalPhone:false,fps60:'unverified',released:false}));
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
