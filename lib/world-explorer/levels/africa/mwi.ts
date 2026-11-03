import {africaLevel,platform,ledge,hazardStrip} from './common';

/** Malawi — Lake Malawi: Cichlid Shores. Tier 1 (Explorer).
 * A lakeshore leap course: smooth granite boulders in clear water above
 * shoals of bright cichlids, a cove beach, a dugout canoe across the bay,
 * a fishing jetty and the granite point where an otter scampers. A sandy
 * shelf in the shallows holds a star. */
export const level=africaLevel('MWI',{
 design:{archetype:'lakeshore-boulder-leaps',signatureMechanic:'dugout-canoe-across-the-bay',mechanics:['granite-boulder-steps','cove-beach','dugout-canoe','fishing-jetty','otter-patrol'],terrain:['ground','sand','rock','water-raft','bridge'],verticality:'low',enemyProfile:'light',targetDurationSeconds:46,seed:2026451},
 environment:{biome:'great-rift-lake-shore',locationReference:'Cape Maclear, Lake Malawi National Park, Malawi',terrainMaterial:'smooth-granite-and-lake-sand',vegetationPack:'baobabs-and-fig-trees',architecturePack:'fishing-village',landmarkAssets:['lake-malawi','cichlid-fish','granite-boulders','dugout-canoe','fishing-village'],lightingPreset:'clear-lake-morning',skyPreset:'lake-haze'},
 sections:[{id:'A',label:'Fishing village',x:0},{id:'B',label:'Lake beach',x:8},{id:'C',label:'Granite boulders',x:18},{id:'D',label:'Cove',x:34},{id:'E',label:'Dugout canoe',x:42},{id:'F',label:'Jetty and point',x:51},{id:'G',label:'Lookout',x:73}],
 platforms:[
  platform('mw-village',-6,0,14,{style:'fishing-village'}),
  platform('mw-beach',8,0,8,{terrain:'sand',style:'lake-beach'}),
  platform('mw-boulder-1',18.2,.3,3,{terrain:'rock',thickness:1.2,style:'smooth-granite'}),
  platform('mw-boulder-2',23.4,.6,3,{terrain:'rock',thickness:1.2,style:'smooth-granite'}),
  platform('mw-boulder-3',28.6,.8,3,{terrain:'rock',thickness:1.2,style:'smooth-granite'}),
  platform('mw-cove',33.8,.8,8,{terrain:'sand',style:'cove-beach'}),
  platform('mw-dugout',44.2,.5,3.4,{type:'moving',motion:'horizontal',amplitude:2,period:7,pause:1,bob:.08,terrain:'water-raft',thickness:.4,style:'dugout'}),
  platform('mw-jetty',51.8,.8,6,{terrain:'bridge',thickness:.4,style:'fishing-jetty'}),
  platform('mw-point',57.8,.8,8,{style:'granite-point'}),
  platform('mw-boulder-4',68,1.1,3,{terrain:'rock',thickness:1.2,style:'smooth-granite'}),
  platform('mw-lookout',73.2,1.4,13,{style:'lakeside-lookout'}),
  ledge('mw-sand-shelf',31.9,-.4,1.6,{style:'sand-shelf'}),
 ],
 spawn:['mw-village',4],finish:['mw-lookout',11],discovery:['mw-lookout',8],checkpoints:[['mw-cove',1.2],['mw-boulder-4',1.2]],
 hazards:hazardStrip('mw-lake',16,58,-2.4,'lake'),
 enemies:[{id:'mw-otter',platformId:'mw-point',minOffset:3.6,maxOffset:5.8,speed:.9,turnPause:.8,height:.5}],
 discoveryBlocks:[{id:'mw-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'mw-discovery'}],
 stars:[['mw-sand-shelf',.8,2],['mw-boulder-2',1.5,2.1],['mw-boulder-4',1.5,2.1]],
coinRange:{'mw-beach':[4.4,6.4]},
 edges:[
  ['mw-village','mw-beach','WALK'],['mw-beach','mw-boulder-1','JUMP'],['mw-boulder-1','mw-boulder-2','JUMP'],['mw-boulder-2','mw-boulder-3','JUMP'],['mw-boulder-3','mw-cove','JUMP'],['mw-cove','mw-dugout','RIDE_PLATFORM'],['mw-dugout','mw-jetty','JUMP'],
  ['mw-jetty','mw-point','WALK'],['mw-point','mw-boulder-4','JUMP'],['mw-boulder-4','mw-lookout','JUMP'],
  ['mw-boulder-3','mw-sand-shelf','DROP',false],['mw-sand-shelf','mw-cove','JUMP',false],
 ],
});
