// Real local Next UI; all API requests intercepted with synthetic account data.
const { chromium } = require(process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), assert = require('node:assert/strict');
const base = process.env.SOCIALU_TEST_URL || 'http://127.0.0.1:3027';
const output = process.env.SOCIALU_EVIDENCE_DIR || 'tmp/navigation-layout';
(async () => {
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({headless:true,executablePath:process.env.SOCIALU_BROWSER_EXECUTABLE});
  const context = await browser.newContext(); const page = await context.newPage();
  const checks=[],errors=[]; let position='top';
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>localStorage.setItem('access_token','navigation-layout-fixture'));
  await context.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    let data={posts:[],members:[],notifications:[],invitations:[],hasMore:false};
    if(path==='/api/auth/session')data={community:{name:'Local layout QA fixture'}};
    else if(path==='/api/preferences') {if(route.request().method()==='PUT')position=route.request().postDataJSON().position;data={position};}
    else if(path==='/api/preferences/appearance')data={theme:'light'};
    else if(path==='/api/preferences/screen-theme')data={backgroundTheme:null,headerTheme:null};
    else if(path==='/api/points')data={balance:0};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  try {
    await page.goto(base+'/'); const nav=page.getByRole('navigation',{name:'Main navigation'});
    await page.waitForFunction(()=>document.querySelector('[data-navigation]')?.dataset.navigation==='top');
    for(const placement of ['top','bottom']){
      if(placement==='bottom'){
        await nav.getByRole('button',{name:'Preferences',exact:true}).click();
        await nav.getByRole('button',{name:'Bottom',exact:true}).click();
        await page.waitForFunction(()=>document.querySelector('[data-navigation]')?.dataset.navigation==='bottom');
        await nav.getByRole('button',{name:'Close',exact:true}).click();
      }
      for(const width of [320,390,640,768,1000,1080,1280,1440]){
        await page.setViewportSize({width,height:900});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const result=await nav.evaluate(el=>{
          const nodes=[...el.querySelectorAll(':scope > ul > li'),...el.querySelectorAll(':scope > button'),...el.querySelectorAll(':scope > div > button')];
          const rects=nodes.filter(n=>n.getBoundingClientRect().width>0).map(n=>{const r=n.getBoundingClientRect();return {label:n.textContent.trim(),left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
          const overlaps=[];
          for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([a.label,b.label]);}
          return {innerWidth,media1000:matchMedia('(max-width: 1000px)').matches,navCss:{gap:getComputedStyle(el).gap,rectLeft:el.getBoundingClientRect().left,rectWidth:el.getBoundingClientRect().width,rectBottom:el.getBoundingClientRect().bottom,width:getComputedStyle(el).width,left:getComputedStyle(el).left,right:getComputedStyle(el).right,transform:getComputedStyle(el).transform},rects,overlaps,overflow:rects.some(r=>r.left< -1||r.right>innerWidth+1)};
        });
        checks.push({placement,width,...result});
        if(width===1080||width===390||width===768)await page.screenshot({path:`${output}/${placement}-${width}.png`});
      }
    }
    const broken=checks.filter(x=>x.overlaps.length||x.overflow);
    fs.writeFileSync(output+'/results.json',JSON.stringify({checks,errors,broken:broken.length},null,2));
    if(process.argv.includes('--baseline'))assert.ok(broken.length,'Baseline must reproduce overlap/overflow');
    else {assert.deepEqual(broken,[]);assert.deepEqual(errors,[]);
      await nav.getByRole('button',{name:'Create',exact:true}).click();await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');assert.ok(await nav.getByRole('button',{name:'Create',exact:true}).evaluate(el=>el===document.activeElement));
    }
    fs.writeFileSync(output+'/results.json',JSON.stringify({evidence:'Local Edge, synthetic API fixtures; no hosted writes.',checks,errors,broken:broken.length},null,2));
    console.log(JSON.stringify({layouts:checks.length,broken:broken.length,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
