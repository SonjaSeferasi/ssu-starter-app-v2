// Real local UI; API fixtures and a synthetic camera, never a hosted account.
const {chromium}=require(process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sharp=require('sharp');
const output=process.env.SOCIALU_EVIDENCE_DIR || 'tmp/avatar-srs-evidence';
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.SOCIALU_BROWSER_EXECUTABLE,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.setDefaultTimeout(30000);
 const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 let failLook=false,failPhoto=false,puts=0,posts=0;
 const room={appearance:{outfitId:'1',faceId:'1',avatarId:'campus-v4-female-1-1-natural'},outfits:[{id:'1',name:'Campus',assetKey:'sample-campus'}],faces:[{id:'1',assetKey:'sample-smile',initial:true}],activities:[]};
 await context.addInitScript(()=>localStorage.setItem('access_token','local-avatar-fixture'));
 await context.route('**/api/**',async route=>{
  const p=new URL(route.request().url()).pathname;let status=200,data={};
  if(p==='/api/auth/session')data={community:{name:'Local QA fixture'}};
  else if(p==='/api/preferences')data={position:'side'};
  else if(p==='/api/message-notifications')data={notifications:[]};
  else if(p==='/api/group-invitations'||p==='/api/events/invitations')data={invitations:[]};
  else if(p==='/api/notifications')data={unread:0,notifications:[]};
  else if(p==='/api/points')data={balance:0};
  else if(p==='/api/game-room'){
   if(route.request().method()==='PUT'){puts++;if(failLook){status=503;data={error:'Fixture: save unavailable'};}else room.appearance=route.request().postDataJSON();}
   if(status===200)data=room;
  }else if(p==='/api/game-room/photo'){
   posts++;if(failPhoto){status=503;data={error:'Fixture: photo save unavailable'};}
   else {const body=route.request().postDataJSON();assert.ok(body.image.startsWith('data:image/jpeg;base64,'));data={photoFaceId:'9',photoFaceUrl:body.image};room.appearance={...room.appearance,faceId:null,...data};}
  }else {status=503;data={error:'Not included in avatar fixture'};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 const button=name=>page.getByRole('button',{name,exact:true}).first();
 const fixture=await sharp({create:{width:800,height:600,channels:3,background:'#e9978b'}}).composite([{input:Buffer.from('<svg width="800" height="600"><circle cx="400" cy="300" r="190" fill="#f8d38d"/><circle cx="345" cy="265" r="15"/><circle cx="455" cy="265" r="15"/><path d="M340 350 Q400 410 460 350" fill="none" stroke="black" stroke-width="12"/></svg>')}]).png().toBuffer();
 try{
  await page.goto((process.env.SOCIALU_TEST_URL||'http://127.0.0.1:3037')+'/game-room');
  await button('Green campus').click();await page.getByText('Avatar saved.',{exact:true}).waitFor();assert.equal(puts,1);assert.ok(room.appearance.avatarId.includes('female-2-'));
  await page.reload();await button('Green campus').waitFor();assert.equal(await button('Green campus').getAttribute('aria-pressed'),'true');checks.push('608.3: outfit saves automatically and restores on fixture reload');
  failLook=true;await button('Lavender study').click();await page.getByRole('alert').filter({hasText:'previously saved appearance'}).waitFor();assert.equal(await button('Green campus').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:output+'/autosave-recovery.png'});failLook=false;await button('Retry').click();await page.getByText('Avatar saved.',{exact:true}).waitFor();assert.equal(await button('Lavender study').getAttribute('aria-pressed'),'true');checks.push('608.6: failed outfit rolls back; Retry saves the failed selection');
  await button('Face').click();await button('Round glasses').click();await page.getByText('Avatar saved.',{exact:true}).waitFor();assert.ok(room.appearance.avatarId.endsWith('glasses'));checks.push('608.5: default face saves without Save Look');
  await button('Use a Photograph').click();const dialog=page.getByRole('dialog');await dialog.waitFor();
  await dialog.locator('input[type=file]').setInputFiles({name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await dialog.getByRole('alert').waitFor();assert.equal(posts,0);
  await dialog.locator('input[type=file]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:fixture});await dialog.locator('[aria-label="Photographic face"]').waitFor();
  await page.getByRole('slider',{name:'Crop size',exact:true}).fill('2');await page.getByRole('slider',{name:'Horizontal position',exact:true}).fill('0.6');
  assert.equal(posts,0);await page.screenshot({path:output+'/photo-crop.png'});checks.push('609.1–609.7: file validation, resize/reposition and image preview; no save before confirmation');
  await button('Close editor').click();await button('Keep Editing').click();assert.equal(await page.getByRole('slider',{name:'Crop size',exact:true}).inputValue(),'2');
  await page.keyboard.press('Escape');await button('Discard Changes').click();await dialog.waitFor({state:'hidden'});assert.equal(room.appearance.faceId,'1');assert.equal(posts,0);checks.push('609.10–609.12: Keep Editing retains crop; Escape/Discard closes without changing saved face');
  await button('Use a Photograph').click();await dialog.locator('input[type=file]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:fixture});await button('Save Photograph').waitFor();
  failPhoto=true;await button('Save Photograph').click();await button('Retry').waitFor();assert.equal(room.appearance.faceId,'1');assert.ok(await dialog.locator('[aria-label="Photographic face"]').count());
  failPhoto=false;await button('Retry').click();await dialog.waitFor({state:'hidden'});assert.equal(room.appearance.faceId,null);checks.push('609.8–609.9: failed Save retains candidate; Retry explicitly saves photograph');
  await page.reload();await button('Face').click();await page.locator('[aria-label="Photographic face"]').waitFor();
  await button('Outfit').click();await button('Cream knit').click();await page.getByText('Avatar saved.',{exact:true}).waitFor();assert.equal(room.appearance.photoFaceId,'9');
  await button('Face').click();await button('Natural').click();await page.getByText('Avatar saved.',{exact:true}).waitFor();assert.equal(room.appearance.photoFaceUrl,undefined);checks.push('Saved photo restores after fixture reload, survives outfit changes, and is replaced by default face');
  await button('Use a Photograph').click();await button('Take Photograph').click();await button('Capture Photograph').waitFor();await page.waitForFunction(()=>document.querySelector('video')?.videoWidth>0);await button('Capture Photograph').click();await dialog.locator('[aria-label="Photographic face"]').waitFor();await button('Close editor').click();await button('Discard Changes').click();checks.push('609.2: synthetic camera capture enters the same editable crop workflow');
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));});await button('Use a Photograph').click();await button('Take Photograph').click();await dialog.getByRole('alert').filter({hasText:'denied'}).waitFor();assert.ok(await button('Choose Another Photograph').isEnabled());checks.push('609.13: denied camera access explains the problem and offers file selection');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/camera-fallback-mobile.png'});assert.ok(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth));checks.push('Photo dialog fits 390px mobile viewport');
  if(process.env.SOCIALU_HEIC_FIXTURE){
   await dialog.locator('input[type=file]').setInputFiles(process.env.SOCIALU_HEIC_FIXTURE);
   await dialog.locator('[aria-label="Photographic face"]').waitFor({timeout:60000});
   assert.equal(await dialog.getByRole('alert').count(),0);
   assert.ok(await button('Save Photograph').isEnabled());
   checks.push('609.3: genuine heic2any demo HEIC decoded locally and produced an editable image');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/results.json',JSON.stringify({evidence:'Local Edge, intercepted API fixture, synthetic camera and synthetic image; optional official HEIC sample. Not hosted persistence or physical-camera acceptance.',checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }catch(e){await page.screenshot({path:output+'/failure.png'});console.log(JSON.stringify({checks,errors}));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
