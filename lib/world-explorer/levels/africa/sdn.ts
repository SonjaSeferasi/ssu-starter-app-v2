import {africaLevel,platform} from './common';

/** Sudan — Meroë: Pyramids of the Kushite Kings. Tier 2 (Adventurer).
 * A desert approach to the royal cemetery: loose dune faces slide the player
 * back down unless they keep running, a caravan camel ferries them across a
 * hollow, the courses of a ruined pyramid shoulder lead up to a ridge where
 * a warned dust gust blows, and a shaduf well-sweep in a dune trough lifts
 * an explorer to a star. */
export const level=africaLevel('SDN',{
 design:{archetype:'dune-sea-to-pyramid-necropolis',signatureMechanic:'sliding-dune-faces-and-camel-ferry',mechanics:['sliding-sand-current','camel-ferry','pyramid-course-steps','haboob-gust','shaduf-lift'],terrain:['sand','dune','mechanical','stairs','terrace','ground'],verticality:'medium',enemyProfile:'none',targetDurationSeconds:58,seed:2026405},
 environment:{biome:'nubian-desert',locationReference:'The royal cemeteries of Meroë, between the Nile and Atbara, Sudan',terrainMaterial:'red-gold-sand-and-sandstone',vegetationPack:'acacia-and-doum-palm-wadi',architecturePack:'kushite-pyramids',landmarkAssets:['meroe-pyramids','nubian-dunes','camel-caravan','shaduf-well','acacia-wadi'],lightingPreset:'golden-desert-afternoon',skyPreset:'dusty-pale-sky',weatherPreset:'blowing-sand'},
 sections:[{id:'A',label:'Caravan camp',x:0},{id:'B',label:'Sliding dune',x:9},{id:'C',label:'Camel ferry',x:22},{id:'D',label:'Interdune hollow',x:32},{id:'E',label:'Second dune',x:41},{id:'F',label:'Pyramid courses',x:51},{id:'G',label:'Dust ridge',x:70},{id:'H',label:'Royal cemetery',x:89}],
 platforms:[
  platform('sd-camp',-6,0,15,{terrain:'sand',style:'camp'}),
  platform('sd-dune-1',9,0,8,{terrain:'dune',slope:1.4,current:-1.2,style:'dune-face'}),
  platform('sd-crest-1',17,1.4,5,{terrain:'dune',style:'dune-crest'}),
  platform('sd-camel',24.6,1,2.6,{type:'moving',motion:'horizontal',amplitude:2.4,period:7,pause:1,terrain:'mechanical',thickness:.4,style:'camel'}),
  platform('sd-hollow',32,1.2,9,{terrain:'sand',style:'interdune'}),
  platform('sd-dune-2',41,1.2,8,{terrain:'dune',slope:1.6,current:-1.4,style:'dune-face'}),
  platform('sd-course-1',51.6,3.4,3,{terrain:'stairs',style:'pyramid-course'}),
  platform('sd-course-2',57,4,3,{terrain:'terrace',style:'pyramid-course'}),
  platform('sd-shoulder',62.4,4,7,{terrain:'terrace',style:'pyramid-shoulder'}),
  platform('sd-ridge-1',72,3.2,6,{terrain:'dune',style:'dune-crest'}),
  platform('sd-ridge-2',80.6,3.6,6,{terrain:'dune',style:'dune-crest'}),
  platform('sd-necropolis',89.2,3.6,14,{terrain:'ground',style:'necropolis'}),
  platform('sd-shaduf',78.3,1.8,1.9,{type:'moving',motion:'vertical',amplitude:1.1,period:6.5,pause:1,terrain:'mechanical',thickness:.4,route:'upper',style:'shaduf'}),
 ],
 spawn:['sd-camp',4],finish:['sd-necropolis',12],discovery:['sd-necropolis',9],checkpoints:[['sd-hollow',1.4],['sd-shoulder',1.4]],
 zones:[{id:'sd-haboob',type:'wind',x:70,width:18,bottom:1,top:12,force:-1.8,period:7.5,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'sd-discovery-block',x:36,y:4.25,width:.75,height:.8,factId:'sd-discovery'}],
 noCoins:['sd-crest-1'],coins:[['sd-crest-1',3.2]],
 stars:[['sd-shaduf',1.4,1],['sd-crest-1',2.5,2.3],['sd-necropolis',5,2.4]],
 edges:[
  ['sd-camp','sd-dune-1','WALK'],['sd-dune-1','sd-crest-1','WALK'],['sd-crest-1','sd-camel','RIDE_PLATFORM'],['sd-camel','sd-hollow','JUMP'],['sd-hollow','sd-dune-2','WALK'],['sd-dune-2','sd-course-1','JUMP'],
  ['sd-course-1','sd-course-2','JUMP'],['sd-course-2','sd-shoulder','JUMP'],['sd-shoulder','sd-ridge-1','JUMP'],['sd-ridge-1','sd-ridge-2','JUMP'],['sd-ridge-2','sd-necropolis','JUMP'],
  ['sd-ridge-1','sd-shaduf','DROP',false],['sd-shaduf','sd-ridge-2','JUMP',false],
 ],
});
