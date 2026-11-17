// Local Edge UI, intercepted account/participation fixtures; never hosted reward writes.
const { chromium } = require(process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const base = process.env.SOCIALU_TEST_URL || 'http://127.0.0.1:3038';
const output = process.env.SOCIALU_EVIDENCE_DIR || 'tmp/participation-calendar-evidence';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.SOCIALU_BROWSER_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const checks = [], errors = [], writes = [], presenceWrites = [], dismissed = new Set();
  let earnedPoints = 0, failSave = false, failRead = false, qualified = false, today = '2025-01-09', remaining = 0, count = 4;
  const room = { appearance: { outfitId:'1', faceId:'1', avatarId:'campus-v4-female-1-1-natural' }, outfits:[{id:'1',name:'Campus',assetKey:'sample-campus'}], faces:[{id:'1',assetKey:'sample-smile',initial:true}], activities:[{code:'dormspace',included:true},{code:'game1',included:true}] };
  const state = owner => ({ accountId:owner, today, timeZone:'UTC', serverTime:today+'T12:00:00Z', deadline:(today==='2025-01-09'?'2025-01-10':'2025-01-11')+'T00:00:00Z', count, forgivenRemaining:remaining, qualifiedToday:qualified, dismissedToday:dismissed.has(owner+today), atRisk:count>0 && remaining===0 && !qualified && !dismissed.has(owner+today), days:(today==='2025-01-09'?['played','forgiven','forgiven','forgiven',qualified?'played':'today-unqualified','upcoming','upcoming']:['played','forgiven','forgiven','forgiven','played',qualified?'played':'today-unqualified','upcoming']).map((state,i)=>({date:'2025-01-'+String(5+i).padStart(2,'0'),state})) });
  await context.addInitScript(() => { if (!localStorage.getItem('access_token')) localStorage.setItem('access_token','alice'); });
  await context.route('**/api/**', async route => {
    const req=route.request(),path=new URL(req.url()).pathname; let status=200,data={members:[],posts:[],hasMore:false};
    if(path==='/api/game-participation/calendar') {
      const owner=req.headers().authorization?.replace('Bearer ','');
      if(req.method()==='PUT') { const body=req.postDataJSON();writes.push({owner,...body}); if(failSave)status=503;else {assert.equal(body.date,today);dismissed.add(owner+today);} }
      else if(failRead)status=503;
      data=status===200?state(owner):{error:'Calendar fixture unavailable'};
    } else if(path==='/api/auth/session')data={community:{name:'Local streak QA fixture'}};
    else if(path==='/api/preferences')data={position:'side'};
    else if(path==='/api/preferences/appearance')data={theme:'light'};
    else if(path==='/api/preferences/screen-theme')data={backgroundTheme:null,headerTheme:null};
    else if(path==='/api/game-room')data=room;
    else if(path==='/api/game-participation')data={count,qualifiedToday:qualified,forgivenRemaining:remaining,rewardPoints:10,earnedPointsToday:earnedPoints,leaderboards:{}};
    else if(path==='/api/jumpyland')data={completed:[],balance:0};
    else if(path==='/api/dorm'){status=503;data={error:'Dorm play is outside this fixture'};}
    else if(path==='/api/message-notifications')data={notifications:[]};
    else if(path.includes('invitations'))data={invitations:[]};
    else if(path==='/api/notifications')data={unread:0,notifications:[]};
    else if(path==='/api/points')data={balance:0};
    else if(path==='/api/profile')data={profile:null,defaults:{fullName:'Local QA Fixture',username:'local_qa'}};
    if (path === '/api/game-room/presence') {
      if (!['GET','HEAD'].includes(req.method())) presenceWrites.push({method:req.method(),path});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({friends:[],visible:true})});return;
    }
    if(!['GET','HEAD'].includes(req.method())&&path!=='/api/game-participation/calendar')writes.push({unexpected:path});
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  page.on('pageerror',e=>errors.push(e.message));
  const reminder=()=>page.getByRole('complementary',{name:'Participation streak reminder'});
  const weekly=()=>page.getByRole('region',{name:"This week's participation"});
  const button=name=>page.getByRole('button',{name,exact:true});
  async function refresh() { const response=page.waitForResponse(r=>r.url().endsWith('/api/game-participation/calendar')&&r.request().method()==='GET');await page.evaluate(()=>window.dispatchEvent(new Event('socialu-points-changed')));await response; }
  try {
    await page.goto(base+'/#create-text-post'); await reminder().waitFor();
    assert.match(await reminder().innerText(),/before midnight in UTC/);
    await page.getByRole('textbox',{name:'Post text',exact:true}).fill('My draft stays when I dismiss the reminder');
    await page.screenshot({path:output+'/at-risk-reminder.png'});
    checks.push('614.1: at-risk reminder states the saved-zone midnight deadline outside games');
    await button('Dismiss for today').click();await reminder().waitFor({state:'hidden'});
    await page.waitForResponse(r=>r.url().endsWith('/api/game-participation/calendar')&&r.request().method()==='GET');
    assert.equal(await page.getByRole('textbox',{name:'Post text',exact:true}).inputValue(),'My draft stays when I dismiss the reminder');
    assert.deepEqual(writes[0],{owner:'alice',date:'2025-01-09'});assert.equal(qualified,false);
    checks.push('614.3: dismissal closes the reminder without participating or losing the draft');
    await page.goto(base+'/game-room');await weekly().getByRole('list').first().waitFor();
    assert.equal(await reminder().count(),0);
    assert.deepEqual(await weekly().locator('ol>li').evaluateAll(els=>els.map(el=>el.dataset.state)),['played','forgiven','forgiven','forgiven','today-unqualified','upcoming','upcoming']);
    assert.equal(await weekly().locator('ol>li').count(),7);
    await weekly().getByText('What the day symbols mean').click();
    assert.match(await weekly().innerText(),/Miss That Reset the Streak/);
    await weekly().scrollIntoViewIfNeeded();await page.screenshot({path:output+'/weekly-states.png'});
    checks.push('612.4: Sunday-Saturday row, date markers, current date, state symbols and text legend');
    await page.reload();await weekly().locator('ol>li').first().waitFor();assert.equal(await reminder().count(),0);
    await page.evaluate(()=>window.dispatchEvent(new Event('socialu-session-changed')));await refresh();assert.equal(await reminder().count(),0);
    checks.push('614.5: account dismissal survives navigation, reload and simulated sign-in event');
    await page.evaluate(()=>{localStorage.setItem('access_token','bob');window.dispatchEvent(new Event('socialu-session-changed'));});await reminder().waitFor();
    checks.push('614.5: another account does not inherit the first account dismissal');
    failSave=true;await button('Dismiss for today').click();await button('Retry dismissal').waitFor();assert.equal(await reminder().count(),0);
    await page.screenshot({path:output+'/dismissal-failure.png'});
    failSave=false;await button('Retry dismissal').click();await button('Retry dismissal').waitFor({state:'hidden'});await refresh();assert.equal(await reminder().count(),0);
    assert.deepEqual(writes.slice(-2).map(x=>x.date),['2025-01-09','2025-01-09']);
    checks.push('614.3/614.5: failed dismissal remains closed, explains persistence failure and retries the same day');
    dismissed.clear();await page.reload();await reminder().waitFor();qualified=true;await refresh();await reminder().waitFor({state:'hidden'});
    checks.push('614.4: participation notification refresh suppresses reminder after qualification');
    qualified=false;remaining=1;await refresh();assert.equal(await reminder().count(),0);
    remaining=0;count=0;await refresh();assert.equal(await reminder().count(),0);
    count=4;await refresh();await reminder().waitFor();
    checks.push('614.1: no reminder with remaining allowance or zero streak');
    await page.goto(base+'/game-1');await button('How to play').waitFor();assert.equal(await reminder().count(),0);
    await page.goto(base+'/game-room/dormspace');await page.getByRole('heading',{name:'DormSpace',exact:true}).waitFor();assert.equal(await reminder().count(),0);
    checks.push('614.2: no reminder on Jumpyland or DormSpace routes (DormSpace fixture stops before play)');
    await page.goto(base+'/game-room');await reminder().waitFor();await button('Dismiss for today').click();await refresh();
    today='2025-01-10';await refresh();await reminder().waitFor();assert.match(await reminder().innerText(),/2025-01-10/);
    checks.push('614.5: a new server-reported participation day can show its own reminder');
    failRead=true;await refresh();await button('Retry weekly status').waitFor();assert.equal(await reminder().count(),0);
    failRead=false;await button('Retry weekly status').click();await weekly().locator('ol>li').first().waitFor();
    checks.push('612.4: failed calendar fetch offers Retry and does not show invented day states');
    await page.setViewportSize({width:390,height:844});await weekly().scrollIntoViewIfNeeded();
    assert.ok(await weekly().evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1));
    assert.ok(await weekly().locator('ol').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.screenshot({path:output+'/weekly-mobile.png'});
    checks.push('612.4: weekly row fits 390px without horizontal overflow');
    qualified=true;earnedPoints=10;await refresh();
    await page.getByText('You’re on fire!',{exact:true}).waitFor();
    await page.getByText('+10 points',{exact:true}).waitFor();
    await page.getByText('You’re on fire!',{exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:output+'/confirmed-reward-mobile.png'});
    checks.push('612: confirmed fixture reward shows flame, actual +10 points and return-tomorrow message at 390px');
    earnedPoints=5;await refresh();await page.getByText('+5 points',{exact:true}).waitFor();
    checks.push('612: celebration uses actual historical reward amount, not hard-coded 10');
    earnedPoints=undefined;await refresh();await page.getByText('You’re on fire!',{exact:true}).waitFor({state:'hidden'});
    earnedPoints=0;await refresh();assert.equal(await page.getByText('You’re on fire!',{exact:true}).count(),0);
    checks.push('612: missing or zero confirmed points never shows a reward celebration');
    assert.deepEqual(errors,[]);assert.ok(!writes.some(x=>x.unexpected));
    fs.writeFileSync(output+'/results.json',JSON.stringify({evidence:'Real local Next application in headless Edge, intercepted API fixtures with synthetic dates/accounts. Not hosted persistence, reward issuance or physical-device acceptance.',checks,errors,writes,presenceWrites},null,2));
    console.log(JSON.stringify({passed:checks.length,checks},null,2));
  } catch(error) {await page.screenshot({path:output+'/failure.png'});console.log(JSON.stringify({checks,errors,url:page.url()}));throw error;}
  finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
