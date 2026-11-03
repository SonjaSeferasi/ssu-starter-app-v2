import {africaLevel,platform,ledge} from './common';

const thatch={collapse:{delay:.85,respawn:3}};
/** Togo — Koutammakou: The Tower Houses. Tier 3 (Challenger).
 * Climb a takienta by hand, hop its granary turrets to the next house,
 * drop into a compound yard, climb again, cross thatched turret caps that
 * give way, dodge a goat on the high terrace and leap the last turret to
 * the Atakora hillside. A small shrine between the first turrets holds a
 * star. */
export const level=africaLevel('TGO',{
 design:{archetype:'tower-house-climb-and-turret-hops',signatureMechanic:'hand-climbed-takienta-walls',mechanics:['takienta-wall-climbs','granary-turret-hops','thatch-caps-that-give-way','compound-yard-drop','terrace-goat-patrol'],terrain:['ground','climb-wall','rock','rooftop'],verticality:'high',enemyProfile:'light',targetDurationSeconds:50,seed:2026419},
 environment:{biome:'guinea-savanna-hills',locationReference:'Koutammakou, Kara Region, northern Togo',terrainMaterial:'banco-earth-and-laterite',vegetationPack:'shea-baobab-and-millet',architecturePack:'batammariba-takienta',landmarkAssets:['takienta-tower-houses','granary-turrets','atakora-hills','compound-yards','millet-fields'],lightingPreset:'golden-savanna-morning',skyPreset:'harmattan-haze'},
 sections:[{id:'A',label:'Millet fields',x:0},{id:'B',label:'First takienta',x:8},{id:'C',label:'Granary turrets',x:16},{id:'D',label:'Compound yard',x:36},{id:'E',label:'Second climb',x:45},{id:'F',label:'Thatch caps',x:53},{id:'G',label:'High terrace',x:64},{id:'H',label:'Atakora hill',x:79}],
 platforms:[
  platform('tg-fields',-6,0,14,{style:'millet-field'}),
  platform('tg-house-1',8.4,2.4,5,{terrain:'climb-wall',climbable:true,style:'takienta'}),
  platform('tg-turret-1',16.2,3,2.2,{terrain:'rock',thickness:1.2,style:'granary-turret'}),
  platform('tg-turret-2',21.6,3.4,2.2,{terrain:'rock',thickness:1.2,style:'granary-turret'}),
  platform('tg-house-2',27,3,6,{terrain:'rooftop',thickness:1,style:'takienta-terrace'}),
  platform('tg-yard',36.2,.6,9,{style:'compound-yard'}),
  platform('tg-house-3',45.6,3.2,5,{terrain:'climb-wall',climbable:true,style:'takienta'}),
  platform('tg-cap-1',53.8,3.6,2.2,{terrain:'rock',thickness:.6,style:'thatch-cap',...thatch}),
  platform('tg-cap-2',59.2,4,2.2,{terrain:'rock',thickness:.6,style:'thatch-cap',...thatch}),
  platform('tg-house-4',64.6,3.6,6,{terrain:'rooftop',thickness:1,style:'takienta-terrace'}),
  platform('tg-turret-3',73.8,3.8,2.2,{terrain:'rock',thickness:1.2,style:'granary-turret'}),
  platform('tg-hill',79.2,3.4,13,{style:'atakora-hill'}),
  ledge('tg-shrine',18.8,2.2,1.6,{style:'fetish-shrine'}),
 ],
 spawn:['tg-fields',3],finish:['tg-hill',11],discovery:['tg-hill',8],checkpoints:[['tg-yard',1.2],['tg-house-4',1.2]],
 enemies:[{id:'tg-goat',platformId:'tg-house-4',minOffset:2.4,maxOffset:4.4,speed:.9,turnPause:.8,height:.7}],
 discoveryBlocks:[{id:'tg-discovery-block',x:40,y:3.85,width:.75,height:.8,factId:'tg-discovery'}],
 stars:[['tg-shrine',.8,2],['tg-house-2',3,2.2],['tg-turret-3',1.1,2.2]],
 edges:[
  ['tg-fields','tg-house-1','CLIMB'],['tg-house-1','tg-turret-1','JUMP'],['tg-turret-1','tg-turret-2','JUMP'],['tg-turret-2','tg-house-2','JUMP'],['tg-house-2','tg-yard','DROP'],
  ['tg-yard','tg-house-3','CLIMB'],['tg-house-3','tg-cap-1','JUMP'],['tg-cap-1','tg-cap-2','JUMP'],['tg-cap-2','tg-house-4','JUMP'],['tg-house-4','tg-turret-3','JUMP'],['tg-turret-3','tg-hill','JUMP'],
  ['tg-turret-1','tg-shrine','DROP',false],['tg-shrine','tg-turret-2','JUMP',false],
 ],
});
