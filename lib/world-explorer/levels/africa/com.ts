import {africaLevel,platform,ledge} from './common';

/** Comoros — Karthala: The Crater Rim Walk. Tier 1 (Explorer).
 * A gentle volcano walk: up the ylang-ylang terraces above the coast,
 * through cloud forest, over low lava steps to the rim of the great
 * caldera, where a mongoose lemur scampers, then down steps and along the
 * rim to an overlook. A ledge between the terraces holds a star. */
export const level=africaLevel('COM',{
 design:{archetype:'gentle-caldera-rim-walk',signatureMechanic:'ylang-terraces-to-the-caldera-rim',mechanics:['ylang-terrace-steps','cloud-forest-path','lava-steps','rim-lemur-patrol','rim-stairs'],terrain:['ground','terrace','rock','cliff','stairs'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:46,seed:2026456},
 environment:{biome:'volcanic-island-highland',locationReference:'Mount Karthala, Grande Comore, Comoros',terrainMaterial:'basalt-and-red-soil',vegetationPack:'ylang-ylang-and-cloud-forest',architecturePack:'coastal-village',landmarkAssets:['karthala-caldera','ylang-ylang-terraces','crater-rim-path','grande-comore-coast','cloud-forest'],lightingPreset:'clear-volcano-morning',skyPreset:'ocean-cumulus'},
 sections:[{id:'A',label:'Coastal village',x:0},{id:'B',label:'Ylang terraces',x:10},{id:'C',label:'Cloud forest',x:28},{id:'D',label:'Lava steps',x:38},{id:'E',label:'Caldera rim',x:49},{id:'F',label:'Rim stairs',x:59},{id:'G',label:'Caldera overlook',x:75}],
 platforms:[
  platform('km-village',-6,0,14,{style:'coastal-village'}),
  platform('km-terrace-1',10.2,.5,4,{terrain:'terrace',style:'ylang-terrace'}),
  platform('km-terrace-2',16.4,1,4,{terrain:'terrace',style:'ylang-terrace'}),
  platform('km-terrace-3',22.6,1.5,4,{terrain:'terrace',style:'ylang-terrace'}),
  platform('km-forest',28.8,1.8,8,{style:'cloud-forest'}),
  platform('km-lava-1',39,2.2,3,{terrain:'rock',thickness:1.2,style:'lava-step'}),
  platform('km-lava-2',44.2,2.6,3,{terrain:'rock',thickness:1.2,style:'lava-step'}),
  platform('km-rim',49.4,2.8,10,{terrain:'cliff',style:'crater-rim'}),
  platform('km-rim-steps',59.4,2.8,5,{terrain:'stairs',slope:-1,steps:4,style:'rim-steps'}),
  platform('km-rim-2',64.4,1.8,4,{terrain:'cliff',style:'crater-rim'}),
  platform('km-rock',70.6,2.2,3,{terrain:'rock',thickness:1.2,style:'lava-step'}),
  platform('km-overlook',75.8,2.4,13,{terrain:'cliff',style:'caldera-overlook'}),
  ledge('km-terrace-ledge',20.7,.3,1.6,{style:'terrace-ledge'}),
 ],
 spawn:['km-village',4],finish:['km-overlook',11],discovery:['km-overlook',8],checkpoints:[['km-forest',1.2],['km-rim',1]],
 enemies:[{id:'km-mongoose-lemur',platformId:'km-rim',minOffset:3.4,maxOffset:6.6,speed:.9,turnPause:.8,height:.6}],
 discoveryBlocks:[{id:'km-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'km-discovery'}],
 stars:[['km-terrace-ledge',.8,2],['km-forest',4,2.3],['km-rock',1.5,2.1]],
 edges:[
  ['km-village','km-terrace-1','JUMP'],['km-terrace-1','km-terrace-2','JUMP'],['km-terrace-2','km-terrace-3','JUMP'],['km-terrace-3','km-forest','JUMP'],['km-forest','km-lava-1','JUMP'],['km-lava-1','km-lava-2','JUMP'],['km-lava-2','km-rim','JUMP'],
  ['km-rim','km-rim-steps','WALK'],['km-rim-steps','km-rim-2','WALK'],['km-rim-2','km-rock','JUMP'],['km-rock','km-overlook','JUMP'],
  ['km-terrace-2','km-terrace-ledge','DROP',false],['km-terrace-ledge','km-terrace-3','JUMP',false],
 ],
});
