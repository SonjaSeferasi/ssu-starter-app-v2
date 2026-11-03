import {africaLevel,platform,ledge,hazardStrip} from './common';

const driftwood=(id:string,x:number,y:number,period:number,phase=0)=>platform(id,x,y,3,{type:'moving',motion:'vertical',amplitude:.45,period,phase,pause:.6,terrain:'water-raft',thickness:.5,style:'driftwood'});
const surf=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2.6,height:1.4,style:'wave',cycle:{period:7.2,warning:2,active:1.5,phase}});
/** Gabon — Loango: Elephants on the Beach. Tier 2 (Adventurer).
 * Out of the coastal forest and down to a wild Atlantic beach: warned waves
 * wash up the sand, driftwood logs bob in the lagoon mouth, a palm raft
 * crosses the lagoon, and a red river hog trots the dune path before the
 * forest camp. A hippo pool beside the mangroves holds a star. */
export const level=africaLevel('GAB',{
 design:{archetype:'beach-lagoon-forest-loop',signatureMechanic:'bobbing-driftwood-at-the-lagoon-mouth',mechanics:['beach-wave-washes','bobbing-driftwood','lagoon-palm-raft','red-river-hog-patrol','mangrove-roots'],terrain:['ground','slope','sand','water-raft','rock'],verticality:'low',enemyProfile:'light',targetDurationSeconds:46,seed:2026436},
 environment:{biome:'atlantic-coastal-rainforest',locationReference:'Loango National Park, Ogooué-Maritime, Gabon',terrainMaterial:'pale-beach-sand',vegetationPack:'coastal-rainforest-and-mangroves',architecturePack:'forest-camp',landmarkAssets:['loango-beach','forest-elephants-on-sand','lagoon','driftwood','coastal-rainforest'],lightingPreset:'golden-coast-evening',skyPreset:'atlantic-sunset'},
 sections:[{id:'A',label:'Coastal forest',x:0},{id:'B',label:'Dune path',x:8},{id:'C',label:'Wave beach',x:14},{id:'D',label:'Driftwood',x:26},{id:'E',label:'Sand spit',x:37},{id:'F',label:'Lagoon raft',x:46},{id:'G',label:'Hog trail',x:61},{id:'H',label:'Forest camp',x:79}],
 platforms:[
  platform('ga-forest',-6,0,14,{style:'coastal-forest'}),
  platform('ga-dune',8,0,6,{terrain:'sand',slope:-.6,style:'dune-path'}),
  platform('ga-beach',14,-.6,10,{terrain:'sand',style:'wild-beach'}),
  driftwood('ga-drift-1',26.6,-.8,5),
  driftwood('ga-drift-2',32,-.8,5.6,2),
  platform('ga-spit',37.6,-.4,8,{terrain:'sand',style:'sand-spit'}),
  platform('ga-raft',48.4,-.6,3,{type:'moving',motion:'horizontal',amplitude:1.8,period:6.6,pause:1,terrain:'water-raft',thickness:.4,style:'palm-raft'}),
  platform('ga-mangrove',55.6,-.2,3,{terrain:'rock',thickness:.8,style:'mangrove-roots'}),
  platform('ga-hog-trail',61.2,0,10,{terrain:'sand',style:'dune-trail'}),
  platform('ga-roots',73.8,.5,3,{terrain:'rock',thickness:.8,style:'forest-roots'}),
  platform('ga-camp',79.4,.9,13,{style:'forest-camp'}),
  ledge('ga-hippo-pool',59,-1.4,1.6,{style:'hippo-pool'}),
 ],
 spawn:['ga-forest',4],finish:['ga-camp',11],discovery:['ga-camp',8],checkpoints:[['ga-spit',1.2],['ga-hog-trail',1.2]],
 hazards:[surf('ga-surf-1',18,-.6,0),surf('ga-surf-2',40.6,-.4,3.6),...hazardStrip('ga-lagoon',24,50,-2.8,'lagoon')],
 enemies:[{id:'ga-red-river-hog',platformId:'ga-hog-trail',minOffset:3,maxOffset:7,speed:1,turnPause:.6,height:.7}],
 discoveryBlocks:[{id:'ga-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'ga-discovery'}],
 stars:[['ga-hippo-pool',.8,2],['ga-beach',8,2.3],['ga-roots',1.5,2.2]],
 // The red river hog patrols the run-up to the roots: that hop keeps its authored length.
 tuneSkip:['ga-roots'],
 edges:[
  ['ga-forest','ga-dune','WALK'],['ga-dune','ga-beach','WALK'],['ga-beach','ga-drift-1','RIDE_PLATFORM'],['ga-drift-1','ga-drift-2','RIDE_PLATFORM'],['ga-drift-2','ga-spit','JUMP'],['ga-spit','ga-raft','RIDE_PLATFORM'],['ga-raft','ga-mangrove','JUMP'],
  ['ga-mangrove','ga-hog-trail','JUMP'],['ga-hog-trail','ga-roots','JUMP'],['ga-roots','ga-camp','JUMP'],
  ['ga-mangrove','ga-hippo-pool','DROP',false],['ga-hippo-pool','ga-hog-trail','JUMP',false],
 ],
});
