// Writes scripts/world-explorer/europe-shots.json for capture-levels.mjs: for
// each European adventure, the mechanic shot (scan view at the first platform
// that uses the signature mechanic) and a landmark camera aimed where the
// environment places the landmark (x = 62% of the finish, behind the route).
//   npx vitest run --config scripts/world-explorer/europe-shots.vitest.config.mjs
import {it} from 'vitest';
import {writeFileSync} from 'node:fs';
import {europeCodes,europePlaces} from '../../lib/world-explorer/europe';
import {oceaniaCodes,oceaniaPlaces} from '../../lib/world-explorer/oceania';
import {levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {LevelSimulation} from '../../lib/world-explorer/simulation';

const signaturePlatform:Record<string,(p:import('../../lib/world-explorer/game-types').PlatformDefinition)=>boolean>={
 'vertical-lift':p=>p.motion==='vertical','moving-platform':p=>p.motion==='horizontal','bounce-pad':p=>!!p.bounce,'collapsing-ledge':p=>!!p.collapse,
 'ice-surface':p=>p.surface==='ice','stairs-and-slopes':p=>!!p.slope,'pressure-plate':p=>!!p.raise,'water-hazard':p=>p.id.includes('-stone-'),
};
// REPORT_REGION=oceania writes scripts/world-explorer/oceania-shots.json the same way.
const region=process.env.REPORT_REGION||'europe';
const {codes,places}:{codes:string[];places:Record<string,{signature:string;landmark:string}>}=region==='oceania'?{codes:oceaniaCodes,places:oceaniaPlaces}:{codes:europeCodes,places:europePlaces};
it(`writes the ${region} capture shots`,()=>{
 const shots:Record<string,unknown>={};
 for(const code of codes){
  const level=levelDefinitionFor(code),place=places[code],finish=new LevelSimulation(level).position(level.finish).x;
  const match=signaturePlatform[place.signature],gatePlatform=level.switches?.[0]?.platformId,windX=level.zones?.[0]?.x,patrol=level.enemies?.[0]?.platformId;
  const host=level.platforms.find(p=>match?.(p))??level.platforms.find(p=>p.id===gatePlatform||p.id===patrol);
  const x=windX!==undefined?windX+3:host?host.x+host.width/2:finish*.4;
  const lx=finish*.62;
  shots[code]={b:{x:+x.toFixed(1),label:place.signature},c:{position:[+(lx-14).toFixed(1),9,22],target:[+lx.toFixed(1),6,-22],fov:52,label:place.landmark}};
 }
 writeFileSync(`scripts/world-explorer/${region}-shots.json`,JSON.stringify(shots,null,1));
});
