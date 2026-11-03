import {africaLevel,platform,ledge,hazardStrip} from './common';

const sunk={switchId:'gq-moss-plate',drop:2,seconds:11};
/** Equatorial Guinea — Bioko: The Crater Lake. Tier 3 (Challenger).
 * Through tree ferns to the rim of a crater, where a moss-covered plate
 * raises two fallen logs on the lake for a while; down the crater path,
 * over the logs to the far shore, up the mossy crater wall by hand, across
 * fern crowns to the ridge below Pico Basilé, where a drill forages. An
 * orchid ledge between the first ferns holds a star. */
export const level=africaLevel('GNQ',{
 design:{archetype:'crater-lake-log-crossing',signatureMechanic:'moss-plate-raised-logs-on-the-crater-lake',mechanics:['tree-fern-hops','moss-plate-raised-logs','crater-path-descent','mossy-wall-climb','drill-patrol'],terrain:['ground','rock','stairs','climb-wall'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:52,seed:2026437},
 environment:{biome:'montane-cloud-forest',locationReference:'A crater lake in the southern highlands of Bioko Island, Equatorial Guinea',terrainMaterial:'mossy-basalt',vegetationPack:'tree-ferns-and-cloud-forest',architecturePack:'none',landmarkAssets:['crater-lake','mossy-crater-wall','pico-basile','tree-ferns','drill-monkeys'],lightingPreset:'misty-cloud-forest',skyPreset:'low-cloud'},
 sections:[{id:'A',label:'Cloud-forest trail',x:0},{id:'B',label:'Tree ferns',x:11},{id:'C',label:'Crater rim',x:23},{id:'D',label:'Crater path',x:31},{id:'E',label:'Raised logs',x:44},{id:'F',label:'Far shore',x:57},{id:'G',label:'Crater wall',x:62},{id:'H',label:'Basilé ridge',x:82}],
 platforms:[
  platform('gq-trail',-6,0,14,{style:'forest-trail'}),
  platform('gq-fern-1',11,.6,3,{terrain:'rock',thickness:.8,style:'tree-fern'}),
  platform('gq-fern-2',17,1,3,{terrain:'rock',thickness:.8,style:'tree-fern'}),
  platform('gq-rim',23,1,8,{style:'crater-rim'}),
  platform('gq-path',31,1,6,{terrain:'stairs',slope:-2,steps:6,style:'crater-path'}),
  platform('gq-shore',37,-1,5,{style:'lake-shore'}),
  platform('gq-log-1',45,-1,3,{terrain:'rock',thickness:.6,style:'floating-log',raise:sunk}),
  platform('gq-log-2',51,-.8,3,{terrain:'rock',thickness:.6,style:'floating-log',raise:sunk}),
  platform('gq-far-shore',57,-.6,5,{style:'lake-shore'}),
  platform('gq-wall',62.4,2.4,5,{terrain:'climb-wall',climbable:true,style:'mossy-crater-wall'}),
  platform('gq-fern-3',70.4,2.6,3,{terrain:'rock',thickness:.8,style:'tree-fern'}),
  platform('gq-fern-4',76.4,3,3,{terrain:'rock',thickness:.8,style:'tree-fern'}),
  platform('gq-ridge',82.4,3.2,13,{style:'basile-ridge'}),
  ledge('gq-orchid',14.4,-.2,1.6,{style:'orchid-ledge'}),
 ],
 spawn:['gq-trail',4],finish:['gq-ridge',11.5],discovery:['gq-ridge',9],checkpoints:[['gq-shore',1.2],['gq-far-shore',1.2]],
 switches:[{id:'gq-moss-plate',platformId:'gq-rim',offset:5.2,gateIds:[]}],
 hazards:hazardStrip('gq-lake',36,26,-3,'lake'),
 enemies:[{id:'gq-drill',platformId:'gq-ridge',minOffset:2.6,maxOffset:6.2,speed:.9,turnPause:.8,height:.75}],
 discoveryBlocks:[{id:'gq-discovery-block',x:26,y:4.25,width:.75,height:.8,factId:'gq-discovery'}],
 stars:[['gq-orchid',.8,2],['gq-rim',2.5,2.3],['gq-fern-4',1.5,2.2]],
 edges:[
  ['gq-trail','gq-fern-1','JUMP'],['gq-fern-1','gq-fern-2','JUMP'],['gq-fern-2','gq-rim','JUMP'],['gq-rim','gq-path','WALK'],['gq-path','gq-shore','WALK'],['gq-shore','gq-log-1','ACTIVATE_SWITCH'],['gq-log-1','gq-log-2','JUMP'],['gq-log-2','gq-far-shore','JUMP'],
  ['gq-far-shore','gq-wall','CLIMB'],['gq-wall','gq-fern-3','JUMP'],['gq-fern-3','gq-fern-4','JUMP'],['gq-fern-4','gq-ridge','JUMP'],
  ['gq-fern-1','gq-orchid','DROP',false],['gq-orchid','gq-fern-2','JUMP',false],
 ],
});
