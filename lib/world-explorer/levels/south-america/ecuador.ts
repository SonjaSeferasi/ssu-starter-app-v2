import {authorLevel,platform,spread} from '../author';

const crust={collapse:{delay:1,respawn:3}};
const surge=(id:string,x:number,width:number,y:number,phase:number)=>({id,x,y,width,height:1.6,style:'wave',cycle:{period:7,warning:2,active:1.6,phase}});
/** Ecuador — Galápagos: Lava Coast. Tier 3 (Challenger).
 * A shoreline read by the sea: warned wave surges sweep the low tide shelves,
 * so the player waits for the water to fall back and runs; thin lava crust
 * cracks under a standing player; a lava tube and tuff steps climb to an
 * overlook. An optional route over spatter cones stays above the surf. */
const p={
 beach:platform('ec-beach',-6,.4,16,{terrain:'lava',style:'black-sand'}),
 tide1:platform('ec-tide-1',10,0,8,{terrain:'lava',style:'tide-shelf'}),
 crust1:platform('ec-crust-1',21,.6,2.4,{terrain:'lava',style:'lava-crust',...crust}),
 crust2:platform('ec-crust-2',26.4,1.4,2.4,{terrain:'lava',style:'lava-crust',...crust}),
 cliff:platform('ec-lava-cliff',31.8,2.2,6,{terrain:'lava',style:'pahoehoe'}),
 tide2:platform('ec-tide-2',37.8,-.4,14,{terrain:'lava',style:'tide-shelf'}),
 rock1:platform('ec-rock-1',55,.4,2.2,{terrain:'rock',style:'tide-rock'}),
 rock2:platform('ec-rock-2',60.4,1.2,2.2,{terrain:'rock',style:'tide-rock'}),
 tube:platform('ec-lava-tube',65.8,1.8,10,{terrain:'cave',style:'lava-tube'}),
 tuff1:platform('ec-tuff-1',79,2.6,2.4,{terrain:'rock',style:'tuff'}),
 tuff2:platform('ec-tuff-2',84.4,3.4,2.4,{terrain:'rock',style:'tuff'}),
 summit:platform('ec-overlook',89.8,3.4,13,{terrain:'ground',style:'tuff-overlook'}),
 spatter1:platform('ec-spatter-1',40.8,2.4,2.2,{terrain:'lava',thickness:.5,route:'upper',style:'spatter-cone'}),
 spatter2:platform('ec-spatter-2',45.8,2.6,2.2,{terrain:'lava',thickness:.5,route:'upper',style:'spatter-cone'}),
};
export const level=authorLevel({
 code:'ECU',iso2:'EC',title:'Galápagos: Lava Coast',environmentId:'ecuador-galapagos-lava-coast',tier:3,
 design:{archetype:'volcanic-coast-tide-timing',signatureMechanic:'wave-surges',mechanics:['wave-surges','cracking-lava-crust','tide-shelves','lava-tube','tuff-steps','shore-crab-patrol','spatter-cone-route'],terrain:['lava','rock','cave','ground'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:50,seed:2026208},
 environment:{biome:'volcanic-island-coast',locationReference:'A lava shoreline in the Galápagos Islands, Ecuador',terrainMaterial:'black-pahoehoe-lava-and-tuff',vegetationPack:'candelabra-cactus-and-saltbush',architecturePack:'none',landmarkAssets:['galapagos-lava-shore','volcanic-cone-skyline','pacific-surf'],lightingPreset:'equatorial-ocean-light',skyPreset:'trade-wind-clouds',weatherPreset:'sea-spray'},
 sections:[{id:'A',label:'Black sand beach',x:0},{id:'B',label:'First tide shelf',x:10},{id:'C',label:'Lava crust',x:19},{id:'D',label:'Pahoehoe cliff',x:31},{id:'E',label:'Surge shelf',x:38},{id:'F',label:'Tide rocks',x:53},{id:'G',label:'Lava tube',x:65},{id:'H',label:'Tuff overlook',x:78}],
 platforms:Object.values(p),
 spawn:['ec-beach',4],finish:['ec-overlook',9],discovery:['ec-overlook',5],checkpoints:[['ec-lava-cliff',1.5],['ec-lava-tube',1.2]],
 hazards:[
  {id:'ec-sea-west',x:18,y:-2.2,width:13.8,height:.9,style:'sea'},{id:'ec-sea-east',x:51.8,y:-2.2,width:14,height:.9,style:'sea'},
  surge('ec-surge-1',12.6,3,0,0),surge('ec-surge-2',41.4,2.6,-.4,0),surge('ec-surge-3',46.4,2.6,-.4,3.5),
 ],
 enemies:[{id:'ec-lava-crab',platformId:'ec-lava-tube',minOffset:3.6,maxOffset:6,speed:1.1,turnPause:.4,height:.75}],
 discoveryBlocks:[{id:'ec-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'ec-discovery'}],
 coins:[...spread(p.beach,4,1.1,[7,14.4]),...spread(p.crust1,1),...spread(p.crust2,1),...spread(p.cliff,2),['ec-tide-2',12.8,1.1],...spread(p.rock1,1),...spread(p.rock2,1),['ec-lava-tube',7.2,1.1],['ec-lava-tube',8.6,1.1],...spread(p.tuff1,1),...spread(p.tuff2,1),...spread(p.summit,2,1.1,[1.6,7]),...spread(p.spatter1,1),...spread(p.spatter2,1)],
 stars:[['ec-spatter-2',1.1,1.2],['ec-rock-2',1.1,2.2],['ec-tuff-2',1.2,2.3]],
 edges:[
  ['ec-beach','ec-tide-1','WALK'],['ec-tide-1','ec-crust-1','JUMP'],['ec-crust-1','ec-crust-2','JUMP'],['ec-crust-2','ec-lava-cliff','JUMP'],['ec-lava-cliff','ec-tide-2','DROP'],
  ['ec-tide-2','ec-rock-1','JUMP'],['ec-rock-1','ec-rock-2','JUMP'],['ec-rock-2','ec-lava-tube','JUMP'],['ec-lava-tube','ec-tuff-1','JUMP'],['ec-tuff-1','ec-tuff-2','JUMP'],['ec-tuff-2','ec-overlook','JUMP'],
  ['ec-lava-cliff','ec-spatter-1','JUMP',false],['ec-spatter-1','ec-spatter-2','JUMP',false],['ec-spatter-2','ec-tide-2','DROP',false],
 ],
});
