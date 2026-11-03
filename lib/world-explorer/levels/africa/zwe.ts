import {africaLevel,platform,ledge} from './common';

/** Zimbabwe — Great Zimbabwe: The Stone City. Tier 3 (Challenger).
 * Along replica dry-stone walls outside the ruins: wall tops lead to an
 * enclosure floor whose plate opens the narrow passage, more walls and
 * granite boulders climb to the hill ledge where a monitor lizard basks,
 * and balancing boulders reach the hilltop. A gap between the first walls
 * holds a star. The real walls and Conical Tower are scenery only. */
export const level=africaLevel('ZWE',{
 design:{archetype:'dry-stone-wall-tops-and-passage',signatureMechanic:'enclosure-plate-and-narrow-passage',mechanics:['wall-top-runs','enclosure-plate-passage-door','granite-boulder-climb','monitor-lizard-patrol','balancing-boulders'],terrain:['ground','terrace','rock','cliff'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:36,seed:2026458},
 environment:{biome:'miombo-granite-country',locationReference:'Great Zimbabwe National Monument, near Masvingo, Zimbabwe',terrainMaterial:'grey-granite-blocks',vegetationPack:'msasa-woodland-and-aloes',architecturePack:'dry-stone-walls',landmarkAssets:['great-enclosure','conical-tower','hill-complex','balancing-granite','msasa-woodland'],lightingPreset:'warm-late-afternoon',skyPreset:'highveld-blue'},
 sections:[{id:'A',label:'Msasa woodland',x:0},{id:'B',label:'Wall tops',x:11},{id:'C',label:'Enclosure floor',x:25},{id:'D',label:'Narrow passage',x:35},{id:'E',label:'Outer walls',x:44},{id:'F',label:'Hill ledge',x:57},{id:'G',label:'Balancing boulders',x:68},{id:'H',label:'Hilltop',x:80}],
 platforms:[
  platform('zw-woodland',-6,0,14,{style:'msasa-woodland'}),
  platform('zw-wall-1',11,.6,4,{terrain:'terrace',style:'dry-stone-wall'}),
  platform('zw-wall-2',18,1.2,4,{terrain:'terrace',style:'dry-stone-wall'}),
  platform('zw-enclosure',25,1.2,10,{style:'enclosure-floor'}),
  platform('zw-passage',35,1.2,6,{style:'narrow-passage'}),
  platform('zw-wall-3',44,1.8,4,{terrain:'terrace',style:'dry-stone-wall'}),
  platform('zw-boulder-1',51,2.4,3,{terrain:'rock',thickness:1.4,style:'granite-boulder'}),
  platform('zw-hill-ledge',57,2.8,8,{terrain:'cliff',style:'hill-ledge'}),
  platform('zw-boulder-2',68,3.2,3,{terrain:'rock',thickness:1.4,style:'balancing-boulder'}),
  platform('zw-boulder-3',74,3.6,3,{terrain:'rock',thickness:1.4,style:'balancing-boulder'}),
  platform('zw-hilltop',80,3.8,13,{style:'hilltop'}),
  ledge('zw-wall-gap',15.4,0,1.6,{style:'wall-gap'}),
 ],
 spawn:['zw-woodland',4],finish:['zw-hilltop',11],discovery:['zw-hilltop',8],checkpoints:[['zw-enclosure',1.2],['zw-hill-ledge',1]],
 switches:[{id:'zw-enclosure-plate',platformId:'zw-enclosure',offset:5,gateIds:['zw-passage-door']}],
 gates:[{id:'zw-passage-door',x:34.4,y:1.2,width:.5,height:2.4,openSeconds:5}],
 enemies:[{id:'zw-monitor',platformId:'zw-hill-ledge',minOffset:3,maxOffset:5.6,speed:.8,turnPause:.9,height:.55}],
 discoveryBlocks:[{id:'zw-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'zw-discovery'}],
 stars:[['zw-wall-gap',.8,2],['zw-enclosure',8,2.3],['zw-boulder-3',1.5,2.2]],
 edges:[
  ['zw-woodland','zw-wall-1','JUMP'],['zw-wall-1','zw-wall-2','JUMP'],['zw-wall-2','zw-enclosure','JUMP'],['zw-enclosure','zw-passage','PASS_GATE'],['zw-passage','zw-wall-3','JUMP'],['zw-wall-3','zw-boulder-1','JUMP'],['zw-boulder-1','zw-hill-ledge','JUMP'],
  ['zw-hill-ledge','zw-boulder-2','JUMP'],['zw-boulder-2','zw-boulder-3','JUMP'],['zw-boulder-3','zw-hilltop','JUMP'],
  ['zw-wall-1','zw-wall-gap','DROP',false],['zw-wall-gap','zw-wall-2','JUMP',false],
 ],
});
