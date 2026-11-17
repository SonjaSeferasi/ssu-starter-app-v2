import * as T from 'three';
import {mountJapanEnvironment,addJapanTorii,japanEnvironmentInfo} from '../japan-environment';
import {dressJapanPlatform} from '../japan-terrain';
import {mountJapanRockMaterials} from '../japan-materials';
import {createJapanEnemy,createJapanDiscoveryBlock} from '../japan-interactives';
import {woodenDeck} from '../kit/wooden-deck';
import {japanAtmosphere} from '../japan-atmosphere';
import type {CountryEnvironment} from './types';

/** Japan, the reference implementation, expressed through the shared
 * country-environment contract. Its scenery modules are unchanged. */
export const environment:CountryEnvironment={
 id:japanEnvironmentInfo.id,info:japanEnvironmentInfo,
 lighting:{background:japanAtmosphere.background,...japanAtmosphere.light,pixelRatio:1.25,overviewFog:[japanAtmosphere.fog.overviewNear,japanAtmosphere.fog.overviewFar],fog:[japanAtmosphere.fog.color,japanAtmosphere.fog.near,japanAtmosphere.fog.far]},
 mount(context){
  const mounted=mountJapanEnvironment(context.scene,{platforms:context.level.platforms,finish:context.finish,reducedMotion:context.reducedMotion,quality:context.low?'low':'standard'});
  return{root:mounted.root,update:(time,dt)=>mounted.update(time,dt),frame:mounted.frame,setReducedMotion:mounted.setReducedMotion,dispose:mounted.dispose,
   setView(view){const fog=context.scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?japanAtmosphere.fog.overviewNear:japanAtmosphere.fog.near;fog.far=view==='overview'?japanAtmosphere.fog.overviewFar:japanAtmosphere.fog.far;}const foreground=mounted.root.getObjectByName('japan-low-foreground');if(foreground)foreground.visible=view!=='overview';},
   finalize:(scene,onReady)=>mountJapanRockMaterials(scene,context.low,onReady)};
 },
 dressPlatform(root,definition,context){
  if(definition.type!=='stone')woodenDeck(root,definition);
  dressJapanPlatform(root,definition,{quality:context.low?'low':'standard',lush:definition.id===context.level.spawn.platformId||definition.width>=9});
 },
 createEnemy:parent=>createJapanEnemy(parent) as ReturnType<CountryEnvironment['createEnemy']>,
 createDiscoveryBlock:createJapanDiscoveryBlock,
 decorateCheckpoint(marker){addJapanTorii(marker,0,0,-.7,2.2);},
 decorateFinish(gate){addJapanTorii(gate,0,0,-1.55,3.5);},
};
