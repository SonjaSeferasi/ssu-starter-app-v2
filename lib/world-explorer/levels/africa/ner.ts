import {africaLevel,platform,ledge} from './common';

const giraffe=(id:string,x:number,y:number,amplitude:number,period:number)=>platform(id,x,y,2.4,{type:'moving',motion:'horizontal',amplitude,period,pause:1,bob:.25,terrain:'mechanical',thickness:.5,style:'giraffe'});
/** Niger — Kouré: The Giraffe Plateau. Tier 3 (Challenger).
 * Out of the village onto the laterite plateaus of the tiger bush: a
 * cracked laterite slab gives way, then three West African giraffes amble
 * back and forth across the gaps and carry the player between a termite
 * mound, a baobab crown and an acacia, with a dung beetle trundling across
 * the second plateau. A waterhole below the baobab holds a star. */
export const level=africaLevel('NER',{
 design:{archetype:'savanna-plateau-giraffe-ride',signatureMechanic:'ambling-giraffe-rides',mechanics:['giraffe-rides','crumbling-laterite','termite-mound-hop','crown-hops','dung-beetle-patrol'],terrain:['ground','rock','mechanical'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:58,seed:2026422},
 environment:{biome:'sahel-tiger-bush',locationReference:'The giraffe zone around Kouré, south-east of Niamey, Niger',terrainMaterial:'red-laterite-and-sand',vegetationPack:'tiger-bush-combretum-and-acacia',architecturePack:'sahel-village',landmarkAssets:['west-african-giraffes','tiger-bush-plateau','laterite-terraces','termite-mounds','sahel-village'],lightingPreset:'golden-sahel-evening',skyPreset:'dusty-sunset'},
 sections:[{id:'A',label:'Village',x:0},{id:'B',label:'Laterite steps',x:11},{id:'C',label:'Tiger-bush plateau',x:24},{id:'D',label:'First giraffe',x:34},{id:'E',label:'Termite mound',x:43},{id:'F',label:'Baobab crown',x:57},{id:'G',label:'Second plateau',x:64},{id:'H',label:'Kouré lookout',x:85}],
 platforms:[
  platform('ne-village',-6,0,14,{style:'sahel-village'}),
  platform('ne-laterite-1',11,.6,4,{terrain:'rock',thickness:1,style:'laterite-slab'}),
  platform('ne-laterite-2',17.8,1,4,{terrain:'rock',thickness:.8,style:'cracked-laterite',collapse:{delay:.9,respawn:3}}),
  platform('ne-plateau-1',24.6,1.4,8,{style:'tiger-bush'}),
  giraffe('ne-giraffe-1',36,1.6,2,7),
  platform('ne-termite',43.6,2,2.4,{terrain:'rock',thickness:1.4,style:'termite-mound'}),
  giraffe('ne-giraffe-2',49.6,2.2,2,7.4),
  platform('ne-baobab',57.2,2.6,4,{terrain:'canopy',thickness:1,style:'baobab-crown'}),
  platform('ne-plateau-2',64.2,2.6,9,{style:'tiger-bush'}),
  giraffe('ne-giraffe-3',77.2,2.8,2.2,7.6),
  platform('ne-acacia',85,3,3,{terrain:'canopy',thickness:.6,style:'acacia-crown'}),
  platform('ne-lookout',91.2,3.2,13,{style:'koure-lookout'}),
  ledge('ne-waterhole',61.6,1.4,1.6,{style:'waterhole'}),
 ],
 spawn:['ne-village',4],finish:['ne-lookout',11],discovery:['ne-lookout',8],checkpoints:[['ne-plateau-1',1.2],['ne-plateau-2',1.2]],
 enemies:[{id:'ne-dung-beetle',platformId:'ne-plateau-2',minOffset:3,maxOffset:6.4,speed:.9,turnPause:.6,height:.55}],
 discoveryBlocks:[{id:'ne-discovery-block',x:28,y:4.45,width:.75,height:.8,factId:'ne-discovery'}],
 stars:[['ne-waterhole',.8,2],['ne-termite',1.2,2.3],['ne-acacia',1.5,2.2]],
 edges:[
  ['ne-village','ne-laterite-1','JUMP'],['ne-laterite-1','ne-laterite-2','JUMP'],['ne-laterite-2','ne-plateau-1','JUMP'],['ne-plateau-1','ne-giraffe-1','RIDE_PLATFORM'],['ne-giraffe-1','ne-termite','JUMP'],['ne-termite','ne-giraffe-2','RIDE_PLATFORM'],
  ['ne-giraffe-2','ne-baobab','JUMP'],['ne-baobab','ne-plateau-2','JUMP'],['ne-plateau-2','ne-giraffe-3','RIDE_PLATFORM'],['ne-giraffe-3','ne-acacia','JUMP'],['ne-acacia','ne-lookout','JUMP'],
  ['ne-baobab','ne-waterhole','DROP',false],['ne-waterhole','ne-plateau-2','JUMP',false],
 ],
});
