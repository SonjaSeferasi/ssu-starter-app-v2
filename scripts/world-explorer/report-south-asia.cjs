/* Reproducible, input-only regional evidence at the actual runtime settings.
 * Fault injection is limited to checkpoint recovery fixtures, never capture tapes. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{const {createServer}=await import('vite');const v=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',logLevel:'error'});
 try{
 const load=p=>v.ssrLoadModule('/lib/world-explorer/'+p+'.ts');
 const {levelDefinitionFor,authoredDifficulty}=await load('level-manifest'),{southAsiaCodes}=await load('south-asia'),{validateLevelDesign}=await load('level-validator'),{analyzeDifficulty}=await load('difficulty'),{playSoutheastAsiaRoute}=await load('southeast-asia-playtest'),{criticalPlatforms,optionalPath}=await load('route-graph'),{similarityMatrix}=await load('level-similarity'),{LevelSimulation,FIXED_STEP,hazardAt}=await load('simulation'),{authoredLevels}=await load('authored-levels');
 const output=path.resolve(process.env.EXPLORER_REVIEW_OUTPUT||'documentation/world-explorer/review/asia/south-asia');fs.mkdirSync(output,{recursive:true});
 const records=[],tapes=[],inputBySimulation=new WeakMap(),advance=LevelSimulation.prototype.advance;
 LevelSimulation.prototype.advance=function(dt){const inputs=inputBySimulation.get(this)||[];inputs.push({...this.input});inputBySimulation.set(this,inputs);return advance.call(this,dt);};
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 for(const code of southAsiaCodes){
  const runtimeDifficulty=authoredDifficulty(code),level=levelDefinitionFor(code,runtimeDifficulty),staticReport=validateLevelDesign(level,{physics:false}),runs=[],coinIds=new Set(),starIds=new Set();
  assert(staticReport.ok,code+': '+staticReport.checks.filter(c=>!c.ok).map(c=>c.detail));
  const main=criticalPlatforms(level.routeGraph),bonus=optionalPath(level.routeGraph);
  for(const difficulty of [1,2,3,4])for(const wait of [0,.7,1.9,3.1])for(const route of ['main','bonus']){
   const actual=levelDefinitionFor(code,difficulty),run=playSoutheastAsiaRoute(actual,route==='main'?main:bonus,{collect:true,wait}),s=run.simulation.state;
   assert(s.status==='completed'&&s.hearts===3&&s.discoveryFound,`${code}/${difficulty}/${route}/${wait}: ${s.status}, hearts=${s.hearts},x=${s.x}`);
   assert(route==='main'||s.stars===3,`${code}/${route}: missing stars`);run.simulation.collectedCoins.forEach(id=>coinIds.add(id));run.simulation.collectedStars.forEach(id=>starIds.add(id));
   runs.push({difficulty,route,wait,status:s.status,hearts:s.hearts,coins:s.coins,stars:s.stars,seconds:s.elapsedSeconds,checkpoint:s.checkpointId,climb:run.events.includes('climb'),discoveryFound:s.discoveryFound});
   if(difficulty===runtimeDifficulty&&wait===0){
    tapes.push({code,route,difficulty,inputs:inputBySimulation.get(run.simulation),expected:{status:s.status,hearts:s.hearts,coins:s.coins,stars:s.stars,discoveryFound:s.discoveryFound},seconds:s.elapsedSeconds});
    for(const checkpoint of run.checkpointSnapshots){const before={coins:checkpoint.state.coins,stars:checkpoint.state.stars},id=checkpoint.state.checkpointId;checkpoint.state.y=actual.physics.killY-1;checkpoint.state.grounded=false;checkpoint.state.standing=null;checkpoint.state.vy=-2;checkpoint.clearInput();for(let f=0;f<120;f++){if(checkpoint.advance(FIXED_STEP).some(e=>e.type==='respawn'))break;}assert(checkpoint.state.hearts===2&&checkpoint.state.checkpointId===id&&checkpoint.state.coins===before.coins&&checkpoint.state.stars===before.stars,code+': checkpoint recovery');}
   }
  }
  assert(coinIds.size===level.coins.length&&starIds.size===3,code+': collectible coverage');
  let edgeChecks=0;
  for(const edge of level.routeGraph.edges)for(const wait of [0,.9,2.1,3.6]){
   const from=level.platforms.find(p=>p.id===edge.from),previous=from.collapse?level.routeGraph.edges.find(e=>e.to===from.id&&e.mandatory)?.from:undefined,spawn=level.platforms.find(p=>p.id===(previous||from.id)),fixture=structuredClone(level);
   fixture.spawn={platformId:spawn.id,offset:Math.max(.5,spawn.width-2.2)};
   const run=playSoutheastAsiaRoute(fixture,previous?[previous,edge.from,edge.to]:[edge.from,edge.to],{wait,stopAt:edge.to,maxFrames:1800});
   assert(run.visited.has(edge.to)&&run.simulation.state.hearts===3,`${code}: ${edge.from}->${edge.to} at ${wait}`);edgeChecks++;
  }
  const warnings=level.hazards.map(h=>({id:h.id,warning:h.cycle?.warning,period:h.cycle?.period}));
  for(const h of level.hazards){assert(h.cycle&&h.cycle.warning>=1,code+': warning window');assert(Array.from({length:Math.ceil(h.cycle.period*60)},(_,i)=>hazardAt(h,i/60).phase).includes('warning'),code+': warning never shown');}
  const file=`lib/world-explorer/levels/south-asia/${code.toLowerCase()}.ts`,sha256=crypto.createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
  records.push({code,file,sha256,runtimeDifficulty,automatedPassed:true,staticChecks:staticReport.checks,difficulty:analyzeDifficulty(level),runs,edgeChecks,warnings,coins:`${coinIds.size}/${level.coins.length}`,stars:`${starIds.size}/3`,humanPlaytest:'NOT_RUN',accountSave:'PENDING',physicalPhone:'PENDING',fps60:'UNVERIFIED',released:false});
  console.log(code,JSON.stringify({runs:runs.length,edgeChecks,tier:analyzeDifficulty(level).measuredTier}));
 }
 const all=Object.keys(authoredLevels).map(c=>levelDefinitionFor(c)),ids=new Set(records.map(r=>levelDefinitionFor(r.code).id)),similarity=similarityMatrix(all).filter(p=>ids.has(p.a)||ids.has(p.b));
 const result={candidateBase:'1c7ed65',eastAsiaCandidate:'revision 2 (unchanged)',method:'Real fixed-step simulation controlled only by left/right/jump. Four runtime challenge settings, four start delays, two routes; recovery fixtures separately inject a missed landing.',records,similarity,similarityFlags:similarity.filter(p=>p.review),released:false};
 fs.writeFileSync(path.join(output,'route-evidence.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(output,'input-tapes.json'),JSON.stringify(tapes)+'\n');
 fs.writeFileSync('public/world-explorer/data/south-asia-evidence.json',JSON.stringify({records:records.map(({runs,staticChecks,...rest})=>({...rest,runs:runs.length,staticChecksPassed:staticChecks.every(c=>c.ok)})),similarityFlags:result.similarityFlags,released:false},null,2)+'\n');
 assert(!result.similarityFlags.length,'Structural similarity needs review: '+JSON.stringify(result.similarityFlags));
 }finally{await v.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

