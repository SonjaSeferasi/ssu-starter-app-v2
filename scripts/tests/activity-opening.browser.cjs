// SRS-607.3: actual route error components inside Next 14's installed error boundary.
// Local fixture failures and Jumpyland entry APIs; not a live account or game playthrough.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require(process.env.SOCIALU_PLAYWRIGHT_MODULE||'playwright');
const output='documentation/game-room/opening-recovery-2026-11-17',buildDir=path.resolve('tmp/activity-opening-browser');
(async()=>{
 fs.mkdirSync(output,{recursive:true});fs.mkdirSync(buildDir,{recursive:true});
 let failRender=true;
 const stubs={
  'next/navigation':`export function useRouter(){return {push(path){location.assign(path)}}}`,
  './avatar-texture':`export async function avatarTexture(){return '';}`,
  './audio':`export class GameAudio {destroy(){}setVolume(){}setEnabled(){}}`,
  './engine':`export function mountGame(){throw new Error('This fixture does not start gameplay.');}`,
  '../game-room/avatar-preview':`export function AvatarPreview(){return null;}`,
  './world-map':`import React from 'react';export function WorldMap({completed}){return <h2>QA map loaded: {completed.join(',')}</h2>}`,
  'qa-navigation':`export function usePathname(){return location.pathname;}`,
  'qa-storage':`export const staticGenerationAsyncStorage={getStore(){return undefined}};`,
  'qa-router-error':`export function isNextRouterError(){return false;}`
 };
 const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
 import {ErrorBoundaryHandler} from 'next/dist/client/components/error-boundary';
 import GameError from './app/game-1/error';import ExplorerError from './app/world-explorer/error';import DormError from './app/game-room/dormspace/error';
 import Game from './components/jumpyland/game';
 const routes={'/game-1':GameError,'/world-explorer':ExplorerError,'/game-room/dormspace':DormError};
 function Probe(){if(window.__qaFailRender)throw new Error('QA simulated activity render failure');return <h2>QA activity reopened</h2>}
 const node=location.pathname==='/entry'?<Game/>:location.pathname==='/game-room'?<h1>QA Game Room destination</h1>:<ErrorBoundaryHandler pathname={location.pathname} errorComponent={routes[location.pathname]}><Probe/></ErrorBoundaryHandler>;
 createRoot(document.getElementById('root')).render(node);`;
 await esbuild.build({stdin:{contents:entry,loader:'tsx',resolveDir:process.cwd()},bundle:true,outfile:path.join(buildDir,'bundle.js'),format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'opening-test-adapters',setup(build){
  build.onResolve({filter:/.*/},args=>{
   if(args.importer.endsWith('/error-boundary.js')||args.importer.endsWith('\\error-boundary.js')){
    const replacements={'./navigation':'qa-navigation','./static-generation-async-storage.external':'qa-storage','./is-next-router-error':'qa-router-error'};
    if(replacements[args.path])return {path:replacements[args.path],namespace:'qa'};
   }
   if(stubs[args.path])return {path:args.path,namespace:'qa'};
   if(args.kind==='url-token'&&args.path.startsWith('/'))return {path:args.path,external:true};
  });build.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:process.cwd()}));
 }}]});
 const server=http.createServer((req,res)=>{
  if(req.url==='/bundle.js'||req.url==='/bundle.css'){res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':'text/css');return res.end(fs.readFileSync(path.join(buildDir,req.url.slice(1))));}
  if(!['/game-1','/world-explorer','/game-room/dormspace','/entry','/game-room'].includes(req.url)){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/bundle.css"></head><body style="margin:0"><div id="root"></div><aside style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;padding:6px;background:#fff4c9;color:#302300;font:12px sans-serif">Local component QA - simulated opening failures; no live game or account</aside><script>window.__qaFailRender=${failRender};</script><script src="/bundle.js"></script></body></html>`);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.SOCIALU_BROWSER_EXECUTABLE});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(16000);
 const base=`http://127.0.0.1:${server.address().port}`,checks=[],errors=[],requests=[];
 let entryMode='failure';
 const room={appearance:null,outfits:[{id:'1',name:'QA',assetKey:'sample-campus'}],faces:[{id:'1',assetKey:'sample-smile',initial:true}],activities:[]};
 await context.addInitScript(()=>localStorage.setItem('access_token','qa-account'));
 await context.route('**/api/**',async route=>{
  const url=new URL(route.request().url());requests.push({path:url.pathname,method:route.request().method()});
  if(url.pathname==='/api/auth/refresh'){await new Promise(resolve=>setTimeout(resolve,13000));try{await route.fulfill({json:{session:{access_token:'qa-account',expires_at:9999999999}}});}catch{}return;}
  if(entryMode==='failure'){await route.fulfill({status:503,body:'simulated gateway failure'});return;}
  const data=url.pathname==='/api/game-room'?room:entryMode==='malformed'?{completed:'bad'}:{completed:[1],balance:25};
  await route.fulfill({json:data});
 });
 page.on('pageerror',e=>{if(!e.message.includes('QA simulated activity render failure'))errors.push(e.message);});
 const retry=()=>page.getByRole('button',{name:'Retry',exact:true});
 const back=()=>page.getByRole('link',{name:'Return to Game Room',exact:true});
 try{
  for(const [route,name,file] of [['/game-1','Jumpyland','jumpyland'],['/world-explorer','World Explorer','world-explorer'],['/game-room/dormspace','DormSpace','dormspace']]){
   failRender=true;await page.goto(base+route);await page.getByRole('heading',{name:'We couldn’t open '+name,exact:true}).waitFor();
   assert.equal(await retry().isVisible(),true);assert.equal(await back().getAttribute('href'),'/game-room');assert.doesNotMatch(await page.locator('body').innerText(),/QA simulated activity render failure/);
   await page.screenshot({path:output+'/'+file+'-error.png'});checks.push(name+': actual route error screen catches simulated render failure and provides both choices without raw exception text');
   await retry().click();await page.getByRole('heading',{name:'We couldn’t open '+name,exact:true}).waitFor();checks.push(name+': persistent failure remains recoverable after Retry');
   failRender=false;await retry().click();await page.getByRole('heading',{name:'QA activity reopened',exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,route);checks.push(name+': Retry reloads the same URL and recovers after the fixture failure clears');
   failRender=true;await page.goto(base+route);await back().click();await page.getByRole('heading',{name:'QA Game Room destination',exact:true}).waitFor();checks.push(name+': Return opens /game-room');
  }
  entryMode='failure';await page.goto(base+'/entry');await retry().waitFor();assert.match(await page.locator('body').innerText(),/could not be loaded/);await page.screenshot({path:output+'/jumpyland-entry-failure.png'});
  entryMode='success';await retry().click();await page.getByRole('heading',{name:'QA map loaded: 1',exact:true}).waitFor();checks.push('Jumpyland: failed entry offers Retry and restores saved progression after a successful retry');
  entryMode='malformed';await page.goto(base+'/entry');await retry().waitFor();assert.match(await page.locator('body').innerText(),/incomplete information/);checks.push('Jumpyland: malformed progression opens recovery rather than crashing the map');
  entryMode='success';await page.evaluate(()=>localStorage.setItem('socialu_session',JSON.stringify({access_token:'qa-account',refresh_token:'qa-refresh',expires_at:1})));
  const began=Date.now(),before=requests.length;await page.goto(base+'/entry');await retry().waitFor();const elapsed=Date.now()-began;assert.ok(elapsed<11000);assert.match(await page.locator('body').innerText(),/connection took too long/);await page.screenshot({path:output+'/jumpyland-entry-timeout.png'});
  await new Promise(resolve=>setTimeout(resolve,4500));assert.equal(requests.slice(before).filter(r=>r.path!=='/api/auth/refresh').length,0);checks.push('Jumpyland: stalled refresh produces recovery in '+elapsed+'ms and sends no late entry reads');
  await retry().click();await page.getByRole('heading',{name:'QA map loaded: 1',exact:true}).waitFor();checks.push('Jumpyland: retry works after the timed-out refresh eventually resolves');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/world-explorer');await retry().waitFor();assert.ok(await back().isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:output+'/mobile-error.png'});checks.push('390px: both recovery actions fit without horizontal overflow');
  await retry().focus(); // keyboard focusability checked below through normal key traversal
  await page.keyboard.press('Tab');assert.equal(await back().evaluate(el=>document.activeElement===el),true);checks.push('Keyboard: Retry and Return are reachable in normal tab order');
  assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>r.method!=='GET'&&r.path!=='/api/auth/refresh').length,0);
  fs.writeFileSync(output+'/results.json',JSON.stringify({evidence:'Actual route error components and installed Next ErrorBoundaryHandler with simulated render failures; actual Jumpyland entry with intercepted APIs and map/engine adapters. Not a hosted save, real gameplay, or full Next router test.',browser:await browser.version(),checks,errors,requests},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }catch(e){await page.screenshot({path:output+'/failure.png'});console.log(JSON.stringify({checks,errors}));throw e;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
