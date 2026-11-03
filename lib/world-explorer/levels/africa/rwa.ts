import {africaLevel,platform,ledge} from './common';

/** Rwanda — Volcanoes: The Gorilla Trail. Tier 3 (Challenger).
 * Up from hillside terraces into the bamboo zone: a bent bamboo stem
 * flings the player up into a Hagenia bough, bamboo crowns lead to a mossy
 * trunk climbed by hand, a silverback paces the bamboo glade, and a giant
 * root leads to the saddle between the volcanoes. A drainage hollow below
 * the first terrace holds a star. */
export const level=africaLevel('RWA',{
 design:{archetype:'bamboo-forest-fling-and-climb',signatureMechanic:'bent-bamboo-fling-into-the-hagenia',mechanics:['bent-bamboo-fling','hagenia-bough','mossy-trunk-climb','silverback-patrol','volcano-saddle'],terrain:['ground','terrace','mechanical','canopy','rock','climb-wall'],verticality:'high',enemyProfile:'moderate',targetDurationSeconds:56,seed:2026449},
 environment:{biome:'afromontane-bamboo-forest',locationReference:'Volcanoes National Park, Musanze District, Rwanda',terrainMaterial:'volcanic-loam',vegetationPack:'bamboo-hagenia-and-hypericum',architecturePack:'hillside-terraces',landmarkAssets:['virunga-cones','bamboo-forest','mountain-gorillas','hagenia-woodland','hillside-terraces'],lightingPreset:'misty-mountain-morning',skyPreset:'volcano-cloud'},
 sections:[{id:'A',label:'Hillside terraces',x:0},{id:'B',label:'Forest edge',x:11},{id:'C',label:'Bamboo fling',x:26},{id:'D',label:'Hagenia bough',x:30},{id:'E',label:'Mossy trunk',x:40},{id:'F',label:'Bamboo glade',x:50},{id:'G',label:'Giant root',x:69},{id:'H',label:'Volcano saddle',x:75}],
 platforms:[
  platform('rw-terraces',-6,0,14,{style:'hillside-terraces'}),
  platform('rw-terrace-1',11,.6,4,{terrain:'terrace',style:'potato-terrace'}),
  platform('rw-forest',18,.8,8,{style:'forest-edge'}),
  platform('rw-bamboo-1',26.6,0,2.4,{terrain:'mechanical',thickness:.3,bounce:14,style:'bent-bamboo'}),
  platform('rw-hagenia',30.2,3.6,7,{terrain:'canopy',thickness:1,style:'hagenia-bough'}),
  platform('rw-bamboo-2',40.2,3.4,3,{terrain:'rock',thickness:.8,style:'bamboo-crown'}),
  platform('rw-trunk',43.6,6.4,4,{terrain:'climb-wall',climbable:true,style:'mossy-trunk'}),
  platform('rw-bough',50.6,6.6,3,{terrain:'canopy',thickness:1,style:'hagenia-bough'}),
  platform('rw-glade',56.6,6.8,10,{style:'bamboo-glade'}),
  platform('rw-root',69.6,7,3,{terrain:'rock',thickness:1,style:'giant-root'}),
  platform('rw-saddle',75.6,7.2,13,{style:'volcano-saddle'}),
  ledge('rw-hollow',15.4,-.4,1.6,{style:'drainage-hollow'}),
 ],
 spawn:['rw-terraces',4],finish:['rw-saddle',11],discovery:['rw-saddle',8],checkpoints:[['rw-hagenia',1.4],['rw-glade',1]],
 enemies:[{id:'rw-silverback',platformId:'rw-glade',minOffset:3.4,maxOffset:6.6,speed:.7,turnPause:1.2,height:1}],
 discoveryBlocks:[{id:'rw-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'rw-discovery'}],
 stars:[['rw-hollow',.8,2],['rw-hagenia',4,2.3],['rw-root',1.5,2.2]],
 coinRange:{'rw-hagenia':[3.4,6]},
 edges:[
  ['rw-terraces','rw-terrace-1','JUMP'],['rw-terrace-1','rw-forest','JUMP'],['rw-forest','rw-bamboo-1','DROP'],['rw-bamboo-1','rw-hagenia','JUMP'],['rw-hagenia','rw-bamboo-2','JUMP'],['rw-bamboo-2','rw-trunk','CLIMB'],
  ['rw-trunk','rw-bough','JUMP'],['rw-bough','rw-glade','JUMP'],['rw-glade','rw-root','JUMP'],['rw-root','rw-saddle','JUMP'],
  ['rw-terrace-1','rw-hollow','DROP',false],['rw-hollow','rw-forest','JUMP',false],
 ],
});
