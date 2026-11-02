import {authorLevel,platform} from '../author';

/** Peru — Inca Trail: Terraces to the Sun Gate. Tier 4 (Expert Explorer).
 * An ascent, not a run: tall agricultural-terrace risers to jump up, a
 * washed-out rope bridge whose frayed plank sections give way underfoot, an
 * oroya cable basket swinging across the gorge, a headwind at Inti Punku
 * (the Sun Gate), then a stone stair down to the citadel. A fall from the
 * rope bridge lands on a gorge ledge (optional star) with a lift back up. */
export const level=authorLevel({
 code:'PER',iso2:'PE',title:'Inca Trail: Terraces to the Sun Gate',environmentId:'peru-andean-terraces',tier:4,
 design:{archetype:'andean-terrace-ascent',signatureMechanic:'terrace-step-ups-and-frayed-bridge',mechanics:['tall-terrace-risers','collapsing-bridge-planks','oroya-cable-basket','sun-gate-headwind','gorge-lift','scree-patrol','stair-descent'],terrain:['ground','terrace','bridge','cliff','stairs','mechanical'],verticality:'high',enemyProfile:'light',targetDurationSeconds:85,seed:2026203},
 environment:{biome:'andean-cloud-forest-ridge',locationReference:'The Inca Trail between Inti Punku and the Historic Sanctuary of Machu Picchu, Cusco Region, Peru',terrainMaterial:'granite-terraces-and-cut-stone',vegetationPack:'andean-grasses-bromeliads-and-polylepis',architecturePack:'inca-ashlar-terraces-and-gabled-houses',landmarkAssets:['machu-picchu-citadel','huayna-picchu-peak','inti-punku-sun-gate','urubamba-river-gorge'],lightingPreset:'morning-mountain-sun',skyPreset:'andean-cloud-sea',weatherPreset:'valley-cloud'},
 sections:[{id:'A',label:'Urubamba valley',x:0},{id:'B',label:'Terrace climb',x:14},{id:'C',label:'Washed-out rope bridge',x:35},{id:'D',label:'Gorge rim',x:56},{id:'E',label:'Oroya crossing',x:65},{id:'F',label:'Inti Punku',x:84},{id:'G',label:'Ridge in the wind',x:98},{id:'H',label:'Citadel',x:119}],
 platforms:[
  platform('pe-valley',-6,0,20,{style:'trail'}),
  platform('pe-terrace-1',14,1.1,4,{terrain:'terrace'}),
  platform('pe-terrace-2',18,2.2,4,{terrain:'terrace'}),
  platform('pe-terrace-3',22,3.3,13,{terrain:'terrace',style:'trail'}),
  platform('pe-plank-1',38.6,3.1,2.2,{terrain:'bridge',thickness:.3,depth:2.4,style:'rope-plank',collapse:{delay:.8,respawn:3}}),
  platform('pe-plank-2',44.4,3.1,2.2,{terrain:'bridge',thickness:.3,depth:2.4,style:'rope-plank',collapse:{delay:.8,respawn:3}}),
  platform('pe-plank-3',50.2,3.3,2.2,{terrain:'bridge',thickness:.3,depth:2.4,style:'rope-plank',collapse:{delay:.8,respawn:3}}),
  platform('pe-gorge-far',56,3.6,9,{terrain:'cliff'}),
  platform('pe-oroya',71.6,3.4,2.4,{type:'moving',motion:'horizontal',amplitude:3,period:9,pause:1.6,terrain:'mechanical',thickness:.4,depth:2.4,style:'oroya'}),
  platform('pe-cliff-ledge',80.6,4.2,4,{terrain:'cliff'}),
  platform('pe-terrace-4',84.6,5.3,3.5,{terrain:'terrace'}),
  platform('pe-sun-gate',88.1,6.4,10,{terrain:'ground',style:'inti-punku'}),
  platform('pe-ridge-1',101.8,6.2,2.4,{terrain:'cliff',style:'ridge-rock'}),
  platform('pe-ridge-2',107.8,6.4,2.4,{terrain:'cliff',style:'ridge-rock'}),
  platform('pe-overlook',113.8,6,6,{terrain:'ground'}),
  platform('pe-stairs',119.8,6,6,{terrain:'stairs',slope:-1.6,steps:5,style:'inca-stairs'}),
  platform('pe-citadel',129.4,4.4,15,{terrain:'ground',style:'citadel'}),
  platform('pe-lower',41.6,-1,5.8,{terrain:'cliff',route:'upper',style:'gorge-ledge'}),
  platform('pe-lift',47.4,1.15,2,{type:'moving',motion:'vertical',amplitude:2.15,period:7,pause:1.2,terrain:'mechanical',thickness:.4,depth:2.4,route:'upper',style:'gorge-lift'}),
 ],
 spawn:['pe-valley',4],finish:['pe-citadel',13.4],discovery:['pe-citadel',11.6],checkpoints:[['pe-gorge-far',1.6],['pe-overlook',1.4]],
 zones:[{id:'pe-inti-punku-wind',type:'wind',x:96,width:18,bottom:4,top:12,force:-3,period:7,warning:1.6,duration:2.2,phase:0}],
 enemies:[{id:'pe-scree-beetle',platformId:'pe-citadel',minOffset:2.6,maxOffset:7.2,speed:1.2,turnPause:.4,height:.8}],
 discoveryBlocks:[{id:'pe-discovery-block',x:92,y:9.05,width:.75,height:.8,factId:'pe-discovery'}],
 coins:[
  ['pe-valley',8],['pe-valley',10],['pe-valley',12],
  ['pe-terrace-1',2],['pe-terrace-2',2],['pe-terrace-3',2],['pe-terrace-3',5],['pe-terrace-3',8],['pe-terrace-3',11],
  ['pe-plank-1',1.1],['pe-plank-2',1.1],['pe-plank-3',1.1],
  ['pe-lower',1.5],['pe-lower',3],
  ['pe-gorge-far',4],['pe-gorge-far',6],
  ['pe-oroya',1.2],['pe-cliff-ledge',2],['pe-terrace-4',1.8],
  ['pe-sun-gate',3],['pe-sun-gate',6],['pe-sun-gate',8.5],
  ['pe-ridge-1',1.2],['pe-ridge-2',1.2],['pe-overlook',3.5],
  ['pe-stairs',3.4],['pe-stairs',4.8],['pe-citadel',1.5],
 ],
 stars:[['pe-lower',2.4,1.2],['pe-oroya',1.2,2.2],['pe-sun-gate',5,2.4]],
 edges:[
  ['pe-valley','pe-terrace-1','CLIMB'],['pe-terrace-1','pe-terrace-2','CLIMB'],['pe-terrace-2','pe-terrace-3','CLIMB'],
  ['pe-terrace-3','pe-plank-1','JUMP'],['pe-plank-1','pe-plank-2','JUMP'],['pe-plank-2','pe-plank-3','JUMP'],['pe-plank-3','pe-gorge-far','JUMP'],
  ['pe-gorge-far','pe-oroya','RIDE_PLATFORM'],['pe-oroya','pe-cliff-ledge','JUMP'],['pe-cliff-ledge','pe-terrace-4','CLIMB'],['pe-terrace-4','pe-sun-gate','CLIMB'],
  ['pe-sun-gate','pe-ridge-1','JUMP'],['pe-ridge-1','pe-ridge-2','JUMP'],['pe-ridge-2','pe-overlook','JUMP'],['pe-overlook','pe-stairs','WALK'],['pe-stairs','pe-citadel','JUMP'],
  ['pe-plank-1','pe-lower','DROP',false],['pe-lower','pe-lift','RIDE_PLATFORM',false],['pe-lift','pe-plank-3','JUMP',false],
 ],
});
