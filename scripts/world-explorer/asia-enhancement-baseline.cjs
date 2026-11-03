const fs=require('fs'),path=require('path');
(async()=>{const {createServer}=await import('vite'),server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',logLevel:'error'});try{
 const {asiaProductionManifest}=await server.ssrLoadModule('/lib/world-explorer/asia-production.ts'),{levelDefinitionFor}=await server.ssrLoadModule('/lib/world-explorer/level-manifest.ts');
 const out='documentation/world-explorer/review/asia/enhancement',rows=asiaProductionManifest();fs.mkdirSync(out,{recursive:true});
 if(fs.existsSync(out+'/baseline-levels.json'))throw Error('Baseline exists; do not overwrite');
 fs.writeFileSync(out+'/baseline-levels.json',JSON.stringify(Object.fromEntries(rows.map(r=>[r.code,[1,2,3,4].map(d=>levelDefinitionFor(r.code,d))])),null,2)+'\n');
 fs.writeFileSync(out+'/issue-tracker.json',JSON.stringify(rows.map(r=>({code:r.code,country:r.name,region:r.region,setting:r.setting,specificationTier:r.targetDifficultyTier,baselineTier:r.implementedDifficultyTier,visualPass:'PENDING',mechanicPass:['OMN','SAU'].includes(r.code)?'REQUIREMENTS_GAP':'PRESERVE',beforeReview:'PENDING',afterReview:'PENDING',humanPlaytest:'PENDING',accountSave:'PENDING',physicalPhone:'PENDING',confirmedPerformance:'PENDING',released:false})),null,2)+'\n');console.log('Frozen',rows.length,'country definitions at all four runtime settings');
 }finally{await server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
