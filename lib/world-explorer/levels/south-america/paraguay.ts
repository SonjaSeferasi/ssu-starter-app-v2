import {authorLevel,platform,spread} from '../author';

const bank={collapse:{delay:1.4,respawn:3.5}};
/** Paraguay — Trinidad: The Jesuit Mission Trail. Tier 1 (Explorer).
 * A gentle beginner trail through the red-earth countryside of Itapúa where
 * the ground itself is the challenge: cracked earth banks over a dry arroyo
 * crumble a moment after you stand on them, so the lesson is to keep moving.
 * Low terraces, a quiet clearing, flowering lapacho crowns as an optional
 * high path, and the red sandstone ruins of La Santísima Trinidad de Paraná
 * at the end. The ruins themselves are never breakable. */
const p={
 trail:platform('py-trail',-6,0,18,{style:'red-earth'}),
 bank1:platform('py-bank-1',14.2,.2,3,{terrain:'ground',style:'cracked-bank',...bank}),
 bank2:platform('py-bank-2',19.4,.4,3,{terrain:'ground',style:'cracked-bank',...bank}),
 bank3:platform('py-bank-3',24.6,.4,3,{terrain:'ground',style:'cracked-bank',...bank}),
 clearing:platform('py-clearing',29.8,.4,12,{style:'orchard-clearing'}),
 hillSteps:platform('py-hill-steps',41.8,.4,4,{terrain:'stairs',slope:.5,steps:3,style:'earth-steps'}),
 hill:platform('py-hill',45.8,.9,5,{style:'red-earth'}),
 meadow:platform('py-meadow',50.8,-1.7,14,{style:'arroyo-meadow'}),
 bank4:platform('py-bank-4',66.8,-1.4,3,{terrain:'ground',style:'cracked-bank',...bank}),
 bank5:platform('py-bank-5',71.8,-1,3,{terrain:'ground',style:'cracked-bank',...bank}),
 missionSteps:platform('py-mission-steps',76.8,-1,6,{terrain:'stairs',slope:1.4,steps:5,style:'sandstone-steps'}),
 plaza:platform('py-mission-plaza',82.8,.4,6,{style:'mission-plaza'}),
 wall1:platform('py-wall-1',90.8,.9,2,{terrain:'arch',style:'mission-wall'}),
 wall2:platform('py-wall-2',94.8,1.3,2,{terrain:'arch',style:'mission-wall'}),
 finish:platform('py-trinidad',98.8,1.3,13,{style:'mission-nave'}),
 lapacho1:platform('py-lapacho-1',53.8,1.1,2,{terrain:'canopy',thickness:.5,route:'upper',style:'lapacho-crown'}),
 lapacho2:platform('py-lapacho-2',57.6,1.3,2,{terrain:'canopy',thickness:.5,route:'upper',style:'lapacho-crown'}),
};
export const level=authorLevel({
 code:'PRY',iso2:'PY',title:'Trinidad: The Jesuit Mission Trail',environmentId:'paraguay-trinidad-mission',tier:1,
 design:{archetype:'mission-countryside-crumbling-banks',signatureMechanic:'collapsing-earth-banks',mechanics:['collapsing-earth-banks','dry-arroyo','earth-steps','lapacho-crowns','clearing-patrol','mission-ruin-walls'],terrain:['ground','stairs','arch','canopy'],verticality:'low',enemyProfile:'light',targetDurationSeconds:55,seed:2026210},
 environment:{biome:'itapua-mission-countryside',locationReference:'Jesuit Mission of La Santísima Trinidad de Paraná, near Encarnación, Itapúa, Paraguay',terrainMaterial:'red-earth-and-red-sandstone',vegetationPack:'lapacho-pindo-palms-and-grassland',architecturePack:'jesuit-mission-ruins',landmarkAssets:['trinidad-mission-ruins','trinidad-bell-tower','lapacho-trees'],lightingPreset:'warm-afternoon-sun',skyPreset:'humid-subtropical-sky',weatherPreset:'pollen-and-butterflies'},
 sections:[{id:'A',label:'Red earth trail',x:0},{id:'B',label:'Cracked banks',x:12},{id:'C',label:'Orchard clearing',x:29},{id:'D',label:'Low hill',x:41},{id:'E',label:'Arroyo meadow',x:50},{id:'F',label:'Arroyo banks',x:65},{id:'G',label:'Mission steps',x:76},{id:'H',label:'Trinidad ruins',x:90}],
 platforms:Object.values(p),
 spawn:['py-trail',4],finish:['py-trinidad',9],discovery:['py-trinidad',5],checkpoints:[['py-clearing',1.5],['py-meadow',1.5]],
 hazards:[{id:'py-arroyo-thorns',x:63,y:-4.6,width:14,height:.9,style:'thorn-scrub'}],
 enemies:[{id:'py-armour-beetle',platformId:'py-clearing',minOffset:5.5,maxOffset:9,speed:.8,turnPause:.6,height:.75}],
 discoveryBlocks:[{id:'py-discovery-block',x:6,y:2.65,width:.75,height:.8,factId:'py-discovery'}],
 coins:[...spread(p.trail,4,1.1,[7,16.4]),...spread(p.bank1,1),...spread(p.bank2,1),...spread(p.bank3,1),['py-clearing',2.6,1.1],['py-clearing',10.8,1.1],['py-clearing',11.4,1.1],...spread(p.hillSteps,1),['py-hill',3.2,1.1],...spread(p.meadow,3),...spread(p.bank4,1),...spread(p.bank5,1),...spread(p.missionSteps,2),['py-mission-plaza',3.6,1.1],['py-mission-plaza',4.6,1.1],...spread(p.wall1,1),...spread(p.wall2,1),...spread(p.finish,2,1.1,[1.6,7]),...spread(p.lapacho1,1),...spread(p.lapacho2,1)],
 stars:[['py-lapacho-2',1,1.2],['py-clearing',10.5,2.4],['py-wall-2',1,2.2]],
 edges:[
  ['py-trail','py-bank-1','JUMP'],['py-bank-1','py-bank-2','JUMP'],['py-bank-2','py-bank-3','JUMP'],['py-bank-3','py-clearing','JUMP'],['py-clearing','py-hill-steps','WALK'],['py-hill-steps','py-hill','WALK'],['py-hill','py-meadow','DROP'],
  ['py-meadow','py-bank-4','JUMP'],['py-bank-4','py-bank-5','JUMP'],['py-bank-5','py-mission-steps','JUMP'],['py-mission-steps','py-mission-plaza','WALK'],['py-mission-plaza','py-wall-1','JUMP'],['py-wall-1','py-wall-2','JUMP'],['py-wall-2','py-trinidad','JUMP'],
  ['py-hill','py-lapacho-1','JUMP',false],['py-lapacho-1','py-lapacho-2','JUMP',false],['py-lapacho-2','py-meadow','DROP',false],
 ],
});
