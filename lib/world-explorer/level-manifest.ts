import {countries,countryByCode} from './catalog';
import {countryProfile} from './profiles';
import {authoredLevels} from './authored-levels';
import type {Difficulty,LevelDefinition,PlatformDefinition} from './game-types';

const hash=(text:string)=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
const random=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const text=(value:unknown,max:number)=>typeof value==='string'&&value.length>0&&value.length<=max;
function identity(code:string){const key=code.toUpperCase();if(key==='ANTARCTICA')return{code:key,iso2:'ANTARCTICA'};return countryByCode(key)||countries.find(country=>country.iso2===key);}

export type LevelAvailability={levelId:string;countryId:string;title:string;stage:'prototype'|'preview';visualReviewed:false;releaseReady:false};
/** Availability records describe development state, never an inferred release
 * approval from a test count or the presence of a country flag. An authored
 * level is playable from start to finish; it stays a prototype until its
 * visual, device and performance review is signed off by people. */
export function levelAvailability(code:string):LevelAvailability|undefined{
 const country=identity(code);if(!country)return undefined;
 const authored=authoredLevels[country.code];
 if(authored)return{levelId:authored.id,countryId:authored.countryId,title:authored.title,stage:'prototype',visualReviewed:false,releaseReady:false};
 return{levelId:country.code==='ANTARCTICA'?'antarctica-expedition':`${country.iso2.toLowerCase()}-level-01`,countryId:country.iso2,title:countryProfile(country.code)?.levelTitle||'Country scenery preview',stage:'preview',visualReviewed:false,releaseReady:false};
}
/** An authored level's designed base difficulty; Expert challenge still overrides it. */
export function authoredDifficulty(code:string):Difficulty|undefined{const country=identity(code),level=country?authoredLevels[country.code]:undefined;if(!level)return undefined;return({easy:1,'easy-medium':1,medium:2,hard:3} as Record<string,Difficulty>)[String(level.difficulty)]??1;}
export function isAuthoredLevel(code:string){const country=identity(code);return!!country&&!!authoredLevels[country.code];}

const platformTypes=['stone','wooden-bridge','wooden-moving','bridge','moving'];
const sectionIds=['A','B','C','D','E','F','G','H','I','J','K','L'];
export const terrainKinds=['ground','cliff','slope','stairs','arch','cave','rooftop','canopy','ice-shelf','sand','water-raft','mechanical','rock','bridge','salt-flat','terrace','climb-wall','dune','lava','tepui'];
export const routeNodeTypes=['START','SAFE_PLATFORM','JUMP_PLATFORM','MOVING_PLATFORM','CHECKPOINT','PUZZLE','ENEMY_AREA','DISCOVERY','OPTIONAL_REWARD','FINISH'];
export const routeActions=['WALK','JUMP','DROP','RIDE_PLATFORM','ACTIVATE_SWITCH','CLIMB','PASS_GATE'];

/** A bounded, runtime-validated manifest is the only input to the simulation.
 * References use stable IDs; changing scenery cannot move a checkpoint. */
export function validateLevel(value:unknown):LevelDefinition{
 if(!object(value)||typeof value.id!=='string'||typeof value.countryId!=='string'||typeof value.legacyCode!=='string'||!identity(value.legacyCode)||typeof value.title!=='string'||typeof value.environmentId!=='string')throw new Error('Invalid level identity.');
 if(!Array.isArray(value.platforms)||value.platforms.length<2||value.platforms.length>100)throw new Error('Invalid level platforms.');
 const ids=new Set<string>(),platforms=new Map<string,Record<string,unknown>>();
 const id=(item:Record<string,unknown>)=>{if(typeof item.id!=='string'||!item.id||ids.has(item.id))throw new Error('Level IDs must be unique.');ids.add(item.id);};
 for(const p of value.platforms){
  if(!object(p))throw new Error('Invalid platform.');id(p);
  if(!finite(p.x,-100,2000)||!finite(p.y,-20,30)||!finite(p.width,1.6,30)||!finite(p.depth,2,15)||!finite(p.thickness,.15,30)||!platformTypes.includes(String(p.type))||![null,'horizontal','vertical','pendulum'].includes(p.motion as null|string)||!finite(p.amplitude,0,3.5)||!finite(p.phase,-100,100)||!finite(p.period,1,60)||(p.route!==undefined&&!['main','upper','bonus'].includes(String(p.route))))throw new Error('Invalid platform dimensions or motion.');
  if(p.motion===null&&p.amplitude!==0)throw new Error('Static platforms cannot have motion amplitude.');
  if(p.style!==undefined&&!(typeof p.style==='string'&&/^[a-z][a-z-]{0,31}$/.test(p.style)))throw new Error('Invalid platform style.');
  if(p.surface!==undefined&&p.surface!=='ice')throw new Error('Invalid platform surface.');
  if(p.pause!==undefined&&(p.motion===null||!finite(p.pause,0,10)||Number(p.pause)*2>Number(p.period)-1))throw new Error('Invalid moving platform pause.');
  if(p.bob!==undefined&&(p.motion!=='horizontal'||!finite(p.bob,0,1)))throw new Error('Invalid moving platform bob.');
  if(p.sagDepth!==undefined&&(p.type!=='wooden-bridge'||!finite(p.sagDepth,0,.5)))throw new Error('Invalid bridge sag.');
  if(p.motion==='pendulum'&&(!finite(p.length,1.5,12)||Number(p.amplitude)>=Number(p.length)*.95||p.pause!==undefined))throw new Error('Invalid pendulum.');
  if(p.length!==undefined&&p.motion!=='pendulum')throw new Error('Only a pendulum has a rope length.');
  if(p.terrain!==undefined&&!terrainKinds.includes(String(p.terrain)))throw new Error('Invalid platform terrain.');
  if(p.slope!==undefined&&(p.motion!==null||!finite(p.slope,-6,6)||Math.abs(Number(p.slope))>Number(p.width)*.7||p.type==='wooden-bridge'))throw new Error('Invalid slope.');
  if(p.steps!==undefined&&(!p.slope||!Number.isInteger(p.steps)||!finite(p.steps,2,30)||Math.abs(Number(p.slope))/(Number(p.steps)-1)>.45||Number(p.width)/Number(p.steps)<.55))throw new Error('Invalid stairs.');
  if(p.collapse!==undefined){const c=p.collapse;if(!object(c)||p.motion!==null||!finite(c.delay,.2,5)||!finite(c.respawn,1,20))throw new Error('Invalid collapsing platform.');}
  if(p.bounce!==undefined&&(!finite(p.bounce,6,20)||p.motion!==null))throw new Error('Invalid bounce pad.');
  if(p.climbable!==undefined&&(typeof p.climbable!=='boolean'||p.motion!==null||Number(p.thickness)<1))throw new Error('Invalid climbable face.');
  if(p.current!==undefined&&(!finite(p.current,-4,4)||p.current===0||p.motion!==null))throw new Error('Invalid water current.');
  if(p.raise!==undefined){const r=p.raise;if(!object(r)||!text(r.switchId,64)||!finite(r.drop,.5,8)||!finite(r.seconds,1,30)||p.motion!==null||p.collapse!==undefined)throw new Error('Invalid switch-raised platform.');}
  platforms.set(p.id as string,p);
 }
 // Coins may overhang their platform to trace a jump arc across a gap.
 const reference=(item:unknown,collectible=false,maximumHeight=3.2,overhang=0)=>{
  if(!object(item)||typeof item.platformId!=='string'||!platforms.has(item.platformId))throw new Error('Level item references a missing platform.');
  const p=platforms.get(item.platformId)!;if(!finite(item.offset,.2-overhang,Number(p.width)-.2+overhang))throw new Error('Level item is outside its platform.');
  if(collectible&&!finite(item.height,.4,maximumHeight))throw new Error('Invalid collectible height.');
  return item;
 };
 reference(value.spawn);reference(value.finish);
 for(const key of ['coins','stars','checkpoints'] as const){
  if(!Array.isArray(value[key])||value[key].length>(key==='coins'?200:key==='stars'?3:5))throw new Error('Invalid level collection.');
  for(const item of value[key]){const checked=reference(item,key!=='checkpoints',key==='coins'?5:3.2,key==='coins'?2.5:0);id(checked);const host=platforms.get(checked.platformId as string)!;if(key==='checkpoints'&&(host.motion!==null||host.collapse!==undefined||host.raise!==undefined))throw new Error('A checkpoint needs a stable platform.');}
 }
 if((value.stars as unknown[]).length!==3)throw new Error('A level must declare three optional stars.');
 const discovery=reference(value.discovery);id(discovery);if(typeof discovery.factId!=='string'||!discovery.factId)throw new Error('Invalid discovery reference.');
 if(!Array.isArray(value.hazards)||value.hazards.length>30)throw new Error('Invalid hazards.');
 for(const hazard of value.hazards){
  if(!object(hazard))throw new Error('Invalid hazard.');id(hazard);if(!finite(hazard.x,-100,2000)||!finite(hazard.y,-20,30)||!finite(hazard.width,.1,20)||!finite(hazard.height,.1,20))throw new Error('Invalid hazard bounds.');
  if(hazard.style!==undefined&&!(typeof hazard.style==='string'&&/^[a-z][a-z-]{0,31}$/.test(hazard.style)))throw new Error('Invalid hazard style.');
  // A timed hazard must leave a calm spell: warning and eruption fit inside the period.
  if(hazard.cycle!==undefined){const c=hazard.cycle;if(!object(c)||!finite(c.period,2,30)||!finite(c.warning,.3,5)||!finite(c.active,.2,10)||Number(c.warning)+Number(c.active)>=Number(c.period)-.5||!finite(c.phase,-100,100))throw new Error('Invalid hazard cycle.');}
 }
 if(value.enemies!==undefined){
  if(!Array.isArray(value.enemies)||value.enemies.length>20)throw new Error('Invalid enemy definitions.');
  for(const enemy of value.enemies){if(!object(enemy))throw new Error('Invalid enemy.');id(enemy);const platform=typeof enemy.platformId==='string'?platforms.get(enemy.platformId):undefined;if(!platform||platform.motion!==null||!finite(enemy.minOffset,.3,Number(platform.width)-.3)||!finite(enemy.maxOffset,.3,Number(platform.width)-.3)||Number(enemy.maxOffset)-Number(enemy.minOffset)<.5||!finite(enemy.speed,.2,3)||(enemy.turnPause!==undefined&&!finite(enemy.turnPause,0,3))||(enemy.height!==undefined&&!finite(enemy.height,.5,2)))throw new Error('Invalid enemy patrol bounds.');}
 }
 if(value.discoveryBlocks!==undefined){
  if(!Array.isArray(value.discoveryBlocks)||value.discoveryBlocks.length>12)throw new Error('Invalid discovery blocks.');
  for(const block of value.discoveryBlocks){if(!object(block))throw new Error('Invalid discovery block.');id(block);if(!finite(block.x,-100,2000)||!finite(block.y,-20,30)||!finite(block.width,.4,3)||!finite(block.height,.4,3)||typeof block.factId!=='string'||!block.factId||block.factId.length>96)throw new Error('Invalid discovery block bounds.');}
 }
 if(value.zones!==undefined){
  if(!Array.isArray(value.zones)||value.zones.length>8)throw new Error('Invalid zones.');
  for(const zone of value.zones){if(!object(zone))throw new Error('Invalid zone.');id(zone);if(zone.type!=='wind'||!finite(zone.x,-100,2000)||!finite(zone.width,.5,40)||!finite(zone.bottom,-20,30)||!finite(zone.top,-20,40)||Number(zone.top)<=Number(zone.bottom)||!finite(zone.force,-6,6)||zone.force===0||!finite(zone.period,3,30)||!finite(zone.warning,.5,5)||!finite(zone.duration,.5,10)||Number(zone.warning)+Number(zone.duration)>=Number(zone.period)||!finite(zone.phase,-100,100))throw new Error('Invalid wind zone.');}
 }
 if(value.gates!==undefined){
  if(!Array.isArray(value.gates)||value.gates.length>8)throw new Error('Invalid gates.');
  for(const gate of value.gates){if(!object(gate))throw new Error('Invalid gate.');id(gate);if(!finite(gate.x,-100,2000)||!finite(gate.y,-20,30)||!finite(gate.width,.3,4)||!finite(gate.height,2.2,8)||!finite(gate.openSeconds,1,30))throw new Error('Invalid gate bounds.');}
 }
 if(value.switches!==undefined){
  const gates=new Set(((value.gates as Record<string,unknown>[]|undefined)||[]).map(gate=>gate.id));
  if(!Array.isArray(value.switches)||value.switches.length>8)throw new Error('Invalid switches.');
  for(const plate of value.switches){const checked=reference(plate);id(checked);const host=platforms.get(checked.platformId as string)!,raises=[...platforms.values()].some(p=>object(p.raise)&&p.raise.switchId===checked.id);if(host.motion!==null||host.collapse!==undefined||host.raise!==undefined||!Array.isArray(checked.gateIds)||(!checked.gateIds.length&&!raises)||checked.gateIds.some(gate=>!gates.has(gate)))throw new Error('Invalid pressure switch.');}
 }
 // Every switch-raised platform names a switch that exists.
 const switchIds=new Set(((value.switches as Record<string,unknown>[]|undefined)||[]).map(plate=>plate.id));
 for(const p of platforms.values())if(object(p.raise)&&!switchIds.has(p.raise.switchId))throw new Error('A raised platform names a missing switch.');
 if(value.routeGraph!==undefined){
  const g=value.routeGraph;if(!object(g)||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||g.nodes.length<2||g.nodes.length>120||g.edges.length>300)throw new Error('Invalid route graph.');
  const nodes=new Set<string>();
  for(const node of g.nodes){if(!object(node)||!text(node.id,64)||nodes.has(node.id as string)||!routeNodeTypes.includes(String(node.type))||typeof node.platformId!=='string'||!platforms.has(node.platformId))throw new Error('Invalid route node.');nodes.add(node.id as string);}
  for(const edge of g.edges){if(!object(edge)||!nodes.has(String(edge.from))||!nodes.has(String(edge.to))||edge.from===edge.to||!routeActions.includes(String(edge.action))||typeof edge.mandatory!=='boolean')throw new Error('Invalid route edge.');}
 }
 if(value.design!==undefined){
  const d=value.design;if(!object(d)||!text(d.archetype,48)||!text(d.signatureMechanic,64)||!Array.isArray(d.mechanics)||d.mechanics.length>16||!d.mechanics.every(item=>text(item,48))||!Array.isArray(d.terrain)||!d.terrain.every(item=>terrainKinds.includes(String(item)))||!['low','medium','high'].includes(String(d.verticality))||!['none','light','moderate','heavy'].includes(String(d.enemyProfile))||!finite(d.targetDurationSeconds,20,900)||!finite(d.seed,0,2**32))throw new Error('Invalid level design.');
 }
 if(value.difficultyTier!==undefined&&![1,2,3,4,5].includes(value.difficultyTier as number))throw new Error('Invalid difficulty tier.');
 if(value.sections!==undefined){
  if(!Array.isArray(value.sections)||value.sections.length<3||value.sections.length>sectionIds.length)throw new Error('A level declares three to twelve sections from A.');
  value.sections.forEach((section,index)=>{if(!object(section)||section.id!==sectionIds[index]||!text(section.label,60)||!finite(section.x,-100,2000)||(index>0&&Number(section.x)<=Number((value.sections as Record<string,unknown>[])[index-1].x)))throw new Error('Invalid level section.');});
 }
 if(value.environment!==undefined){
  const e=value.environment;if(!object(e)||!['biome','locationReference','terrainMaterial','vegetationPack','architecturePack','lightingPreset','skyPreset'].every(key=>text(e[key],120))||(e.weatherPreset!==undefined&&!text(e.weatherPreset,120))||!Array.isArray(e.landmarkAssets)||e.landmarkAssets.length>20||!e.landmarkAssets.every(asset=>text(asset,80)))throw new Error('Invalid level environment.');
 }
 if(value.camera!==undefined){const c=value.camera;if(!object(c)||!finite(c.height,2,10)||!finite(c.look,0,6)||!finite(c.follow,0,1)||!finite(c.maxRise,0,5)||(c.distance!==undefined&&!finite(c.distance,12,40)))throw new Error('Invalid level camera.');}
 if(value.difficulty!==undefined&&!['easy','easy-medium','medium','hard'].includes(String(value.difficulty)))throw new Error('Invalid level difficulty.');
 for(const key of ['mainRoute','upperRoute']){const route=value[key];if(route===undefined)continue;if(!Array.isArray(route)||route.length<2||route.length>100||new Set(route).size!==route.length||route.some(platformId=>typeof platformId!=='string'||!platforms.has(platformId)))throw new Error('Invalid platform route.');}
 const p=value.physics;if(!object(p)||!finite(p.gravity,8,40)||!finite(p.jumpSpeed,4,15)||!finite(p.runSpeed,2,10)||!finite(p.acceleration,10,60)||!finite(p.airControl,.3,1)||!finite(p.coyoteTime,.05,.2)||!finite(p.jumpBuffer,.05,.2)||!finite(p.playerRadius,.1,.4)||!finite(p.playerHeight,1,2.4)||!finite(p.killY,-30,-3)||(p.iceGrip!==undefined&&!finite(p.iceGrip,.05,1))||(p.stepHeight!==undefined&&!finite(p.stepHeight,0,.6))||(p.climbSpeed!==undefined&&!finite(p.climbSpeed,1,8)))throw new Error('Invalid physics configuration.');
 const actualCountry=identity(value.legacyCode)!;if(actualCountry.iso2!==value.countryId)throw new Error('Level country IDs do not match.');
 return structuredClone(value) as LevelDefinition;
}

function rescale(level:LevelDefinition,change:(platform:PlatformDefinition)=>number|undefined){
 const original=new Map(level.platforms.map(platform=>[platform.id,platform.width]));
 for(const platform of level.platforms){const factor=change(platform);if(factor!==undefined)platform.width*=factor;}
 for(const item of [...level.coins,...level.stars,...level.checkpoints,level.discovery]){const current=level.platforms.find(platform=>platform.id===item.platformId)!;item.offset*=current.width/original.get(item.platformId)!;}
 return original;
}

function japanLevel(source:unknown,difficulty:Difficulty){
 const level=structuredClone(source) as LevelDefinition;
 if(difficulty>1){
  // Preserve the reference composition and both opening routes. Difficulty
  // changes later landing widths, gentle motion and patrol speed, not the art.
  const amount=difficulty-1;
  rescale(level,platform=>platform.x>=45&&platform.id!==level.finish.platformId?1-amount*.025:undefined);
  for(const platform of level.platforms)if(platform.motion){platform.amplitude*=1+amount*.16;platform.period/=1+amount*.08;}
  for(const enemy of level.enemies||[])enemy.speed*=1+amount*.14;
 }
 return validateLevel(level);
}

/** Shared difficulty rule for the country levels: only later, stable main-route
 * landings narrow, and motion and patrols quicken. Routes and art stay intact. */
function countryLevel(source:unknown,difficulty:Difficulty){
 const level=structuredClone(source) as LevelDefinition;
 // A route-graph level is validated as built; its tier is its difficulty.
 // A harder challenge only quickens its patrols, never reshapes a jump.
 if(level.routeGraph){for(const enemy of level.enemies||[])enemy.speed=Math.min(3,enemy.speed*(1+(difficulty-1)*.1));return validateLevel(level);}
 if(difficulty>1){
  const amount=difficulty-1,from=level.sections?.find(section=>section.id==='F')?.x??Infinity,locked=new Set([level.finish.platformId,level.spawn.platformId,...level.checkpoints.map(point=>point.platformId),...(level.enemies||[]).map(enemy=>enemy.platformId)]);
  rescale(level,platform=>platform.route==='main'&&!platform.motion&&platform.x>=from&&!locked.has(platform.id)?1-amount*.025:undefined);
  for(const platform of level.platforms)if(platform.motion){platform.period/=1+amount*.06;if(platform.pause)platform.pause=Math.min(platform.pause,(platform.period-1.2)/2);}
  for(const enemy of level.enemies||[])enemy.speed*=1+amount*.12;
 }
 return validateLevel(level);
}

/** Authored countries run their reviewed configuration; remaining countries use
 * seeded development previews of the same validated level pipeline. */
export function levelDefinitionFor(code:string,difficulty:Difficulty=1):LevelDefinition{
 const country=identity(code);if(!country)throw new Error('Unknown country level.');
 const authored=authoredLevels[country.code];
 if(authored)return country.code==='JPN'?japanLevel(authored,difficulty):countryLevel(authored,difficulty);
 const r=random(hash(country.code)+difficulty*7919),platforms:PlatformDefinition[]=[];let x=0,y=0;
 const count=10+difficulty*2;
 for(let i=0;i<count;i++){
  const width=i===0?5.6:Math.max(2.8,5.4-difficulty*.5+r()*1.6);if(i>0)y=Math.max(-.35,Math.min(1.7,y+(r()-.43)*.65));
  const motion=i>=Math.ceil(count*.4)&&i<count-1&&difficulty>1&&i%(6-difficulty)===0?(i%2?'horizontal':'vertical'):null;
  platforms.push({id:`preview-p${i}`,x,y,width,depth:3.4,thickness:3,type:motion?'wooden-moving':'stone',motion,amplitude:motion?(motion==='horizontal'?.35:.22):0,phase:r()*Math.PI*2,period:motion==='horizontal'?6.98:7.85});x+=width+.7+difficulty*.23+r()*.32;
 }
 const availability=levelAvailability(country.code)!,coins=[];
 for(let i=1;i<platforms.length;i++)for(let j=0;j<3;j++)coins.push({id:`coin-${i}-${j}`,platformId:platforms[i].id,offset:platforms[i].width*(.27+j*.22),height:1.25+(j%2)*.15});
 const stable=platforms.filter((p,i)=>i>count*.4&&i<count-2&&!p.motion),checkpoint=stable[0]||platforms[0],discovery=stable.at(-1)||checkpoint;
 return validateLevel({id:availability.levelId,countryId:availability.countryId,legacyCode:country.code,title:availability.title,environmentId:countryProfile(country.code)?.biome||'alpine',spawn:{platformId:platforms[0].id,offset:1.2},platforms,coins,stars:[.25,.5,.75].map((fraction,i)=>{const p=platforms[Math.floor(count*fraction)];return{id:`star-${i}`,platformId:p.id,offset:p.width*.5,height:i===1?1.1:2.1};}),checkpoints:[{id:'checkpoint-01',platformId:checkpoint.id,offset:checkpoint.width*.35}],discovery:{id:'discovery-01',platformId:discovery.id,offset:discovery.width*.65,factId:country.code==='ANTARCTICA'?'antarctic-science':country.iso2.toLowerCase()+'-discovery'},finish:{platformId:platforms.at(-1)!.id,offset:platforms.at(-1)!.width*.7},hazards:[],physics:{gravity:20,jumpSpeed:8.6,runSpeed:5.4,acceleration:25,airControl:.65,coyoteTime:.12,jumpBuffer:.12,playerRadius:.2,playerHeight:1.6,killY:-7}});
}
