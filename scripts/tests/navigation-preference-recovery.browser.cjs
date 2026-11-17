// Production SocialShell + NavigationFrame; unrelated widgets adapted and account APIs simulated.
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),esbuild=require('esbuild');
const {chromium}=require(process.env.SOCIALU_PLAYWRIGHT_MODULE||'playwright');
const baseline=process.env.SOCIALU_NAV_BASELINE==='1';
const output='documentation/navigation/preference-recovery-2026-11-17'+(baseline?'/before':''),buildDir=path.resolve('tmp/navigation-preference-recovery'+(baseline?'-before':''));
(async()=>{
 fs.mkdirSync(output,{recursive:true});fs.mkdirSync(buildDir,{recursive:true});
 const appearance=`export function AppearanceProvider({children}){return children} export function AppearanceChoices(){return null} export function useAppearance(){return null}`;
 const stubs={
  'next/link':`import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`,
  'next/navigation':`import {useEffect,useState} from 'react';export function usePathname(){const [path,setPath]=useState('/profile');useEffect(()=>{const update=e=>setPath(e.detail);window.addEventListener('qa-route',update);return()=>window.removeEventListener('qa-route',update)},[]);return path}`,
  './appearance-preferences':appearance,
  './participation-reminder':`export function ParticipationReminder(){return null}`,
  '../game-room/friend-presence':`export function GamePresencePublisher(){return null}`,
  '../profile/use-screen-theme':`import {createContext} from 'react';export const ScreenThemeContext=createContext(null);export function useScreenTheme(){return {backgroundTheme:null}}`,
  '../chat/message-notifications':`export function useMessageNotifications(){return {count:0,unreadMessages:0,notifications:[]}} export function MessageCountIcon(){return null}`,
  './points-badge':`export function PointsBadge(){return null}`
 };
 await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {SocialShell} from './components/navigation/social-shell';createRoot(document.getElementById('root')).render(<SocialShell><h1>QA Profile content</h1><label>Unsubmitted note <input aria-label="Unsubmitted note" defaultValue="keep this draft"/></label></SocialShell>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,outfile:path.join(buildDir,'bundle.js'),jsx:'automatic',format:'iife',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'qa-adapters',setup(build){
  build.onResolve({filter:/.*/},args=>{if(stubs[args.path])return {path:args.path,namespace:'qa'};if(args.kind==='url-token'&&args.path.startsWith('/'))return {path:args.path,external:true};});
  build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:process.cwd()}));
  if(baseline)build.onLoad({filter:/social-shell\.tsx$/},args=>({contents:execFileSync('git',['show','5503931e:components/navigation/social-shell.tsx'],{encoding:'utf8'}),loader:'tsx',resolveDir:path.dirname(args.path)}));
 }}]});
 const server=http.createServer((req,res)=>{
  if(req.url==='/bundle.js'||req.url==='/bundle.css'){res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':'text/css');return res.end(fs.readFileSync(path.join(buildDir,req.url.slice(1))));}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/bundle.css"></head><body style="margin:0"><div id="root"></div><aside style="position:fixed;bottom:0;right:0;z-index:2147483647;max-width:390px;padding:6px;background:#fff4c9;color:#302300;font:12px sans-serif">Local navigation component QA - simulated account/API responses</aside><script src="/bundle.js"></script></body></html>');
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.SOCIALU_BROWSER_EXECUTABLE}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(18000);
 let saved='side',readMode='success',saveMode='success',refreshDelay=0;const checks=[],errors=[],requests=[];
 await context.addInitScript(()=>localStorage.setItem('access_token','qa-token'));
 await context.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/preferences'){
   const record={method:req.method(),body:req.method()==='PUT'?req.postDataJSON():null,authorization:req.headers().authorization};requests.push(record);
   const mode=req.method()==='PUT'?saveMode:readMode;
   if(mode==='hang')await new Promise(resolve=>setTimeout(resolve,13000));
   if(mode==='error')return route.fulfill({status:503,body:'QA gateway failure'}).catch(()=>{});
   let position=saved;if(req.method()==='PUT'){position=mode==='mismatch'?'side':record.body.position;if(mode==='success')saved=position;}
   if(mode==='invalid')position='diagonal';
   return route.fulfill({json:{position}}).catch(()=>{});
  }
  if(url.pathname==='/api/auth/refresh'){if(refreshDelay)await new Promise(resolve=>setTimeout(resolve,refreshDelay));return route.fulfill({json:{session:{access_token:'qa-refreshed',refresh_token:'qa-refresh',expires_at:9999999999}}}).catch(()=>{});}
  return route.fulfill({json:url.pathname==='/api/auth/session'?{community:{name:'Local QA account'}}:{unread:0,notifications:[],invitations:[]}});
 });
 page.on('pageerror',e=>errors.push(e.message));
 const nav=()=>page.getByRole('navigation',{name:'Main navigation'}),choice=name=>nav().getByRole('button',{name,exact:true}),retry=()=>choice('Retry');
 const placement=()=>page.locator('[data-navigation]').getAttribute('data-navigation');
 async function open(){await page.goto(`http://127.0.0.1:${server.address().port}/profile`);await choice('Preferences').click();await choice('Side').waitFor();}
 async function settled(){await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(el=>el.textContent==='Side')?.disabled);}
 try{
  if(baseline){
   readMode='invalid';await open();await settled();assert.equal(await retry().count(),0);assert.equal(await placement(),'side');checks.push('BEFORE: invalid stored placement silently leaves Side, with no error or Retry');
   readMode='success';saveMode='mismatch';await open();await settled();await choice('Bottom').click();await settled();assert.equal(await retry().count(),0);assert.equal(await placement(),'bottom');checks.push('BEFORE: response confirms Side after selecting Bottom, yet no unconfirmed-save warning appears');await page.screenshot({path:output+'/mismatched-save.png'});
  }else{
   saved='bottom';await open();await settled();assert.equal(await placement(),'bottom');checks.push('601.4: valid Bottom restores from fixture account');
   readMode='invalid';await open();await retry().waitFor();assert.match(await nav().innerText(),/saved placement could not be loaded/);await page.screenshot({path:output+'/invalid-load.png'});checks.push('601.4: malformed load is reported with Retry');
   const beforeRetry=requests.length;readMode='success';saved='top';await retry().click();await settled();assert.equal(await placement(),'top');assert.deepEqual(requests.slice(beforeRetry).map(r=>r.method),['GET']);checks.push('601.4: load Retry reads saved Top without writing fallback Side');
   await page.getByRole('textbox',{name:'Unsubmitted note'}).fill('draft remains');saveMode='mismatch';await choice('Bottom').click();await retry().waitFor();assert.equal(await placement(),'bottom');assert.match(await nav().innerText(),/not confirmed saved/);await page.screenshot({path:output+'/mismatched-save.png'});checks.push('601.5: mismatched save response retains selected Bottom and reports unconfirmed saving');
   saveMode='success';await retry().click();await settled();assert.deepEqual(requests.filter(r=>r.method==='PUT').slice(-2).map(r=>r.body),[{position:'bottom'},{position:'bottom'}]);assert.equal(await page.getByRole('textbox',{name:'Unsubmitted note'}).inputValue(),'draft remains');checks.push('601.6/601.7: Retry resends Bottom automatically without replacing page content');
   await open();await settled();assert.equal(await placement(),'bottom');checks.push('601.4: confirmed saved placement restores after fixture reload');
   saveMode='error';await choice('Top').click();await retry().waitFor();assert.equal(await placement(),'top');saveMode='success';await retry().click();await settled();assert.equal(saved,'top');checks.push('601.5/601.6: HTTP failure retains Top and Retry confirms Top');
   await page.evaluate(()=>localStorage.setItem('socialu_session',JSON.stringify({access_token:'qa-token',refresh_token:'qa-refresh',expires_at:1})));await choice('Side').click();await settled();assert.equal(requests.filter(r=>r.method==='PUT').at(-1).authorization,'Bearer qa-refreshed');checks.push('601.7: saves use a refreshed token, not the expired stored token');
   saveMode='hang';const began=Date.now();await choice('Bottom').click();await retry().waitFor();const elapsed=Date.now()-began;assert.ok(elapsed<11000);assert.ok(await choice('Side').isEnabled());await page.screenshot({path:output+'/save-timeout.png'});checks.push('601.5: stalled save exposes Retry and unlocks controls in '+elapsed+'ms');
   saveMode='success';await retry().click();await settled();await new Promise(resolve=>setTimeout(resolve,4500));assert.equal(await placement(),'bottom');assert.equal(await retry().count(),0);checks.push('601.6: retry confirms retained Bottom and late expired response does not alter UI');
   readMode='hang';await open();await retry().waitFor();assert.match(await nav().innerText(),/could not be loaded/);readMode='success';await retry().click();await settled();checks.push('601.4: stalled load exposes Retry and can recover');
   refreshDelay=13000;await page.evaluate(()=>localStorage.setItem('socialu_session',JSON.stringify({access_token:'qa-refreshed',refresh_token:'qa-refresh',expires_at:1})));const writesBefore=requests.filter(r=>r.method==='PUT').length;await choice('Top').click();await retry().waitFor();assert.equal(requests.filter(r=>r.method==='PUT').length,writesBefore);await new Promise(resolve=>setTimeout(resolve,4500));assert.equal(requests.filter(r=>r.method==='PUT').length,writesBefore);refreshDelay=0;await retry().click();await settled();assert.equal(saved,'top');checks.push('601.5/601.6: stalled refresh never sends expired save; later Retry saves retained Top');
   await page.setViewportSize({width:390,height:844});saveMode='mismatch';await choice('Bottom').click();await retry().waitFor();assert.ok(await retry().isVisible());await page.screenshot({path:output+'/mobile-retry.png'});checks.push('390px: unconfirmed preference and Retry remain visible');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/results.json',JSON.stringify({evidence:baseline?'Baseline shell from commit 5503931e with current CSS and simulated APIs.':'Production shell, navigation and session/preference clients with unrelated widgets adapted and simulated APIs. Not a real hosted-account or cross-device acceptance test.',browser:await browser.version(),checks,errors,requests},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }catch(e){await page.screenshot({path:output+'/failure.png'});console.log(JSON.stringify({checks,errors}));throw e;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
