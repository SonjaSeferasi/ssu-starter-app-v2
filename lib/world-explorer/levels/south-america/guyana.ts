import {authorLevel,platform,spread} from '../author';

/** Guyana — Kaieteur Falls: Potaro Gorge. Tier 2 (Adventurer).
 * Water you stand in moves you: flat rock shelves in the Potaro River carry
 * a standing player toward the brink, or hold them back in an upstream eddy,
 * so each crossing is about where you let the river take you. Then the cliff
 * path beside the falls: spray-wet ledges with little grip, gusts thrown off
 * the falling water, and tank bromeliads on a spur (the optional route). */
const p={
 bank:platform('gy-bank',-6,.4,16,{style:'rainforest-bank'}),
 shelf1:platform('gy-shelf-1',12.4,0,6,{terrain:'rock',style:'river-shelf',current:1.4}),
 boulder1:platform('gy-boulder-1',21,.6,2.4,{terrain:'rock',style:'river-boulder'}),
 shelf2:platform('gy-shelf-2',26,0,7,{terrain:'rock',style:'river-shelf',current:-1.2}),
 boulder2:platform('gy-boulder-2',35.6,.7,2.4,{terrain:'rock',style:'river-boulder'}),
 brink:platform('gy-brink',40.6,.7,10,{terrain:'cliff',style:'falls-rim'}),
 cliffPath:platform('gy-cliff-path',50.6,-1.9,14,{terrain:'cliff',style:'cliff-path'}),
 ledge1:platform('gy-ledge-1',66.8,-1.5,2.6,{terrain:'cliff',surface:'ice',style:'spray-ledge'}),
 ledge2:platform('gy-ledge-2',71.6,-.9,2.6,{terrain:'cliff',surface:'ice',style:'spray-ledge'}),
 ledge3:platform('gy-ledge-3',76.4,-.3,2.6,{terrain:'cliff',surface:'ice',style:'spray-ledge'}),
 lookout:platform('gy-gorge-lookout',81.6,.3,8,{terrain:'ground',style:'falls-lookout'}),
 steps:platform('gy-steps',89.6,.3,5,{terrain:'stairs',slope:1.2,steps:4,style:'rock-steps'}),
 finish:platform('gy-kaieteur-view',97.2,1.5,13,{terrain:'ground',style:'falls-lookout'}),
 tank1:platform('gy-bromeliad-1',53.6,.9,2,{terrain:'canopy',thickness:.5,route:'upper',style:'tank-bromeliad'}),
 tank2:platform('gy-bromeliad-2',57.6,1.1,2,{terrain:'canopy',thickness:.5,route:'upper',style:'tank-bromeliad'}),
};
export const level=authorLevel({
 code:'GUY',iso2:'GY',title:'Kaieteur Falls: Potaro Gorge',environmentId:'guyana-kaieteur-falls',tier:2,
 design:{archetype:'waterfall-cliff-current',signatureMechanic:'river-current-shelves',mechanics:['river-current-shelves','upstream-eddy','spray-slick-ledges','falls-gusts','lookout-patrol','tank-bromeliad-route'],terrain:['ground','rock','cliff','stairs','canopy'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:48,seed:2026209},
 environment:{biome:'tropical-tableland-waterfall',locationReference:'Kaieteur Falls on the Potaro River, Kaieteur National Park, Guyana',terrainMaterial:'pink-and-grey-sandstone-conglomerate',vegetationPack:'giant-tank-bromeliads-and-rainforest',architecturePack:'none',landmarkAssets:['kaieteur-falls','potaro-river-gorge','tank-bromeliads'],lightingPreset:'bright-tropical-sun',skyPreset:'rising-spray-cloud',weatherPreset:'falls-spray'},
 sections:[{id:'A',label:'Rainforest bank',x:0},{id:'B',label:'Current shelf',x:12},{id:'C',label:'Upstream eddy',x:25},{id:'D',label:'Falls rim',x:38},{id:'E',label:'Cliff path',x:50},{id:'F',label:'Spray ledges',x:65},{id:'G',label:'Gorge lookout',x:80},{id:'H',label:'Kaieteur view',x:95}],
 platforms:Object.values(p),
 spawn:['gy-bank',4],finish:['gy-kaieteur-view',9],discovery:['gy-kaieteur-view',5],checkpoints:[['gy-brink',1.5],['gy-gorge-lookout',1.2]],
 hazards:[{id:'gy-potaro',x:10,y:-1.6,width:20,height:.9,style:'river'},{id:'gy-potaro-rim',x:30,y:-1.6,width:10.6,height:.9,style:'river'}],
 zones:[{id:'gy-falls-spray',type:'wind',x:64,width:18,bottom:-4,top:6,force:2.2,period:6.5,warning:1.5,duration:1.8,phase:0}],
 enemies:[{id:'gy-rock-frog',platformId:'gy-gorge-lookout',minOffset:3.6,maxOffset:6.6,speed:1,turnPause:.5,height:.7}],
 discoveryBlocks:[{id:'gy-discovery-block',x:4,y:3.05,width:.75,height:.8,factId:'gy-discovery'}],
 coins:[...spread(p.bank,4,1.1,[7,14.4]),...spread(p.shelf1,2),...spread(p.boulder1,1),...spread(p.shelf2,2),...spread(p.boulder2,1),...spread(p.brink,3),...spread(p.cliffPath,3),...spread(p.ledge1,1),...spread(p.ledge2,1),...spread(p.ledge3,1),['gy-gorge-lookout',7.2,1.1],...spread(p.steps,1),...spread(p.finish,2,1.1,[1.6,7]),...spread(p.tank1,1),...spread(p.tank2,1)],
 stars:[['gy-bromeliad-2',1,1.2],['gy-shelf-2',3.5,2.4],['gy-ledge-3',1.3,2.2]],
 edges:[
  ['gy-bank','gy-shelf-1','JUMP'],['gy-shelf-1','gy-boulder-1','JUMP'],['gy-boulder-1','gy-shelf-2','JUMP'],['gy-shelf-2','gy-boulder-2','JUMP'],['gy-boulder-2','gy-brink','JUMP'],['gy-brink','gy-cliff-path','DROP'],
  ['gy-cliff-path','gy-ledge-1','JUMP'],['gy-ledge-1','gy-ledge-2','JUMP'],['gy-ledge-2','gy-ledge-3','JUMP'],['gy-ledge-3','gy-gorge-lookout','JUMP'],['gy-gorge-lookout','gy-steps','WALK'],['gy-steps','gy-kaieteur-view','JUMP'],
  ['gy-brink','gy-bromeliad-1','JUMP',false],['gy-bromeliad-1','gy-bromeliad-2','JUMP',false],['gy-bromeliad-2','gy-cliff-path','DROP',false],
 ],
});
