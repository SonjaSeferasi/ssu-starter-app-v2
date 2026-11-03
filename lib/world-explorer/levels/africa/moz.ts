import {africaLevel,platform,ledge,hazardStrip} from './common';

const wave=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2.4,height:1.4,style:'wave',cycle:{period:7.2,warning:2,active:1.5,phase}});
/** Mozambique — Bazaruto: The Dhow Crossing. Tier 2 (Adventurer).
 * Over a towering coastal dune whose face slides the player back, down to
 * a sandbar washed by warned waves, across the channel on a sailing dhow,
 * over coral heads to an island beach where a ghost crab scuttles, and up
 * the steps to the lighthouse. A seagrass shelf between the coral heads
 * holds a star. */
export const level=africaLevel('MOZ',{
 design:{archetype:'dune-and-dhow-island-crossing',signatureMechanic:'sailing-dhow-across-the-channel',mechanics:['sliding-dune-face','sandbar-waves','sailing-dhow','coral-head-hops','ghost-crab-patrol','lighthouse-steps'],terrain:['sand','slope','water-raft','rock','stairs','ground'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:52,seed:2026452},
 environment:{biome:'indian-ocean-dune-islands',locationReference:'The Bazaruto Archipelago, Inhambane Province, Mozambique',terrainMaterial:'white-dune-sand',vegetationPack:'coconut-palms-and-dune-scrub',architecturePack:'dhows-and-lighthouse',landmarkAssets:['bazaruto-dunes','sailing-dhows','turquoise-channels','seagrass-shallows','island-lighthouse'],lightingPreset:'bright-tropical-noon',skyPreset:'trade-wind-clouds'},
 sections:[{id:'A',label:'Palm lodge',x:0},{id:'B',label:'Dune face',x:8},{id:'C',label:'Dune crest',x:16},{id:'D',label:'Washed sandbar',x:29},{id:'E',label:'Dhow crossing',x:37},{id:'F',label:'Second sandbar',x:47},{id:'G',label:'Coral heads',x:58},{id:'H',label:'Island lighthouse',x:69}],
 platforms:[
  platform('mz-lodge',-6,0,14,{terrain:'sand',style:'palm-lodge'}),
  platform('mz-dune',8,0,8,{terrain:'sand',slope:2,current:-1.2,style:'dune-face'}),
  platform('mz-crest',16,2,5,{terrain:'sand',style:'dune-crest'}),
  platform('mz-dune-down',21,2,6,{terrain:'sand',slope:-2,style:'dune-face'}),
  platform('mz-bar-1',29.6,0,7,{terrain:'sand',style:'sandbar'}),
  platform('mz-dhow',39.6,0,4,{type:'moving',motion:'horizontal',amplitude:2.4,period:8,pause:1.2,bob:.1,terrain:'water-raft',thickness:.5,style:'sailing-dhow'}),
  platform('mz-bar-2',47.6,.2,8,{terrain:'sand',style:'sandbar'}),
  platform('mz-coral-1',58.2,.4,3,{terrain:'rock',thickness:1,style:'coral-head'}),
  platform('mz-coral-2',63.8,.6,3,{terrain:'rock',thickness:1,style:'coral-head'}),
  platform('mz-island',69.4,.8,8,{terrain:'sand',style:'island-beach'}),
  platform('mz-steps',77.4,.8,5,{terrain:'stairs',slope:1.6,steps:5,style:'lighthouse-steps'}),
  platform('mz-lighthouse',82.4,2.4,13,{style:'lighthouse-hill'}),
  ledge('mz-seagrass',61.5,-.6,1.6,{style:'seagrass-shelf'}),
 ],
 spawn:['mz-lodge',4],finish:['mz-lighthouse',11],discovery:['mz-lighthouse',8],checkpoints:[['mz-bar-2',1.2],['mz-island',1]],
 hazards:[wave('mz-wave-1',33.9,0,0),wave('mz-wave-2',51.6,.2,3.6),...hazardStrip('mz-channel',27,52,-2.8,'sea')],
 enemies:[{id:'mz-ghost-crab',platformId:'mz-island',minOffset:2.6,maxOffset:5.4,speed:1.1,turnPause:.5,height:.5}],
 discoveryBlocks:[{id:'mz-discovery-block',x:18.5,y:5.05,width:.75,height:.8,factId:'mz-discovery'}],
 stars:[['mz-seagrass',.8,2],['mz-crest',3.8,2.3],['mz-coral-2',1.5,2.2]],
 noCoins:['mz-bar-1'],
 edges:[
  ['mz-lodge','mz-dune','WALK'],['mz-dune','mz-crest','WALK'],['mz-crest','mz-dune-down','WALK'],['mz-dune-down','mz-bar-1','JUMP'],['mz-bar-1','mz-dhow','RIDE_PLATFORM'],['mz-dhow','mz-bar-2','JUMP'],
  ['mz-bar-2','mz-coral-1','JUMP'],['mz-coral-1','mz-coral-2','JUMP'],['mz-coral-2','mz-island','JUMP'],['mz-island','mz-steps','WALK'],['mz-steps','mz-lighthouse','WALK'],
  ['mz-coral-1','mz-seagrass','DROP',false],['mz-seagrass','mz-coral-2','JUMP',false],
 ],
});
