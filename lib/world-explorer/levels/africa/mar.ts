import {africaLevel,platform} from './common';

/** Morocco — Chefchaouen: The Blue Medina. Tier 3 (Challenger).
 * A rooftop run through a blue-washed hill town: a brass plate opens a riad
 * door down the lane, striped market awnings bounce the player onto the
 * roofs, rooftop gaps widen, a cat patrols the long terrace, a stair alley
 * drops to a plaza, and a goods hoist lifts the player onto the kasbah ramparts
 * before the overlook. A drop from the third roof lands on a laundry roof hung with washing, one hop below the terrace (optional star). */
export const level=africaLevel('MAR',{
 design:{archetype:'medina-rooftop-awning-run',signatureMechanic:'market-awning-bounce-to-rooftops',mechanics:['awning-bounce','riad-door-plate-gate','rooftop-gaps','stair-alleys','terrace-cat-patrol','rampart-goods-hoist'],terrain:['ground','stairs','rooftop','mechanical'],verticality:'high',enemyProfile:'light',targetDurationSeconds:62,seed:2026401},
 environment:{biome:'mountain-medina',locationReference:'The medina of Chefchaouen in the Rif Mountains, Morocco',terrainMaterial:'blue-limewash-and-cobbles',vegetationPack:'potted-geraniums-and-fig',architecturePack:'blue-medina-houses',landmarkAssets:['blue-medina-houses','rif-mountains','spanish-mosque-hill','market-awnings','kasbah-walls'],lightingPreset:'clear-mountain-morning',skyPreset:'rif-blue-sky'},
 sections:[{id:'A',label:'Outa el Hammam square',x:0},{id:'B',label:'Riad door lane',x:10},{id:'C',label:'Awning launch',x:26},{id:'D',label:'Blue rooftops',x:36},{id:'E',label:'Cat terrace',x:59},{id:'F',label:'Stair alley',x:70},{id:'G',label:'Hoist to the ramparts',x:84},{id:'H',label:'Mosque hill',x:102}],
 platforms:[
  platform('ma-square',-6,0,16,{style:'plaza'}),
  platform('ma-stairs',10,0,5,{terrain:'stairs',slope:1.2,steps:4,style:'blue-steps'}),
  platform('ma-lane',15,1.2,9,{style:'blue-lane'}),
  platform('ma-roof-1',26.6,1.9,4,{terrain:'rooftop',thickness:.8,style:'flat-roof'}),
  platform('ma-awning-1',31.2,.6,2.4,{terrain:'mechanical',thickness:.3,bounce:14,style:'awning'}),
  platform('ma-roof-high',36.6,4.3,7,{terrain:'rooftop',thickness:.8,style:'flat-roof'}),
  platform('ma-roof-2',46.8,3.8,3,{terrain:'rooftop',thickness:.8,style:'flat-roof'}),
  platform('ma-roof-3',53.1,4.4,3,{terrain:'rooftop',thickness:.8,style:'flat-roof'}),
  platform('ma-terrace',59.4,3.8,11,{terrain:'rooftop',thickness:.8,style:'roof-terrace'}),
  platform('ma-stair-alley',70.4,3.8,5,{terrain:'stairs',slope:-1.6,steps:5,style:'blue-steps'}),
  platform('ma-plaza',75.4,2.2,8,{style:'blue-lane'}),
  platform('ma-hoist',84.6,2.8,2.4,{type:'moving',motion:'vertical',amplitude:1.4,period:6.4,pause:1,terrain:'mechanical',thickness:.4,style:'goods-hoist'}),
  platform('ma-rampart-1',88,4,5,{terrain:'rooftop',thickness:.8,style:'rampart'}),
  platform('ma-rampart-2',96.2,4.6,2.6,{terrain:'rooftop',thickness:.8,style:'rampart'}),
  platform('ma-overlook',102,4.6,14,{style:'hill-path'}),
  platform('ma-laundry',56.6,2.6,2.4,{terrain:'rooftop',thickness:.5,route:'upper',style:'laundry-roof'}),
 ],
 spawn:['ma-square',4],finish:['ma-overlook',12],discovery:['ma-overlook',9.5],checkpoints:[['ma-roof-high',1.4],['ma-plaza',1.2]],
 switches:[{id:'ma-riad-plate',platformId:'ma-square',offset:13.2,gateIds:['ma-riad-door']}],
 gates:[{id:'ma-riad-door',x:21.4,y:1.2,width:.5,height:2.5,openSeconds:7}],
 enemies:[{id:'ma-medina-cat',platformId:'ma-terrace',minOffset:3.4,maxOffset:8.2,speed:1.2,turnPause:.5,height:.7}],
 discoveryBlocks:[{id:'ma-discovery-block',x:78.6,y:5.3,width:.75,height:.8,factId:'ma-discovery'}],
 stars:[['ma-laundry',1.2,2],['ma-roof-high',3.5,2.3],['ma-rampart-2',1.3,2.2]],
 edges:[
  ['ma-square','ma-stairs','WALK'],['ma-stairs','ma-lane','WALK'],['ma-lane','ma-roof-1','PASS_GATE'],['ma-roof-1','ma-awning-1','DROP'],['ma-awning-1','ma-roof-high','JUMP'],
  ['ma-roof-high','ma-roof-2','JUMP'],['ma-roof-2','ma-roof-3','JUMP'],['ma-roof-3','ma-terrace','JUMP'],['ma-terrace','ma-stair-alley','WALK'],['ma-stair-alley','ma-plaza','WALK'],
  ['ma-plaza','ma-hoist','RIDE_PLATFORM'],['ma-hoist','ma-rampart-1','JUMP'],['ma-rampart-1','ma-rampart-2','JUMP'],['ma-rampart-2','ma-overlook','JUMP'],
  ['ma-roof-3','ma-laundry','DROP',false],['ma-laundry','ma-terrace','JUMP',false],
 ],
});
