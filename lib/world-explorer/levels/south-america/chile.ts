import {authorLevel,platform,spread} from '../author';

const crust={collapse:{delay:.9,respawn:3}};
/** Chile — El Tatio: Geysers at Dawn. Tier 4 (Expert Explorer).
 * A high Andean geyser field read as a timing course: run down a scree slope
 * off the caldera rim, cross sinter crusts that crack underfoot, climb lava
 * ledges to an ignimbrite arch, drop into the geyser field and time the
 * warned steam jets, then leap fragile sinter terraces to the lookout.
 * Optional ignimbrite pinnacles carry a high route over the geyser field. */
const p={
 rim:platform('cl-caldera-rim',-6,2,18,{terrain:'tepui',style:'caldera-rim'}),
 scree:platform('cl-scree',12,2,10,{terrain:'dune',slope:-2,style:'scree-slope'}),
 crust1:platform('cl-crust-1',25.8,.2,2.4,{terrain:'sand',style:'sinter-crust',...crust}),
 crust2:platform('cl-crust-2',31.8,.6,2.4,{terrain:'sand',style:'sinter-crust',...crust}),
 ridge:platform('cl-sinter-mound',37.8,1.2,8,{terrain:'cliff',style:'sinter-mound'}),
 ledge1:platform('cl-ledge-1',45.8,2.3,3,{terrain:'cliff',style:'lava-ledge'}),
 ledge2:platform('cl-ledge-2',48.8,3.4,3,{terrain:'cliff',style:'lava-ledge'}),
 arch:platform('cl-arch',55.6,3.4,4,{terrain:'arch',style:'ignimbrite-arch'}),
 tatio:platform('cl-tatio',61.4,0,24,{terrain:'ground',style:'geyser-sinter'}),
 sinter1:platform('cl-sinter-1',89,.5,2.4,{terrain:'rock',style:'sinter-terrace',collapse:{delay:.8,respawn:3}}),
 sinter2:platform('cl-sinter-2',95.2,1.1,2.4,{terrain:'rock',style:'sinter-terrace'}),
 finish:platform('cl-tatio-lookout',101.4,1.1,13,{terrain:'ground',style:'tatio-lookout'}),
 rock1:platform('cl-pinnacle-1',62.8,3.6,2.2,{terrain:'rock',thickness:.5,route:'upper',style:'ignimbrite-pinnacle'}),
 rock2:platform('cl-pinnacle-2',69,3.8,2.2,{terrain:'rock',thickness:.5,route:'upper',style:'ignimbrite-pinnacle'}),
 rock3:platform('cl-pinnacle-3',75.4,3.4,2.2,{terrain:'rock',thickness:.5,route:'upper',style:'ignimbrite-pinnacle'}),
};
const geyser=(id:string,x:number,phase:number)=>({id,x,y:0,width:1.4,height:3.2,style:'geyser',cycle:{period:5.5,warning:1.5,active:1.4,phase}});
export const level=authorLevel({
 code:'CHL',iso2:'CL',title:'El Tatio: Geysers at Dawn',environmentId:'chile-el-tatio',tier:4,
 design:{archetype:'andean-geyser-field',signatureMechanic:'timed-geyser-jets',mechanics:['timed-geyser-jets','cracking-sinter-crust','scree-run','lava-ledge-step-ups','ignimbrite-arch','fragile-sinter','sinter-patrol'],terrain:['tepui','dune','sand','cliff','arch','ground','rock'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:55,seed:2026206},
 environment:{biome:'high-andean-geyser-field',locationReference:'El Tatio geyser field, about 4,300 m up in the Andes, Antofagasta Region, Chile',terrainMaterial:'siliceous-sinter-and-volcanic-rock',vegetationPack:'paja-brava-and-llareta',architecturePack:'path-cairns',landmarkAssets:['el-tatio-geyser-field','sinter-terraces','tatio-volcanoes'],lightingPreset:'cold-andean-dawn',skyPreset:'andean-dawn-sky',weatherPreset:'geyser-steam'},
 sections:[{id:'A',label:'Caldera rim',x:0},{id:'B',label:'Scree run',x:12},{id:'C',label:'Sinter crust',x:24},{id:'D',label:'Sinter mound',x:37},{id:'E',label:'Lava ledges and arch',x:45},{id:'F',label:'El Tatio geysers',x:61},{id:'G',label:'Sinter terraces',x:87},{id:'H',label:'Tatio lookout',x:101}],
 platforms:Object.values(p),
 spawn:['cl-caldera-rim',4],finish:['cl-tatio-lookout',9],discovery:['cl-tatio-lookout',5],checkpoints:[['cl-sinter-mound',1.2],['cl-tatio',1.2]],
 hazards:[geyser('cl-geyser-1',67.6,0),geyser('cl-geyser-2',73.6,1.8),geyser('cl-geyser-3',79.6,3.6)],
 enemies:[{id:'cl-sinter-scuttler',platformId:'cl-sinter-mound',minOffset:3.4,maxOffset:6.8,speed:1.2,turnPause:.4,height:.8}],
 discoveryBlocks:[{id:'cl-discovery-block',x:106,y:3.75,width:.75,height:.8,factId:'cl-discovery'}],
 coins:[...spread(p.rim,4,1.1,[7,16.4]),...spread(p.scree,3),...spread(p.crust1,1),...spread(p.crust2,1),['cl-sinter-mound',7.2,1.1],...spread(p.ledge1,1),...spread(p.ledge2,1),...spread(p.arch,1),['cl-tatio',3.4,1.1],['cl-tatio',9.4,1.1],['cl-tatio',15.4,1.1],['cl-tatio',21.4,1.1],...spread(p.sinter1,1),...spread(p.sinter2,1),...spread(p.finish,2,1.1,[1.6,7]),...spread(p.rock1,1),...spread(p.rock2,1),...spread(p.rock3,1)],
 stars:[['cl-pinnacle-2',1.1,1.2],['cl-ledge-2',1.5,2.4],['cl-sinter-2',1.2,2.2]],
 edges:[
  ['cl-caldera-rim','cl-scree','WALK'],['cl-scree','cl-crust-1','JUMP'],['cl-crust-1','cl-crust-2','JUMP'],['cl-crust-2','cl-sinter-mound','JUMP'],['cl-sinter-mound','cl-ledge-1','CLIMB'],['cl-ledge-1','cl-ledge-2','CLIMB'],['cl-ledge-2','cl-arch','JUMP'],
  ['cl-arch','cl-tatio','DROP'],['cl-tatio','cl-sinter-1','JUMP'],['cl-sinter-1','cl-sinter-2','JUMP'],['cl-sinter-2','cl-tatio-lookout','JUMP'],
  ['cl-arch','cl-pinnacle-1','JUMP',false],['cl-pinnacle-1','cl-pinnacle-2','JUMP',false],['cl-pinnacle-2','cl-pinnacle-3','JUMP',false],['cl-pinnacle-3','cl-tatio','DROP',false],
 ],
});
