/* Regenerate the Phase A tracker and machine-readable review record.
 * Run after capture-asia-phase-a.cjs. This does not approve or release levels. */
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {createServer}=await import('vite');
 const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',logLevel:'error'});
 try{
  const {asiaProductionManifest}=await server.ssrLoadModule('/lib/world-explorer/asia-production.ts');
  const {levelDefinitionFor}=await server.ssrLoadModule('/lib/world-explorer/level-manifest.ts');
  const {similarityMatrix}=await server.ssrLoadModule('/lib/world-explorer/level-similarity.ts');
  const records=asiaProductionManifest(),out=path.resolve('documentation/world-explorer/review/asia/phase-a');fs.mkdirSync(out,{recursive:true});
  const browser=JSON.parse(fs.readFileSync(path.join(out,'browser-evidence.json'),'utf8'));
  const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
  save('asia-tracker.json',{scope:'All 47 requested country designs; only East Asia has active Phase A art integration.',records});
  const fields=['code','iso2','name','region','setting','targetDifficultyTier','implementedDifficultyTier','difficultyCalibrated','mainLayout','signatureMechanic','productionState','designApprovalStatus','gameplayImplementationStatus','artCompletionStatus','automatedStatus','humanPlaytest','mobileDeviceTest','visualReview'];
  const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  fs.writeFileSync(path.join(out,'asia-tracker.csv'),[fields.join(','),...records.map(r=>fields.map(f=>csv(r[f])).join(','))].join('\n')+'\n');
  const east=['CHN','JPN','MNG','PRK','KOR'],baseline=[...east,'BRA','JPN','EGY','NOR'].filter((c,i,a)=>a.indexOf(c)===i);
  const pairs=similarityMatrix(baseline.map(levelDefinitionFor)),eastIds=new Set(east.map(c=>levelDefinitionFor(c).id));
  save('structural-similarity.json',{scope:'Committed baseline: five East Asia routes versus Brazil, Egypt and Norway. Other South America development is a separate snapshot.',threshold:.72,analyzer:'lib/world-explorer/level-similarity.ts; unchanged default threshold',pairs:pairs.filter(p=>eastIds.has(p.a)||eastIds.has(p.b))});
  const screenshots=browser.records.flatMap(r=>[...r.screenshots,...(r.mobile?[r.code.toLowerCase()+'-mobile.png']:[])]);
  if(browser.records.length!==5||screenshots.length!==25||screenshots.some(f=>!fs.existsSync(path.join(out,f))))throw Error('Expected five real capture records and 25 image files');
  if(browser.records.some(r=>r.errors.length||r.mobile?.pageErrors.length||r.httpStatus!==200||r.reviewHttpStatus!==200))throw Error('A browser capture failed');
  save('validation.json',{scope:'Phase A review increment, not a finished 47-country release',baseCommit:'6a0e0ba',tests:{files:96,passed:958,result:'passed',scope:'Isolated branch with fresh npm ci; excludes separate uncommitted avatar and South America work'},productionBuild:'passed',terrainSurfaceTests:{cases:9,result:'passed',maximumSurfaceDifferenceWorldUnits:.04},browser:{countries:5,desktopScreenshots:20,emulatedMobileScreenshots:5,pageExceptions:0,allNormalAndReviewRoutesHttp200:true,emulatedControlsPassed:browser.records.every(r=>r.mobile?.movementResponse&&r.mobile?.controls.every(c=>c.visible&&c.inViewport&&c.width>=44&&c.height>=44)&&!r.mobile.horizontalOverflow)},knownConsoleIssue:'Missing /favicon.ico returns 404; no scene exception was observed',performance:{renderer:'Headless Edge / ANGLE SwiftShader',hardwareDesktopBenchmark:'not-run',physicalMobileBenchmark:'not-run',target60Desktop30MobileApproved:false},humanPlaytest:'not-run',accountSaveWithRealSession:'not-run',visualApproval:false,releasedCountries:0,remainingNewCountryDesigns:42,screenshots});
  console.log(JSON.stringify({tracker:records.length,captures:screenshots.length,similarityPairs:pairs.filter(p=>eastIds.has(p.a)||eastIds.has(p.b)).length,released:0}));
 }finally{await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
