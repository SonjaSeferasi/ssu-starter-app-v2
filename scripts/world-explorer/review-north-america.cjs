/* Real renderer + simulation + result UI. Input tapes never write positions,
 * rewards or checkpoints. Accelerated virtual time is not a frame-rate test. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../../tmp/tools/asia-browser/node_modules/playwright');
const base=process.env.EXPLORER_REVIEW_URL||'http://127.0.0.1:3016',out=path.resolve('documentation/world-explorer/review/north-america/revision-1');
const places=JSON.parse(fs.readFileSync('tmp/north-america-complete/places.json','utf8')),codes=(process.env.COUNTRY||Object.keys(places).join(',')).split(',');
const mode=process.env.MODE||'routes',file=path.join(out,mode+'.json');fs.mkdirSync(out,{recursive:true});
const records=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).records.filter(r=>!codes.includes(r.code)):[];
function save(){fs.writeFileSync(file,JSON.stringify({method:mode==='routes'?'Actual rendered input-tape replay; Playwright virtual time advances existing animation frames by 250ms. Every simulation input is consumed in order. Real discovery/result UI and anonymous device passport reload. No position, reward or checkpoint writes.':'Actual browser-emulated touch events, responsive viewports and rendered art captures.',humanDifficultyReview:'pending',physicalPhone:'pending',accountSync:'not-tested',hardwarePerformance:'not-measured',records},null,2));}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:[process.env.SOFTWARE?'--use-angle=swiftshader':'--use-angle=d3d11','--enable-unsafe-swiftshader']});
 const contextOptions=mobile=>({viewport:mobile?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
 async function open(code,mobile,autoplay,quality='low'){
  const context=await browser.newContext(contextOptions(mobile));await context.addInitScript(({quality,mobile})=>localStorage.setItem('socialu.world-explorer.preferences.v1',JSON.stringify({musicVolume:0,effectsVolume:0,reducedMotion:true,graphicsQuality:quality,touchControls:mobile,debugMode:false,explorerAssist:false})),{quality,mobile});
  const page=await context.newPage(),errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()});});
  await page.goto(`${base}/world-explorer?country=${code}&play=1&review=1${autoplay?'&autoplay=1':''}`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('canvas[data-ready="true"]').waitFor({timeout:120000});await page.waitForFunction(()=>!!window.worldExplorerReview);
  return{context,page,errors,consoleErrors};
 }
 async function virtual(page){const start=new Date('2026-11-03T12:00:00Z');await page.clock.install({time:start});await page.clock.pauseAt(new Date(+start+1000));}
 const state=page=>page.evaluate(()=>window.worldExplorerReview.reviewState());
 async function layout(page){
  const controls=await page.locator('[aria-label="Touch game controls"] button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height,inViewport:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};}));
  assert.equal(controls.length,3);for(const b of controls){assert(b.inViewport,JSON.stringify(b));assert(b.width>=44&&b.height>=44,JSON.stringify(b));}
  const title=await page.locator('h1').last().evaluate(n=>({scroll:n.scrollWidth,width:n.clientWidth}));assert(title.scroll<=title.width+1,'country title overflow '+page.url()+' '+JSON.stringify(title));
  const canvas=await page.locator('canvas').boundingBox();assert(canvas&&canvas.width>250&&canvas.height>200);
  const sizes=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}));assert(sizes.scroll<=sizes.width+1,'horizontal overflow');return{viewport:sizes,controls,canvas};
 }
 async function replay(code,route,mobile){
  const tape=JSON.parse(fs.readFileSync(`tmp/north-america-complete/review-tapes/${code.toLowerCase()}-${route}.json`,'utf8')),{context,page,errors,consoleErrors}=await open(code,mobile,true);
  try{
   await virtual(page);await page.evaluate(inputs=>window.worldExplorerReview.autoplay(inputs),tape.inputs);let s,frames=0,discoveryDialogs=0,midrun=false;
   while(frames++<Math.ceil(tape.inputs.length/10)+500){
    await page.clock.fastForward(250);s=await state(page);
    if(!midrun&&s.x>25){await page.screenshot({path:path.join(out,`${code.toLowerCase()}-${route}-${mobile?'mobile':'desktop'}-playing.png`)});midrun=true;}
    if(s.status==='discovery'){await page.getByRole('button',{name:'Continue adventure',exact:true}).click({force:true});discoveryDialogs++;}
    if(s.status==='completed'||s.status==='failed')break;
   }
   assert.equal(s.status,'completed',code+'/'+route+' '+JSON.stringify(s));assert.equal(s.hearts,3);assert.equal(s.tally.damage||0,0);assert.deepEqual(s.coinIds,tape.expected.coinIds);assert.deepEqual(s.starIds,tape.expected.starIds);assert.equal(s.discoveryFound,true);assert(discoveryDialogs>0);assert(midrun);assert.deepEqual(errors,[]);
   await page.getByRole('heading',{name:places[code].name+' explored!',exact:true}).waitFor();await page.screenshot({path:path.join(out,`${code.toLowerCase()}-${route}-${mobile?'mobile':'desktop'}-complete.png`)});
   const saved=await page.evaluate(code=>JSON.parse(localStorage.getItem('socialu.world-explorer.v1')).countries[code],code);assert(saved.completed);assert.equal(saved.bestCoins,s.coins);assert.equal(saved.starsEarned,s.stars);assert(saved.discoveredFactIds.length>0);
   await page.clock.resume();await page.goto(`${base}/world-explorer?country=${code}`,{waitUntil:'domcontentloaded'});await page.reload({waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:/Replay level/}).waitFor({timeout:30000});const restored=await page.evaluate(code=>JSON.parse(localStorage.getItem('socialu.world-explorer.v1')).countries[code],code);assert.deepEqual(restored,saved);await page.screenshot({path:path.join(out,`${code.toLowerCase()}-${route}-${mobile?'mobile':'desktop'}-reloaded.png`)});
   records.push({code,route,mobile,passed:true,inputFrames:tape.inputs.length,actual:s,discoveryDialogs,devicePassport:{saved,restored,replayButtonVisible:true},errors,consoleErrors});save();console.log(code,route,mobile?'mobile':'desktop','completed; passport survived reload');
  }finally{await context.close();}
 }
 async function controls(code){
  const {context,page,errors,consoleErrors}=await open(code,true,false);try{
   await virtual(page);const portrait=await layout(page),cdp=await context.newCDPSession(page);
   const point=async(action,id)=>{const b=await page.getByRole('button',{name:action==='jump'?'Jump':'Move '+action,exact:true}).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2,id};};
   const right=await point('right',1),left=await point('left',1),jump=await point('jump',2),initial=await state(page);
   const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
   await touch('touchStart',[right]);await page.clock.fastForward(250);await page.clock.fastForward(250);await touch('touchEnd',[]);await page.clock.fastForward(500);const moved=await state(page);assert(moved.x>initial.x+1.5);await page.clock.fastForward(250);assert(Math.abs((await state(page)).x-moved.x)<.1);
   await touch('touchStart',[left]);await page.clock.fastForward(250);await touch('touchEnd',[]);await page.clock.fastForward(500);const back=await state(page);assert(back.x<moved.x-.4);
   await touch('touchStart',[right,jump]);await page.clock.fastForward(250);const airborne=await state(page);assert(airborne.y>back.y+.3);await touch('touchEnd',[right]);await page.clock.fastForward(250);const jumpReleased=await state(page);assert(jumpReleased.x>airborne.x+.5,'releasing jump lost movement');await touch('touchEnd',[]);for(let i=0;i<6;i++)await page.clock.fastForward(250);const landed=await state(page);assert(landed.standing&&landed.hearts===3);
   await page.getByRole('button',{name:'Pause level',exact:true}).click({force:true});const paused=await state(page);await page.clock.fastForward(1000);assert.equal((await state(page)).elapsed,paused.elapsed);await page.screenshot({path:path.join(out,code.toLowerCase()+'-touch-portrait.png')});
   await page.setViewportSize({width:844,height:390});await page.clock.fastForward(250);const landscape=await layout(page);await page.screenshot({path:path.join(out,code.toLowerCase()+'-touch-landscape.png')});assert.deepEqual(errors,[]);
   records.push({code,passed:true,portrait,landscape,initial,moved,back,airborne,jumpReleased,landed,pauseFreezesClock:true,realTouchEvents:true,errors,consoleErrors});save();console.log(code,'portrait/landscape, touch move/jump/release/pause passed');
  }finally{await context.close();}
 }
 async function art(code){const {context,page,errors,consoleErrors}=await open(code,false,true,'standard');try{await page.evaluate(()=>window.worldExplorerReview.pause());const target=JSON.parse(fs.readFileSync('tmp/north-america-complete/capture-targets.json','utf8')).find(r=>r[0]===code);await page.evaluate(([x,y])=>window.worldExplorerReview.setReviewView('scan',x,y),target.slice(1,3));await page.screenshot({path:path.join(out,code.toLowerCase()+'-art.png')});assert.deepEqual(errors,[]);records.push({code,errors,consoleErrors,passed:true});save();console.log(code,'art captured');}finally{await context.close();}}
 const queue=[...codes];async function worker(){while(queue.length){const code=queue.shift();if(mode==='controls')await controls(code);else if(mode==='art')await art(code);else if(mode==='mobile-routes')await replay(code,'main',true);else{await replay(code,'main',false);await replay(code,'bonus',false);await replay(code,'main',true);}}}
 try{await Promise.all(Array.from({length:Number(process.env.WORKERS||2)},worker));}finally{await browser.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,mode+'-failure.txt'),e.stack);console.error(e);process.exitCode=1;});
