import japan from '../../public/world-explorer/levels/jp-level-01.json';
import {countries,countryByCode} from './catalog';
import {countryProfile} from './profiles';
import type {Difficulty,LevelDefinition,PlatformDefinition} from './game-types';

const hash=(text:string)=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
const random=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
function identity(code:string){const key=code.toUpperCase();if(key==='ANTARCTICA')return{code:key,iso2:'ANTARCTICA'};return countryByCode(key)||countries.find(country=>country.iso2===key);}

export type LevelAvailability={levelId:string;countryId:string;title:string;stage:'prototype'|'preview';visualReviewed:false;releaseReady:false};
/** Availability records describe development state, never an inferred release
 * approval from a test count or the presence of a country flag. */
export function levelAvailability(code:string):LevelAvailability|undefined{
 const country=identity(code);if(!country)return undefined;
 return{levelId:country.code==='ANTARCTICA'?'antarctica-expedition':`${country.iso2.toLowerCase()}-level-01`,countryId:country.iso2,title:country.code==='JPN'?'Cherry Blossom Mountain Path':countryProfile(country.code)?.levelTitle||'Country scenery preview',stage:country.code==='JPN'?'prototype':'preview',visualReviewed:false,releaseReady:false};
}

/** A bounded, runtime-validated manifest is the only input to the simulation.
 * References use stable IDs; changing scenery cannot move a checkpoint. */
export function validateLevel(value:unknown):LevelDefinition{
 if(!object(value)||typeof value.id!=='string'||typeof value.countryId!=='string'||typeof value.legacyCode!=='string'||!identity(value.legacyCode)||typeof value.title!=='string'||typeof value.environmentId!=='string')throw new Error('Invalid level identity.');
 if(!Array.isArray(value.platforms)||value.platforms.length<2||value.platforms.length>100)throw new Error('Invalid level platforms.');
 const ids=new Set<string>(),platforms=new Map<string,Record<string,unknown>>();
 const id=(item:Record<string,unknown>)=>{if(typeof item.id!=='string'||!item.id||ids.has(item.id))throw new Error('Level IDs must be unique.');ids.add(item.id);};
 for(const p of value.platforms){
  if(!object(p))throw new Error('Invalid platform.');id(p);
  if(!finite(p.x,-100,2000)||!finite(p.y,-20,30)||!finite(p.width,2.8,30)||!finite(p.depth,2,15)||!finite(p.thickness,.15,30)||!['stone','wooden-bridge','wooden-moving'].includes(String(p.type))||![null,'horizontal','vertical'].includes(p.motion as null|string)||!finite(p.amplitude,0,1.5)||!finite(p.phase,-100,100)||!finite(p.period,1,60))throw new Error('Invalid platform dimensions or motion.');
  if(p.motion===null&&p.amplitude!==0)throw new Error('Static platforms cannot have motion amplitude.');platforms.set(p.id as string,p);
 }
 const reference=(item:unknown,collectible=false)=>{
  if(!object(item)||typeof item.platformId!=='string'||!platforms.has(item.platformId))throw new Error('Level item references a missing platform.');
  const p=platforms.get(item.platformId)!;if(!finite(item.offset,.2,Number(p.width)-.2))throw new Error('Level item is outside its platform.');
  if(collectible&&!finite(item.height,.4,3.2))throw new Error('Invalid collectible height.');
  return item;
 };
 reference(value.spawn);reference(value.finish);
 for(const key of ['coins','stars','checkpoints'] as const){
  if(!Array.isArray(value[key])||value[key].length>(key==='coins'?200:key==='stars'?3:5))throw new Error('Invalid level collection.');
  for(const item of value[key]){const checked=reference(item,key!=='checkpoints');id(checked);if(key==='checkpoints'&&platforms.get(checked.platformId as string)!.motion!==null)throw new Error('A checkpoint needs a stable platform.');}
 }
 if((value.stars as unknown[]).length!==3)throw new Error('A level must declare three optional stars.');
 const discovery=reference(value.discovery);id(discovery);if(typeof discovery.factId!=='string'||!discovery.factId)throw new Error('Invalid discovery reference.');
 if(!Array.isArray(value.hazards)||value.hazards.length>30)throw new Error('Invalid hazards.');
 for(const hazard of value.hazards){if(!object(hazard))throw new Error('Invalid hazard.');id(hazard);if(!finite(hazard.x,-100,2000)||!finite(hazard.y,-20,30)||!finite(hazard.width,.1,20)||!finite(hazard.height,.1,20))throw new Error('Invalid hazard bounds.');}
 const p=value.physics;if(!object(p)||!finite(p.gravity,8,40)||!finite(p.jumpSpeed,4,15)||!finite(p.runSpeed,2,10)||!finite(p.acceleration,10,60)||!finite(p.airControl,.3,1)||!finite(p.coyoteTime,.05,.2)||!finite(p.jumpBuffer,.05,.2)||!finite(p.playerRadius,.1,.4)||!finite(p.playerHeight,1,2.4)||!finite(p.killY,-30,-3))throw new Error('Invalid physics configuration.');
 const actualCountry=identity(value.legacyCode)!;if(actualCountry.iso2!==value.countryId)throw new Error('Level country IDs do not match.');
 return structuredClone(value) as LevelDefinition;
}

function japanLevel(difficulty:Difficulty){
 const level=structuredClone(japan) as LevelDefinition;
 if(difficulty>1){
  const amount=difficulty-1,original=level.platforms.map(p=>({...p})),factor=1-amount*.035;let cursor=0;
  level.platforms=original.map((p,i)=>{
   const previous=original[i-1],gap=i?p.x-(previous.x+previous.width)+amount*.06:0;
   cursor+=gap;const copy={...p,x:cursor,width:i===0||i===original.length-1?p.width:p.width*factor};
   if(copy.motion){copy.amplitude*=1+amount*.12;copy.period/=1+amount*.06;}cursor+=copy.width;return copy;
  });
  const last=level.platforms.pop()!,before=level.platforms.at(-1)!;cursor=before.x+before.width;
  for(let i=0;i<amount;i++){cursor+=1.7+i*.1;const extra:PlatformDefinition={id:`jp-challenge-${i+1}`,x:cursor,y:.4+i*.13,width:5.4-i*.2,depth:3.4,thickness:2.8,type:'wooden-moving',motion:i%2?'vertical':'horizontal',amplitude:.3,phase:0,period:7-i*.35};level.platforms.push(extra);cursor+=extra.width;}
  last.x=cursor+1.7;level.platforms.push(last);
  // Item offsets are proportions of the authored platform, never stale world positions.
  for(const item of [...level.coins,...level.stars,...level.checkpoints,level.discovery]){const base=original.find(p=>p.id===item.platformId)!,current=level.platforms.find(p=>p.id===item.platformId)!;item.offset*=current.width/base.width;}
 }
 return validateLevel(level);
}

/** Seeded country routes are development previews; Japan is the authored
 * playable prototype used to validate the shared level pipeline first. */
export function levelDefinitionFor(code:string,difficulty:Difficulty=1):LevelDefinition{
 const country=identity(code);if(!country)throw new Error('Unknown country level.');
 if(country.code==='JPN')return japanLevel(difficulty);
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
