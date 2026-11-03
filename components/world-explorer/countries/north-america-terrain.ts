import * as T from 'three';
import {type LandmassPalette} from '../kit/landmass';
import {Builder,vertexMaterial} from '../kit/common';
import {dressNorthAmericanGround} from './north-america-ground';
import {createNorthAmericanCreature} from './north-america-creatures';
import {addNewYorkBuildings} from './north-america-city';
import {alpinePine} from './north-america-forest';
import type {CountryEnvironment} from './types';

/** Preserve the original landmark scenes, replacing only the deep route's
 * island shells with continuous walls that match their collision surface. */
export function northAmericaTerrain(base:CountryEnvironment,alpine:boolean):CountryEnvironment{
 const palette:LandmassPalette=alpine?{top:'#839278',topAlt:'#b1baa1',edge:'#9da6a6',face:'#929c9e',faceDark:'#525e64',band:'#657275',maps:{set:'alpine-rock',tint:'#e5eceb',repeat:.6}}:{top:'#bcb7aa',topAlt:'#d0cbbd',edge:'#c4bcad',face:'#b8aea0',faceDark:'#6d716d',band:'#8b8478',maps:{set:'ashlar',tint:'#e8e1d4',repeat:.8}};
 return{...base,info:{...base.info,assets:[...base.info.assets,alpine?'whorled-alpine-pines':'new-york-waterfront-buildings','country-patrol-creature']},
 createEnemy:parent=>createNorthAmericanCreature(parent,alpine?'CAN':'USA'),
 mount(context){
  const mounted=base.mount(context);if(!alpine)addNewYorkBuildings(mounted,context);
  return{...mounted,setView(view){mounted.setView?.(view);if(!alpine){const foreground=mounted.root.getObjectByName('usa-low-foreground');if(foreground)foreground.visible=false;}}};
 },dressPlatform(root,definition,context){
  if(definition.motion||definition.type==='bridge'||definition.type==='wooden-bridge'){base.dressPlatform(root,definition,context);return;}
  dressNorthAmericanGround(root,definition,alpine?'CAN':'USA',palette,context.low);
  if(alpine&&definition.width>=8){alpinePine(root,-definition.width*.32,-2.7,.7,definition.id.length*41,context.low);if(definition.width>=12)alpinePine(root,definition.width*.34,-2.8,.55,definition.id.length*51,context.low);}
  if(!alpine&&definition.width>=8){
   const facade=new Builder();
   for(let row=0;row<3;row++)for(let i=0;i<Math.floor(definition.width/1.9);i++){
    const x=-definition.width/2+1.2+i*1.9,y=-1.5-row*1.7,z=definition.depth/2+.035;
    facade.add(new T.BoxGeometry(.65,.8,.06),row%2?'#7a9eaa':'#b4c2bc',[x,y,z]);facade.add(new T.BoxGeometry(.85,.1,.16),'#d8cfb8',[x,y-.46,z+.03]);
   }
   facade.mesh(root,vertexMaterial(.72),'waterfront-foundation-window-bays');
  }
 }};
}
