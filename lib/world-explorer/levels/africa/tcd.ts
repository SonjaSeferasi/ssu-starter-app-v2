import {africaLevel,platform,ledge} from './common';

const sunk={switchId:'td-guelta-plate',drop:2.4,seconds:9};
/** Chad — Ennedi: The Aloba Arch. Tier 4 (Expert Explorer).
 * From a camel camp over the dunes to the Guelta d’Archei: a plate on the
 * bank raises two stepping stones out of the pool for a few seconds, a
 * desert crocodile basks on the far bank, the leg of a great arch is
 * climbed by hand, its span is crossed in the gusts, and sandstone pillars
 * lead to the plateau. A rock shelter on the way down to the guelta holds
 * a star. */
export const level=africaLevel('TCD',{
 design:{archetype:'guelta-and-great-arch-traverse',signatureMechanic:'plate-raised-guelta-stones-then-arch-span',mechanics:['plate-raised-stepping-stones','crocodile-patrol','arch-leg-climb','windy-arch-span','sandstone-pillar-hops'],terrain:['sand','dune','cliff','ground','rock','climb-wall','arch'],verticality:'high',enemyProfile:'light',targetDurationSeconds:48,seed:2026433},
 environment:{biome:'saharan-sandstone-massif',locationReference:'The Ennedi Massif and the Guelta d’Archei, north-eastern Chad',terrainMaterial:'red-sandstone',vegetationPack:'acacia-and-doum-palm',architecturePack:'none',landmarkAssets:['aloba-arch','ennedi-massif','guelta-darchei','camel-herd','sandstone-pillars'],lightingPreset:'late-desert-sun',skyPreset:'clear-desert'},
 sections:[{id:'A',label:'Camel camp',x:0},{id:'B',label:'Dune and ledge',x:8},{id:'C',label:'Guelta bank',x:24},{id:'D',label:'Raised stones',x:34},{id:'E',label:'Crocodile bank',x:47},{id:'F',label:'Arch leg',x:56},{id:'G',label:'Arch span',x:63},{id:'H',label:'Pillars and plateau',x:86}],
 platforms:[
  platform('td-camp',-6,0,14,{terrain:'sand',style:'camel-camp'}),
  platform('td-dune',8,0,6,{terrain:'dune',slope:1,style:'dune'}),
  platform('td-ledge',17.6,1.4,3,{terrain:'cliff',style:'sandstone-ledge'}),
  platform('td-bank',24.4,1.4,6,{style:'guelta-bank'}),
  platform('td-stone-1',34.2,1.4,2.4,{terrain:'rock',thickness:.8,style:'guelta-stone',raise:sunk}),
  platform('td-stone-2',40.4,1.6,2.4,{terrain:'rock',thickness:.8,style:'guelta-stone',raise:sunk}),
  platform('td-far-bank',46.6,1.8,9,{style:'guelta-bank'}),
  platform('td-arch-leg',55.8,5,4,{terrain:'climb-wall',climbable:true,style:'arch-leg'}),
  platform('td-span-1',63.6,5.2,3,{terrain:'arch',thickness:1.4,style:'arch-span'}),
  platform('td-span-2',70.4,5.4,3,{terrain:'arch',thickness:1.4,style:'arch-span'}),
  platform('td-arch-far',77.2,5.4,6,{terrain:'cliff',style:'arch-shoulder'}),
  platform('td-pillar-1',87,5.6,2.4,{terrain:'cliff',style:'sandstone-pillar'}),
  platform('td-pillar-2',93.2,6,2.4,{terrain:'cliff',style:'sandstone-pillar'}),
  platform('td-plateau',99.4,6,13,{style:'ennedi-plateau'}),
  ledge('td-shelter',21,.2,1.8,{style:'rock-shelter'}),
 ],
 spawn:['td-camp',4],finish:['td-plateau',11],discovery:['td-plateau',8],checkpoints:[['td-far-bank',1.2],['td-arch-far',1.2]],
 switches:[{id:'td-guelta-plate',platformId:'td-bank',offset:4.2,gateIds:[]}],
 enemies:[{id:'td-desert-crocodile',platformId:'td-far-bank',minOffset:3.4,maxOffset:6.4,speed:.8,turnPause:1,height:.6}],
 zones:[{id:'td-arch-gust',type:'wind',x:61,width:24,bottom:3,top:14,force:-2,period:7.5,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'td-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'td-discovery'}],
 stars:[['td-shelter',.9,2],['td-stone-2',1.2,2.2],['td-pillar-2',1.2,2.2]],
 edges:[
  ['td-camp','td-dune','WALK'],['td-dune','td-ledge','JUMP'],['td-ledge','td-bank','JUMP'],['td-bank','td-stone-1','ACTIVATE_SWITCH'],['td-stone-1','td-stone-2','JUMP'],['td-stone-2','td-far-bank','JUMP'],
  ['td-far-bank','td-arch-leg','CLIMB'],['td-arch-leg','td-span-1','JUMP'],['td-span-1','td-span-2','JUMP'],['td-span-2','td-arch-far','JUMP'],['td-arch-far','td-pillar-1','JUMP'],['td-pillar-1','td-pillar-2','JUMP'],['td-pillar-2','td-plateau','JUMP'],
  ['td-ledge','td-shelter','DROP',false],['td-shelter','td-bank','JUMP',false],
 ],
});
