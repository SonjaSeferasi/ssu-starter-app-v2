import {authorLevel,platform,spread} from '../author';

const moss={collapse:{delay:.9,respawn:3}};
/** Colombia — Cocora Valley: Cloud Forest Climb. Tier 4 (Expert Explorer).
 * The vertical level: hold jump against mossy cliff faces to climb them, cross
 * crumbling moss ledges, ride a cable basket over the valley, leap between the
 * crowns of Quindío wax palms and climb again to a misty summit. A fall from
 * the palms lands on the valley stream; the ridge's mossy face climbs back. */
const p={
 valley:platform('co-valley',-6,0,16,{style:'pasture'}),
 wall1:platform('co-wall-1',10,4,4,{terrain:'climb-wall',climbable:true,style:'moss-cliff'}),
 ledge1:platform('co-ledge-1',17.8,4.2,2.4,{terrain:'rock',thickness:.8,style:'moss-ledge',...moss}),
 ledge2:platform('co-ledge-2',23.8,4.6,3,{terrain:'rock',thickness:.8,style:'moss-ledge'}),
 wall2:platform('co-wall-2',26.8,8,5,{terrain:'climb-wall',climbable:true,style:'moss-cliff'}),
 cable:platform('co-cable',37.4,7.8,2.4,{type:'moving',motion:'horizontal',amplitude:2,period:8,pause:1.4,terrain:'mechanical',thickness:.4,style:'cable-basket'}),
 palm1:platform('co-palm-1',45.6,8.2,1.8,{terrain:'canopy',thickness:.8,style:'wax-palm'}),
 palm2:platform('co-palm-2',51.2,8.2,1.8,{terrain:'canopy',thickness:.8,style:'wax-palm'}),
 ridge:platform('co-ridge',56.8,7.6,10,{terrain:'climb-wall',climbable:true,style:'cloud-ridge'}),
 wall3:platform('co-wall-3',66.8,11.6,4,{terrain:'climb-wall',climbable:true,style:'moss-cliff'}),
 ledge3:platform('co-ledge-3',74.6,11.4,2.4,{terrain:'rock',thickness:.8,style:'moss-ledge',...moss}),
 summit:platform('co-summit',80.6,11.8,13,{terrain:'ground',style:'mirador'}),
 stream:platform('co-stream',43,.5,13.8,{terrain:'ground',route:'upper',style:'valley-stream'}),
};
export const level=authorLevel({
 code:'COL',iso2:'CO',title:'Cocora Valley: Cloud Forest Climb',environmentId:'colombia-cocora-cloud-forest',tier:4,
 design:{archetype:'cloud-forest-vertical-climb',signatureMechanic:'climbable-walls',mechanics:['climbable-moss-faces','crumbling-moss-ledges','cable-basket','wax-palm-crowns','valley-catch-route','ridge-patrol'],terrain:['ground','climb-wall','rock','mechanical','canopy'],verticality:'high',enemyProfile:'light',targetDurationSeconds:55,seed:2026207},
 environment:{biome:'andean-cloud-forest',locationReference:'Cocora Valley wax-palm forest near Salento, Quindío, Colombia',terrainMaterial:'mossy-volcanic-rock-and-pasture',vegetationPack:'quindio-wax-palms-tree-ferns-and-bromeliads',architecturePack:'wooden-cable-crossing',landmarkAssets:['quindio-wax-palms','cocora-cloud-forest-ridges','cable-crossing'],lightingPreset:'soft-cloud-forest-light',skyPreset:'drifting-cloud',weatherPreset:'cloud-forest-mist'},
 sections:[{id:'A',label:'Cocora pasture',x:0},{id:'B',label:'First moss face',x:10},{id:'C',label:'Moss ledges',x:16},{id:'D',label:'Second face',x:26},{id:'E',label:'Cable crossing',x:33},{id:'F',label:'Wax-palm crowns',x:44},{id:'G',label:'Cloud ridge',x:56},{id:'H',label:'Summit mirador',x:66}],
 platforms:Object.values(p),
 spawn:['co-valley',4],finish:['co-summit',9],discovery:['co-summit',5],checkpoints:[['co-wall-2',2],['co-ridge',1.5]],
 enemies:[{id:'co-moss-beetle',platformId:'co-ridge',minOffset:4.2,maxOffset:8,speed:1.1,turnPause:.4,height:.8}],
 discoveryBlocks:[{id:'co-discovery-block',x:4,y:2.65,width:.75,height:.8,factId:'co-discovery'}],
 coins:[...spread(p.valley,4,1.1,[7,14.4]),...spread(p.wall1,1),...spread(p.ledge1,1),...spread(p.ledge2,1),...spread(p.wall2,2),...spread(p.cable,1),...spread(p.palm1,1),...spread(p.palm2,1),['co-ridge',8.8,1.1],['co-ridge',9.4,1.1],...spread(p.wall3,1),...spread(p.ledge3,1),...spread(p.summit,2,1.1,[1.6,7]),...spread(p.stream,3)],
 stars:[['co-stream',6.9,1.2],['co-cable',1.2,2.2],['co-wall-3',2,2.4]],
 edges:[
  ['co-valley','co-wall-1','CLIMB'],['co-wall-1','co-ledge-1','JUMP'],['co-ledge-1','co-ledge-2','JUMP'],['co-ledge-2','co-wall-2','CLIMB'],['co-wall-2','co-cable','RIDE_PLATFORM'],['co-cable','co-palm-1','JUMP'],['co-palm-1','co-palm-2','JUMP'],['co-palm-2','co-ridge','JUMP'],
  ['co-ridge','co-wall-3','CLIMB'],['co-wall-3','co-ledge-3','JUMP'],['co-ledge-3','co-summit','JUMP'],
  ['co-palm-1','co-stream','DROP',false],['co-stream','co-ridge','CLIMB',false],
 ],
});
