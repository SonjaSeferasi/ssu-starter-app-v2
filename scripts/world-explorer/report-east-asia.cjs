const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
(async()=>{
 const {createServer}=await import('vite');const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',logLevel:'error'});
 try{
  const {levelDefinitionFor}=await server.ssrLoadModule('/lib/world-explorer/level-manifest.ts');
  const {authoredLevels}=await server.ssrLoadModule('/lib/world-explorer/authored-levels.ts');
  const {validateLevelDesign}=await server.ssrLoadModule('/lib/world-explorer/level-validator.ts');
  const {analyzeDifficulty}=await server.ssrLoadModule('/lib/world-explorer/difficulty.ts');
  const {playAsiaRoute}=await server.ssrLoadModule('/lib/world-explorer/asia-playtest.ts');
  const {starPath,playRoute}=await server.ssrLoadModule('/lib/world-explorer/level-analysis.ts');
  const {similarityMatrix}=await server.ssrLoadModule('/lib/world-explorer/level-similarity.ts');
  const records=[];
  for(const code of ['CHN','MNG','PRK','KOR']){
   const level=levelDefinitionFor(code),staticReport=validateLevelDesign(level,{physics:false}),runs=[];
   if(!staticReport.ok)throw Error(code+': '+staticReport.checks.filter(c=>!c.ok).map(c=>c.detail).join(';'));
   for(const wait of [0,.7,1.9,3.1]){
    const pair=[];
    for(const [route,path]of [['main',level.mainRoute],['bonus',starPath(level)]]){
     const run=playAsiaRoute(level,path,{wait,collect:true});
     if(run.simulation.state.status!=='completed'||run.simulation.state.hearts!==3)throw Error(`${code}/${route}/${wait}: failed full play`);
     pair.push(run);runs.push({route,startDelay:wait,seconds:Math.round(run.simulation.state.elapsedSeconds*100)/100,coins:run.simulation.state.coins,stars:run.simulation.state.stars,hearts:3});
    }
    if(pair[1].simulation.state.stars!==3||new Set(pair.flatMap(r=>[...r.simulation.collectedCoins])).size!==level.coins.length)throw Error(code+': collectible coverage failed');
   }
   let edgeChecks=0;
   for(const edge of level.routeGraph.edges)for(const wait of [0,.9,2.1,3.6]){
    const from=level.platforms.find(p=>p.id===edge.from),previous=from.collapse?level.routeGraph.edges.find(e=>e.to===from.id&&e.mandatory)?.from:undefined,spawn=level.platforms.find(p=>p.id===(previous||from.id)),fixture=structuredClone(level);
    fixture.spawn={platformId:spawn.id,offset:Math.max(.5,spawn.width-2.2)};
    const run=playAsiaRoute(fixture,previous?[previous,edge.from,edge.to]:[edge.from,edge.to],{wait,stopAt:edge.to,maxFrames:1800});
    if(!run.visited.has(edge.to)||run.simulation.state.hearts!==3)throw Error(`${code}: ${edge.from}→${edge.to} at${wait}`);edgeChecks++;
   }
   const iso=level.countryId.toLowerCase(),source=fs.readFileSync(path.resolve(`public/world-explorer/levels/${iso}-level-01.json`),'utf8').replace(/\r\n/g,'\n');
   records.push({code,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),automatedPassed:true,staticChecks:staticReport.checks,edgeChecks,difficulty:analyzeDifficulty(level),runs,visuallyCompleted:false,humanApproved:false,devicePerformanceApproved:false,released:false});
  }
  const japan=levelDefinitionFor('JPN'),japanRuns=[];
  for(const [route,path]of [['main',japan.mainRoute],['bonus',starPath(japan)]]){
   const run=playRoute(japan,path,{collectCoins:true,collectStars:route==='bonus'}),s=run.simulation.state;
   if(s.status!=='completed'||s.hearts!==3)throw Error('Japan '+route+' audit failed');
   japanRuns.push({route,seconds:s.elapsedSeconds,coins:s.coins,stars:s.stars,hearts:s.hearts});
  }
  // Keep this milestone reproducible while other regional batches are edited.
  const baseline=['JPN','ITA','EGY','BRA','CAN','AUS','IND','ZAF','NOR','FRA','USA','CHN','MNG','PRK','KOR'];
  const all=baseline.map(levelDefinitionFor),pairs=similarityMatrix(all).filter(p=>records.some(r=>levelDefinitionFor(r.code).id===p.a||levelDefinitionFor(r.code).id===p.b));
  const eastAsiaSimilarity=similarityMatrix(['CHN','JPN','MNG','PRK','KOR'].map(levelDefinitionFor));
  const target=path.resolve('public/world-explorer/data/east-asia-evidence.json');fs.writeFileSync(target,JSON.stringify({scope:'Four new East Asia prototypes plus Japan regression audit; no country is release-approved.',records,japanAudit:{automatedPassed:true,runs:japanRuns,humanPlaytest:'not-run',released:false},eastAsiaSimilarity,similarity:pairs},null,2)+'\n');
  console.log(JSON.stringify({countries:records.length,runs:records.reduce((n,r)=>n+r.runs.length,0),edgeChecks:records.reduce((n,r)=>n+r.edgeChecks,0),similarityFlags:pairs.filter(p=>p.review).length,target}));
 }finally{await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
