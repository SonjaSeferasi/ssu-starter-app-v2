import {africaLevel,platform,ledge} from './common';

const flake={collapse:{delay:1.1,respawn:3}};
/** Somalia — Laas Geel: The Painted Shelters. Tier 2 (Adventurer).
 * Up from a dry riverbed: a sandy bank slides the player back, weathered
 * granite flakes away underfoot, the painted rock shelter is the rest
 * stop, and a dik-dik darts along the outcrop ledge before the summit of
 * the outcrop. A hollow between the first boulders holds a star. The
 * paintings are never touched or crossed. */
export const level=africaLevel('SOM',{
 design:{archetype:'granite-outcrop-shelter-climb',signatureMechanic:'flaking-granite-and-sliding-sand-bank',mechanics:['sliding-sand-bank','flaking-granite-boulders','painted-shelter-rest','dik-dik-patrol','outcrop-summit'],terrain:['sand','slope','rock','cave','cliff','ground'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:38,seed:2026446},
 environment:{biome:'somali-semi-desert',locationReference:'The Laas Geel rock shelters near Hargeisa',terrainMaterial:'pink-granite',vegetationPack:'acacia-and-desert-rose',architecturePack:'none',landmarkAssets:['laas-geel-shelters','painted-cattle','granite-outcrops','dry-riverbed','camel-herders'],lightingPreset:'hot-afternoon',skyPreset:'hazy-desert'},
 sections:[{id:'A',label:'Dry riverbed',x:0},{id:'B',label:'Sliding bank',x:8},{id:'C',label:'Granite boulders',x:16},{id:'D',label:'Painted shelter',x:27},{id:'E',label:'Outcrop ledges',x:39},{id:'F',label:'Dik-dik ledge',x:45},{id:'G',label:'Last boulders',x:55},{id:'H',label:'Outcrop summit',x:66}],
 platforms:[
  platform('so-wadi',-6,0,14,{terrain:'sand',style:'dry-riverbed'}),
  platform('so-bank',8,0,6,{terrain:'sand',slope:1,current:-1,style:'sliding-bank'}),
  platform('so-boulder-1',16.6,1.2,3,{terrain:'rock',thickness:1.2,style:'granite-boulder'}),
  platform('so-boulder-2',22.2,1.6,3,{terrain:'rock',thickness:.7,style:'flaking-granite',...flake}),
  platform('so-shelter',27.8,1.8,9,{terrain:'cave',style:'painted-shelter'}),
  platform('so-ledge-1',39.4,2.2,3,{terrain:'rock',thickness:1.2,style:'granite-boulder'}),
  platform('so-ledge-2',45,2.4,8,{terrain:'cliff',style:'outcrop-ledge'}),
  platform('so-boulder-3',55.6,2.8,3,{terrain:'rock',thickness:.7,style:'flaking-granite',...flake}),
  platform('so-boulder-4',61.2,3,3,{terrain:'rock',thickness:1.2,style:'granite-boulder'}),
  platform('so-summit',66.8,3.2,13,{style:'outcrop-summit'}),
  ledge('so-hollow',20,.4,1.6,{style:'granite-hollow'}),
 ],
 spawn:['so-wadi',4],finish:['so-summit',11],discovery:['so-summit',8],checkpoints:[['so-shelter',1.2],['so-ledge-2',1]],
 enemies:[{id:'so-dik-dik',platformId:'so-ledge-2',minOffset:3,maxOffset:5.6,speed:1.2,turnPause:.6,height:.6}],
 discoveryBlocks:[{id:'so-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'so-discovery'}],
 stars:[['so-hollow',.8,2],['so-ledge-1',1.5,2.2],['so-boulder-4',1.5,2.2]],
 edges:[
  ['so-wadi','so-bank','WALK'],['so-bank','so-boulder-1','JUMP'],['so-boulder-1','so-boulder-2','JUMP'],['so-boulder-2','so-shelter','JUMP'],['so-shelter','so-ledge-1','JUMP'],['so-ledge-1','so-ledge-2','JUMP'],
  ['so-ledge-2','so-boulder-3','JUMP'],['so-boulder-3','so-boulder-4','JUMP'],['so-boulder-4','so-summit','JUMP'],
  ['so-boulder-1','so-hollow','DROP',false],['so-hollow','so-boulder-2','JUMP',false],
 ],
});
