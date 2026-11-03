import {authorLevel,platform} from '../author';

const sunk=(switchId:string,drop:number,seconds:number)=>({raise:{switchId,drop,seconds}});

/** Bolivia — Salar de Uyuni: The Salt Mirror. Tier 2 (Adventurer).
 * A flat, open level built on puzzles instead of height: pressure switches on
 * the salt crust raise salt-brick blocks out of brine channels for a limited
 * window. The first channel is one switch; the second is a sequence (the
 * first switch raises steps to a salt-hotel roof, whose switch raises the
 * bridge). Then the train cemetery's rusted cars and a climb up Isla
 * Incahuasi among giant cacti. An optional pair of higher blocks in the
 * first channel holds a star. */
export const level=authorLevel({
 code:'BOL',iso2:'BO',title:'Salar de Uyuni: The Salt Mirror',environmentId:'bolivia-uyuni-salt-flat',tier:2,
 design:{archetype:'salt-flat-switch-puzzle',signatureMechanic:'switch-raised-salt-blocks',mechanics:['switch-raised-platforms','switch-sequence','brine-pools','salt-piles','train-car-roofs','crust-patrol','island-terraces'],terrain:['salt-flat','rooftop','stairs','ground','rock'],verticality:'low',enemyProfile:'light',targetDurationSeconds:70,seed:2026202},
 environment:{biome:'high-altitude-salt-flat',locationReference:'Salar de Uyuni, Potosí Department, Bolivia: the salt crust, the train cemetery near Uyuni and Isla Incahuasi',terrainMaterial:'hexagonal-salt-crust-and-coral-limestone',vegetationPack:'giant-cardon-cacti-and-ichu-grass',architecturePack:'salt-brick-buildings-and-rusted-locomotives',landmarkAssets:['salt-mirror-horizon','isla-incahuasi-with-giant-cacti','train-cemetery-locomotives','andean-volcano-skyline'],lightingPreset:'high-altitude-clear-sun',skyPreset:'deep-blue-altiplano-sky',weatherPreset:'thin-brine-film'},
 sections:[{id:'A',label:'Salt crust',x:0},{id:'B',label:'Salt piles',x:16},{id:'C',label:'First brine channel',x:23},{id:'D',label:'Salt hotel sequence',x:49},{id:'E',label:'Second channel bridge',x:77},{id:'F',label:'Train cemetery',x:89},{id:'G',label:'Island foot',x:112},{id:'H',label:'Incahuasi summit',x:132}],
 platforms:[
  platform('bo-flat-1',-6,0,22,{terrain:'salt-flat'}),
  platform('bo-pile-1',16,.6,1.8,{terrain:'salt-flat',style:'salt-pile'}),
  platform('bo-pile-2',19.6,1,1.8,{terrain:'salt-flat',style:'salt-pile'}),
  platform('bo-flat-2',23.2,0,10,{terrain:'salt-flat'}),
  platform('bo-block-1',35.8,.3,2,{terrain:'salt-flat',style:'salt-block',thickness:2.4,...sunk('bo-plate-1',1.8,8)}),
  platform('bo-block-2',40.4,.6,2,{terrain:'salt-flat',style:'salt-block',thickness:2.4,...sunk('bo-plate-1',2.1,8)}),
  platform('bo-block-3',45,.3,2,{terrain:'salt-flat',style:'salt-block',thickness:2.4,...sunk('bo-plate-1',1.8,8)}),
  platform('bo-flat-3',49.4,0,12,{terrain:'salt-flat'}),
  platform('bo-step-1',63.6,.7,2,{terrain:'salt-flat',style:'salt-block',thickness:2.8,...sunk('bo-plate-2',2.4,9)}),
  platform('bo-step-2',67.8,1.4,2,{terrain:'salt-flat',style:'salt-block',thickness:3.4,...sunk('bo-plate-2',3.1,9)}),
  platform('bo-ledge',72.2,2,5,{terrain:'rooftop',thickness:13,style:'salt-hotel'}),
  platform('bo-bridge-1',79.8,1.4,2,{terrain:'salt-flat',style:'salt-block',thickness:3.4,...sunk('bo-plate-3',3.1,8)}),
  platform('bo-bridge-2',84.4,.8,2,{terrain:'salt-flat',style:'salt-block',thickness:2.8,...sunk('bo-plate-3',2.5,8)}),
  platform('bo-yard',88.8,0,8,{terrain:'salt-flat',style:'rail-yard'}),
  platform('bo-boxcar-1',96.8,.75,5,{terrain:'rooftop',thickness:13,depth:3.2,style:'rusted-boxcar'}),
  platform('bo-boxcar-2',104.4,1.2,5,{terrain:'rooftop',thickness:13,depth:3.2,style:'rusted-locomotive'}),
  platform('bo-yard-2',111.6,0,6,{terrain:'salt-flat'}),
  platform('bo-island-steps',117.6,0,6,{terrain:'stairs',slope:1.6,steps:5,style:'coral-rock'}),
  platform('bo-island-ledge',126,2.3,4,{terrain:'rock',thickness:13,style:'coral-rock'}),
  platform('bo-summit',132.4,2.9,13,{terrain:'rock',thickness:13,style:'island-summit'}),
  platform('bo-high-1',38.2,1.6,1.8,{terrain:'salt-flat',style:'salt-block',thickness:3,route:'upper',...sunk('bo-plate-1',3.4,8)}),
  platform('bo-high-2',42.6,2,2,{terrain:'salt-flat',style:'salt-block',thickness:3.4,route:'upper',...sunk('bo-plate-1',3.8,8)}),
 ],
 spawn:['bo-flat-1',4],finish:['bo-summit',9],discovery:['bo-summit',4.5],checkpoints:[['bo-flat-3',2],['bo-yard',1.2]],
 hazards:[
  {id:'bo-brine-piles',x:17.8,y:-1.6,width:5.4,height:.9,style:'brine'},
  {id:'bo-brine-channel',x:33.2,y:-1.6,width:16.2,height:.9,style:'brine'},
  {id:'bo-brine-lake',x:61.4,y:-1.6,width:14,height:.9,style:'brine'},
  {id:'bo-brine-lake-east',x:75.4,y:-1.6,width:13.4,height:.9,style:'brine'},
 ],
 switches:[
  {id:'bo-plate-1',platformId:'bo-flat-2',offset:7.5,gateIds:[]},
  {id:'bo-plate-2',platformId:'bo-flat-3',offset:9.5,gateIds:[]},
  {id:'bo-plate-3',platformId:'bo-ledge',offset:3,gateIds:[]},
 ],
 enemies:[{id:'bo-crust-roller',platformId:'bo-yard',minOffset:3.6,maxOffset:6.9,speed:1,turnPause:.5,height:.85}],
 discoveryBlocks:[{id:'bo-discovery-block',x:55.6,y:2.6,width:.75,height:.8,factId:'bo-discovery'}],
 coins:[
  ['bo-flat-1',7],['bo-flat-1',9],['bo-flat-1',11],['bo-flat-1',13],
  ['bo-pile-1',1.5],['bo-pile-2',.9],
  ['bo-flat-2',2],['bo-flat-2',4],
  ['bo-block-1',1],['bo-block-2',1],['bo-block-2',1.6],['bo-high-1',.9],
  ['bo-flat-3',4],['bo-flat-3',8.5],['bo-flat-3',11],
  ['bo-step-1',1],['bo-step-2',1],['bo-ledge',1.5],['bo-ledge',4],
  ['bo-bridge-1',1],['bo-bridge-2',1],
  ['bo-yard',2.4],['bo-boxcar-1',1.5],['bo-boxcar-1',3.5],['bo-boxcar-2',1.5],['bo-boxcar-2',3.5],
  ['bo-yard-2',2],['bo-yard-2',4],['bo-island-steps',2.5],['bo-island-steps',4],['bo-island-ledge',2],
  ['bo-summit',2],['bo-summit',3.2],
 ],
 stars:[['bo-pile-2',.9,2.3],['bo-high-2',1,1.2],['bo-boxcar-2',4,2.1]],
 edges:[
  ['bo-flat-1','bo-pile-1','JUMP'],['bo-pile-1','bo-pile-2','JUMP'],['bo-pile-2','bo-flat-2','JUMP'],
  ['bo-flat-2','bo-block-1','JUMP'],['bo-block-1','bo-block-2','JUMP'],['bo-block-2','bo-block-3','JUMP'],['bo-block-3','bo-flat-3','JUMP'],
  ['bo-flat-3','bo-step-1','JUMP'],['bo-step-1','bo-step-2','JUMP'],['bo-step-2','bo-ledge','JUMP'],['bo-ledge','bo-bridge-1','JUMP'],['bo-bridge-1','bo-bridge-2','JUMP'],['bo-bridge-2','bo-yard','JUMP'],
  ['bo-yard','bo-boxcar-1','JUMP'],['bo-boxcar-1','bo-boxcar-2','JUMP'],['bo-boxcar-2','bo-yard-2','DROP'],['bo-yard-2','bo-island-steps','CLIMB'],['bo-island-steps','bo-island-ledge','JUMP'],['bo-island-ledge','bo-summit','JUMP'],
  ['bo-block-1','bo-high-1','JUMP',false],['bo-high-1','bo-high-2','JUMP',false],['bo-high-2','bo-block-3','DROP',false],
 ],
});
