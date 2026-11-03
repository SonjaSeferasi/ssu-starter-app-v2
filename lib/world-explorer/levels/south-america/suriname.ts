import {authorLevel,platform,spread} from '../author';

/** Suriname — Paramaribo: Historic Waterfront. Tier 2 (Adventurer).
 * A timber town on the Suriname River: climb the Waterkant's wooden stairs
 * and galleries to a warehouse roof, drop into the market (shop signs above
 * it hold a star), step on the plate that opens Fort Zeelandia's gate, ride
 * two river boats and a cargo hoist, and cross the galleries of the wooden
 * old town to the finish. */
const p={
 waterfront:platform('sr-waterkant',-6,.4,16,{style:'waterkant'}),
 steps:platform('sr-wooden-steps',10,.4,4,{terrain:'stairs',slope:.8,steps:3,style:'wooden-stairs'}),
 balcony1:platform('sr-gallery-1',16.4,1.6,3,{terrain:'rooftop',style:'timber-gallery'}),
 balcony2:platform('sr-gallery-2',21.2,2.2,3,{terrain:'rooftop',style:'timber-gallery'}),
 roof:platform('sr-warehouse-roof',26.8,2.8,6,{terrain:'rooftop',style:'warehouse-roof'}),
 market:platform('sr-market',32.8,.2,14,{style:'market'}),
 fortYard:platform('sr-fort-yard',46.8,.2,8,{style:'fort-yard'}),
 jetty:platform('sr-jetty',54.8,.2,3,{terrain:'bridge',thickness:.6,style:'jetty'}),
 boat1:platform('sr-boat-1',61.2,0,3,{type:'moving',motion:'horizontal',amplitude:1,period:7,pause:1.2,bob:.06,terrain:'water-raft',thickness:.5,style:'river-boat'}),
 boat2:platform('sr-boat-2',68.2,0,3,{type:'moving',motion:'horizontal',amplitude:1,period:7,phase:3.14,pause:1.2,bob:.06,terrain:'water-raft',thickness:.5,style:'river-boat'}),
 pontoon:platform('sr-pontoon',74.2,.2,4,{terrain:'bridge',thickness:.6,style:'pontoon'}),
 hoist:platform('sr-hoist',80,1.4,2.2,{type:'moving',motion:'vertical',amplitude:1.2,period:7,pause:1.4,terrain:'mechanical',thickness:.4,style:'cargo-hoist'}),
 warehouse:platform('sr-warehouse',84,2.6,6,{terrain:'rooftop',style:'warehouse-roof'}),
 gallery3:platform('sr-gallery-3',92.6,3,2.6,{terrain:'rooftop',style:'timber-gallery'}),
 gallery4:platform('sr-gallery-4',97.8,3.4,2.6,{terrain:'rooftop',style:'timber-gallery'}),
 finish:platform('sr-cathedral-square',103,3,13,{style:'cathedral-square'}),
 sign1:platform('sr-sign-1',35.8,3,2,{terrain:'rooftop',thickness:.5,route:'upper',style:'shop-sign'}),
 sign2:platform('sr-sign-2',40,3.2,2,{terrain:'rooftop',thickness:.5,route:'upper',style:'shop-sign'}),
};
export const level=authorLevel({
 code:'SUR',iso2:'SR',title:'Paramaribo: Historic Waterfront',environmentId:'suriname-paramaribo-waterfront',tier:2,
 design:{archetype:'wooden-waterfront-and-riverboats',signatureMechanic:'riverboat-crossings',mechanics:['river-boats','cargo-hoist','fort-gate-plate','timber-galleries','market-patrol','shop-sign-route'],terrain:['ground','stairs','rooftop','bridge','water-raft','mechanical'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:65,seed:2026211},
 environment:{biome:'tropical-river-town',locationReference:'Historic Inner City of Paramaribo on the Suriname River, Suriname',terrainMaterial:'painted-timber-and-red-brick',vegetationPack:'royal-palms-and-mahogany',architecturePack:'white-timber-houses-with-dark-roofs',landmarkAssets:['paramaribo-wooden-buildings','fort-zeelandia','suriname-river'],lightingPreset:'humid-tropical-morning',skyPreset:'towering-cumulus',weatherPreset:'river-haze'},
 sections:[{id:'A',label:'Waterkant',x:0},{id:'B',label:'Galleries',x:10},{id:'C',label:'Market',x:32},{id:'D',label:'Fort Zeelandia',x:46},{id:'E',label:'River boats',x:55},{id:'F',label:'Cargo hoist',x:74},{id:'G',label:'Old town galleries',x:90},{id:'H',label:'Cathedral square',x:103}],
 platforms:Object.values(p),
 spawn:['sr-waterkant',4],finish:['sr-cathedral-square',9],discovery:['sr-cathedral-square',5],checkpoints:[['sr-market',1.5],['sr-warehouse',1.5]],
 hazards:[{id:'sr-river',x:57.8,y:-1.6,width:16.4,height:.9,style:'river'},{id:'sr-river-quay',x:78.2,y:-1.6,width:5.8,height:.9,style:'river'}],
 switches:[{id:'sr-fort-plate',platformId:'sr-market',offset:12,gateIds:['sr-fort-gate']}],
 gates:[{id:'sr-fort-gate',x:47.3,y:.2,width:.7,height:3,openSeconds:7}],
 enemies:[{id:'sr-mango-beetle',platformId:'sr-market',minOffset:5.6,maxOffset:9.8,speed:1,turnPause:.5,height:.8}],
 discoveryBlocks:[{id:'sr-discovery-block',x:107,y:5.65,width:.75,height:.8,factId:'sr-discovery'}],
 coins:[...spread(p.waterfront,4,1.1,[7,14.4]),...spread(p.steps,1),...spread(p.balcony1,1),...spread(p.balcony2,1),...spread(p.roof,2),['sr-market',3.4,1.1],['sr-market',11,1.1],['sr-fort-yard',5,1.1],['sr-fort-yard',6.4,1.1],...spread(p.boat1,1),...spread(p.boat2,1),...spread(p.pontoon,1),...spread(p.hoist,1),...spread(p.warehouse,2),...spread(p.gallery3,1),...spread(p.gallery4,1),...spread(p.finish,2,1.1,[1.6,7]),...spread(p.sign1,1),...spread(p.sign2,1)],
 stars:[['sr-sign-2',1,1.2],['sr-boat-2',1.5,1.1],['sr-gallery-4',1.3,2.2]],
 edges:[
  ['sr-waterkant','sr-wooden-steps','WALK'],['sr-wooden-steps','sr-gallery-1','JUMP'],['sr-gallery-1','sr-gallery-2','JUMP'],['sr-gallery-2','sr-warehouse-roof','JUMP'],['sr-warehouse-roof','sr-market','DROP'],
  ['sr-market','sr-fort-yard','PASS_GATE'],['sr-fort-yard','sr-jetty','WALK'],['sr-jetty','sr-boat-1','RIDE_PLATFORM'],['sr-boat-1','sr-boat-2','RIDE_PLATFORM'],['sr-boat-2','sr-pontoon','JUMP'],['sr-pontoon','sr-hoist','RIDE_PLATFORM'],['sr-hoist','sr-warehouse','JUMP'],
  ['sr-warehouse','sr-gallery-3','JUMP'],['sr-gallery-3','sr-gallery-4','JUMP'],['sr-gallery-4','sr-cathedral-square','JUMP'],
  ['sr-warehouse-roof','sr-sign-1','JUMP',false],['sr-sign-1','sr-sign-2','JUMP',false],['sr-sign-2','sr-market','DROP',false],
 ],
});
