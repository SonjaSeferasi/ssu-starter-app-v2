import {africaLevel,platform,ledge,hazardStrip} from './common';

/** Seychelles — La Digue: The Granite Boulders. Tier 1 (Explorer).
 * A gentle beach walk among smooth pink granite boulders, a cove of white
 * sand, a ride on the back of a slow giant tortoise across the lagoon
 * shallows, and a palm grove where a crab scuttles before the viewpoint.
 * A sandy hollow between the boulders holds a star. */
export const level=africaLevel('SYC',{
 design:{archetype:'gentle-granite-beach-walk',signatureMechanic:'giant-tortoise-ride',mechanics:['smooth-boulder-steps','white-sand-cove','giant-tortoise-ride','palm-grove-crab'],terrain:['sand','rock','mechanical','ground'],verticality:'low',enemyProfile:'light',targetDurationSeconds:46,seed:2026455},
 environment:{biome:'granitic-island-beach',locationReference:'Anse Source d’Argent, La Digue, Seychelles',terrainMaterial:'pink-granite-and-coral-sand',vegetationPack:'coconut-palms-and-takamaka',architecturePack:'none',landmarkAssets:['granite-boulders','anse-source-dargent','giant-tortoises','coconut-palms','coral-lagoon'],lightingPreset:'bright-island-afternoon',skyPreset:'island-cumulus'},
 sections:[{id:'A',label:'White beach',x:0},{id:'B',label:'Boulder steps',x:10},{id:'C',label:'Boulder cove',x:26},{id:'D',label:'Tortoise ride',x:35},{id:'E',label:'Lagoon rocks',x:43},{id:'F',label:'Palm grove',x:54},{id:'G',label:'Viewpoint',x:70}],
 platforms:[
  platform('sc-beach',-6,0,14,{terrain:'sand',style:'white-beach'}),
  platform('sc-boulder-1',10.2,.4,3,{terrain:'rock',thickness:1.4,style:'granite-boulder'}),
  platform('sc-boulder-2',15.4,.8,3,{terrain:'rock',thickness:1.4,style:'granite-boulder'}),
  platform('sc-boulder-3',20.6,.6,4,{terrain:'rock',thickness:1.4,style:'granite-boulder'}),
  platform('sc-cove',26.8,.4,8,{terrain:'sand',style:'boulder-cove'}),
  platform('sc-tortoise',37,.4,2.8,{type:'moving',motion:'horizontal',amplitude:1.6,period:9,pause:1.2,terrain:'mechanical',thickness:.5,style:'giant-tortoise'}),
  platform('sc-lagoon-rock',43.6,.6,3,{terrain:'rock',thickness:1.4,style:'granite-boulder'}),
  platform('sc-boulder-4',48.8,1,3,{terrain:'rock',thickness:1.4,style:'granite-boulder'}),
  platform('sc-grove',54,1.2,9,{style:'palm-grove'}),
  platform('sc-boulder-5',65.2,1.6,3,{terrain:'rock',thickness:1.4,style:'granite-boulder'}),
  platform('sc-viewpoint',70.4,1.8,13,{style:'boulder-viewpoint'}),
  ledge('sc-sandy-hollow',18.7,-.6,1.6,{style:'sandy-hollow'}),
 ],
 spawn:['sc-beach',4],finish:['sc-viewpoint',11],discovery:['sc-viewpoint',8],checkpoints:[['sc-cove',1.2],['sc-grove',1]],
 hazards:hazardStrip('sc-lagoon',8,58,-2.4,'lagoon'),
 enemies:[{id:'sc-crab',platformId:'sc-grove',minOffset:3,maxOffset:6,speed:.9,turnPause:.6,height:.5}],
 discoveryBlocks:[{id:'sc-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'sc-discovery'}],
 stars:[['sc-sandy-hollow',.8,2],['sc-cove',4,2.3],['sc-boulder-5',1.5,2.1]],
 edges:[
  ['sc-beach','sc-boulder-1','JUMP'],['sc-boulder-1','sc-boulder-2','JUMP'],['sc-boulder-2','sc-boulder-3','JUMP'],['sc-boulder-3','sc-cove','JUMP'],['sc-cove','sc-tortoise','RIDE_PLATFORM'],['sc-tortoise','sc-lagoon-rock','JUMP'],
  ['sc-lagoon-rock','sc-boulder-4','JUMP'],['sc-boulder-4','sc-grove','JUMP'],['sc-grove','sc-boulder-5','JUMP'],['sc-boulder-5','sc-viewpoint','JUMP'],
  ['sc-boulder-2','sc-sandy-hollow','DROP',false],['sc-sandy-hollow','sc-boulder-3','JUMP',false],
 ],
});
