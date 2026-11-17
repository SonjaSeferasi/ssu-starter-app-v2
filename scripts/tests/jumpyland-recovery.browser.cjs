// Production Game component with isolated engine/map/audio adapters and HTTP fixtures.
// This proves UI recovery, not a real level playthrough or hosted saving.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require(process.env.SOCIALU_PLAYWRIGHT_MODULE||'playwright');
const output=process.env.SOCIALU_EVIDENCE_DIR||'documentation/jumpyland/recovery-2026-11-17';
const buildDir=path.resolve('tmp/jumpyland-recovery-browser');
(async()=>{
 fs.mkdirSync(buildDir,{recursive:true});fs.mkdirSync(output,{recursive:true});
 const stubs={
  'next/navigation':`export function useRouter(){return {push(path){window.dispatchEvent(new CustomEvent('qa-navigation',{detail:path}));}}}`,
  './avatar-texture':`export async function avatarTexture(){return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';}`,
  '../game-room/avatar-preview':`import React from 'react';export function AvatarPreview(){return React.createElement('svg',{'aria-label':'QA avatar',width:64,height:64},React.createElement('circle',{cx:32,cy:32,r:24,fill:'purple'}));}`,
  './audio':`export class GameAudio{setVolume(){}setEnabled(){}destroy(){}play(){}pause(){}end(){}effect(){}async unlock(){}async resume(){}}`,
  './world-map':`import React from 'react';export function WorldMap({onStart,error}){return <section><p>QA map adapter: level rendering is not under test.</p><button onClick={()=>onStart(1)}>Start QA level 1</button>{error&&<p role="alert">{error}</p>}</section>}`,
  './engine':`export function mountGame(host,course,sheet,held,onCoins,onEnd,onPause,onReady){let ended=false;const button=document.createElement('button');button.textContent='QA: reach finish with 3 coins';button.style.cssText='margin:40px;padding:20px;color:#fff;background:#594083';button.onclick=()=>{if(!ended){ended=true;onCoins(3);onEnd('complete',3);}};host.append(button);const controller={pause(){},resume(){},destroy(){button.remove();}};onReady(controller);return()=>controller.destroy();}`
 };
 await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Game from './components/jumpyland/game';window.addEventListener('qa-navigation',e=>{document.getElementById('navigation').textContent=e.detail;});createRoot(document.getElementById('root')).render(<Game/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,outfile:path.join(buildDir,'bundle.js'),format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'qa-adapters',setup(build){build.onResolve({filter:/.*/},args=>{if(stubs[args.path])return {path:args.path,namespace:'qa'};if(args.kind==='url-token'&&args.path.startsWith('/'))return {path:args.path,external:true};});build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:process.cwd()}));}}]});
 const server=http.createServer((req,res)=>{
  const file=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null;
  if(file){res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/css');return res.end(fs.readFileSync(path.join(buildDir,file)));}
  if(req.url!=='/'){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><link rel="stylesheet" href="/bundle.css"></head><body style="margin:0"><div style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;padding:6px;background:#fff4c9;color:#302300;font:12px sans-serif">Local Jumpyland component QA — simulated completion and API responses</div><output id="navigation" aria-label="QA navigation destination"></output><div id="root"></div><script src="/bundle.js"></script></body></html>');
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.SOCIALU_BROWSER_EXECUTABLE});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(20000);
 const errors=[],checks=[],writes=[];let mode='error';
 const room={appearance:{outfitId:'1',faceId:'1'},outfits:[{id:'1',name:'QA',assetKey:'sample-campus'}],faces:[{id:'1',assetKey:'sample-smile',initial:true}],activities:[]};
 await context.addInitScript(()=>localStorage.setItem('access_token','qa-account'));
 await context.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data={};
  if(url.pathname==='/api/game-room')data=room;
  else if(url.pathname==='/api/auth/refresh'){await new Promise(resolve=>setTimeout(resolve,18000));data={session:{access_token:'qa-account',refresh_token:'qa-refresh',expires_at:9999999999}};}
  else if(url.pathname==='/api/jumpyland'){
   if(req.method()==='GET')data={completed:[],balance:0};
   else {const body=req.postDataJSON();writes.push(body);if(body.action==='start')data={completed:[],balance:0};else{
    if(mode==='error')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA connection lost after sending completion.'})});
    if(mode==='hang'||mode==='late')await new Promise(resolve=>setTimeout(resolve,18000));
    if(mode==='delayed')await new Promise(resolve=>setTimeout(resolve,1500));
    data=mode==='malformed'?{completed:[],balance:0}:{completed:[1],balance:25,reward:{points:25}};
   }}
  }
  try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});}catch{/* Aborted fixture requests must not mutate UI. */}
 });
 page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 const dialog=()=>page.getByRole('dialog');
 async function start(){await page.goto(`http://127.0.0.1:${server.address().port}/`);await button('Start QA level 1').click();if(await button('Resume').isVisible())await button('Resume').click();await button('QA: reach finish with 3 coins').waitFor();}
 async function finish(){await button('QA: reach finish with 3 coins').click();}
 async function back(){await button('← Back to Game Room').click();}
 try{
  await start();await finish();await button('Retry saving').waitFor();
  assert.match(await dialog().innerText(),/Saving your result is not confirmed/);assert.doesNotMatch(await dialog().innerText(),/Your result has not been saved/);assert.equal(await button('Replay level').count(),0);assert.equal(await button('Next level →').count(),0);
  await page.screenshot({path:output+'/unconfirmed-completion.png'});checks.push('619.7/619.8: ambiguous failure retains result, avoids certain-loss wording, blocks Replay/Next');
  const original=writes.filter(w=>w.action==='complete').at(-1);await back();await button('Stay and Retry').waitFor();await page.screenshot({path:output+'/unconfirmed-exit.png'});
  mode='success';await button('Stay and Retry').click();await button('Replay level').waitFor();assert.deepEqual(writes.filter(w=>w.action==='complete').at(-1),original);assert.equal(await page.locator('#navigation').innerText(),'');checks.push('619.9/622.6/622.7: Stay and Retry resends the same attempt and coins without leaving or replaying');
  await back();assert.equal(await page.locator('#navigation').innerText(),'/game-room');checks.push('622.9: confirmed result returns directly without attempt-loss warning');
  mode='error';await start();await finish();await button('Retry saving').waitFor();await back();await button('Leave Without Saving').click();assert.equal(await page.locator('#navigation').innerText(),'/game-room');checks.push('622.8: Leave Without Saving returns without claiming success');
  mode='malformed';await start();await finish();await button('Retry saving').waitFor();assert.match(await dialog().innerText(),/did not confirm this level/);assert.equal(await button('Replay level').count(),0);checks.push('619.7/619.8: malformed successful HTTP response cannot unlock another attempt');
  mode='delayed';await start();await finish();await back();await page.locator('#navigation').filter({hasText:'/game-room'}).waitFor();checks.push('622.9: pending Back automatically returns once completion is confirmed');
  await start();await finish();await back();await button('Stay').click();await button('Replay level').waitFor();assert.equal(await page.locator('#navigation').innerText(),'');checks.push('622.7/622.9: Stay cancels pending return while letting saving finish');
  mode='hang';await start();await finish();await back();const began=Date.now();await button('Stay').waitFor();await new Promise(r=>setTimeout(r,2500));await back();await new Promise(r=>setTimeout(r,2500));await back();await button('Stay and Retry').waitFor();const elapsed=Date.now()-began;assert.ok(elapsed<=10000,`Recovery took ${elapsed}ms`);await page.screenshot({path:output+'/bounded-return.png'});checks.push(`622.10/NFR-65: repeated Back does not restart deadline; recovery in ${elapsed}ms after first Back`);
  mode='success';await button('Stay and Retry').click();await button('Replay level').waitFor();const last=writes.filter(w=>w.action==='complete').slice(-2);assert.deepEqual(last[0],last[1]);await new Promise(r=>setTimeout(r,10000));assert.equal(await button('Replay level').count(),1);checks.push('619.9: retry confirms same completion; late abandoned response cannot replace it');
  await start();await page.evaluate(()=>localStorage.setItem('socialu_session',JSON.stringify({access_token:'qa-account',refresh_token:'qa-refresh',expires_at:1})));const before=writes.length;await finish();await back();await button('Stay and Retry').waitFor();assert.equal(writes.length,before);await button('Leave Without Saving').click();await new Promise(r=>setTimeout(r,10000));assert.equal(writes.length,before);checks.push('622.10/NFR-65: stalled token refresh is bounded and cannot later send the expired completion request');
  await page.setViewportSize({width:390,height:844});mode='error';await start();await finish();await button('Retry saving').waitFor();await back();assert.ok(await dialog().evaluate(el=>el.getBoundingClientRect().width<=innerWidth));await page.screenshot({path:output+'/recovery-mobile.png'});checks.push('622.6: recovery choices remain available at 390px');
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/results.json',JSON.stringify({evidence:'Production Jumpyland React component with test-only engine/map/avatar/audio adapters and intercepted API responses, headless Edge. No actual level completion, hosted save or reward grant.',checks,errors,writes},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }catch(error){await page.screenshot({path:output+'/failure.png'});console.log(JSON.stringify({checks,errors}));throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
