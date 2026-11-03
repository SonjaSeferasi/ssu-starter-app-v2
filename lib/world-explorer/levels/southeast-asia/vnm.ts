import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.VNM;
const platforms=[
 platform("vn-start",0,0,15,{"thickness":7,"terrain":"rock"}),
 platform("vn-boat",17,0.2,5,{"thickness":0.3,"motion":"horizontal","amplitude":0.4,"period":7,"pause":0.8,"terrain":"water-raft","type":"wooden-moving","style":"bay-junk"}),
 platform("vn-island",24,1.4,7,{"thickness":7,"terrain":"cliff"}),
 platform("vn-high",32.8,2.65,7,{"thickness":7,"terrain":"cliff"}),
 platform("vn-cave",39.8,0.2,13,{"thickness":7,"terrain":"cave"}),
 platform("vn-wall",52.8,3.8,6,{"thickness":7,"terrain":"climb-wall","climbable":true}),
 platform("vn-exit",60.6,5.05,7,{"thickness":7,"terrain":"cliff"}),
 platform("vn-ridge",69.4,6.3,7,{"thickness":7,"terrain":"cliff"}),
 platform("vn-low",76.4,3.2,10,{"thickness":7,"terrain":"rock"}),
 platform("vn-end",88.2,3.5,13,{"thickness":7,"terrain":"rock"}),
 platform("vn-bonus",67.8,6.5,1.6,{"thickness":0.15,"terrain":"cave","route":"upper","style":"upper-cave-exit"})
];
export const level=authorLevel({
 code:'VNM',iso2:'VN',title:place.title,environmentId:'southeast-vn',tier:5,
 design:{archetype:'boat-cave-alternating-height-route',signatureMechanic:place.signature,mechanics:["horizontal-platform", "climbing"],terrain:["rock", "water-raft", "cliff", "cave", "climb-wall"],verticality:'high',enemyProfile:'none',targetDurationSeconds:70,seed:8110},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:52.8},{id:'C',label:'Discovery overlook',x:88.2}],
 platforms,
 spawn:["vn-start",2],
 finish:["vn-end",11],
 checkpoints:[["vn-high",1.2],["vn-exit",1.2]],
 discovery:["vn-end",9],
 coins:[["vn-start",2,1.1],["vn-boat",2,1.1],["vn-island",2,1.1],["vn-high",2,1.1],["vn-cave",2,1.1],["vn-wall",2,1.1],["vn-exit",2,1.1],["vn-ridge",2,1.1],["vn-low",2,1.1],["vn-end",2,1.1],["vn-start",5,1.1],["vn-end",10,1.1],["vn-bonus",0.8,0.85]],
 stars:[["vn-bonus",0.8,0.8],["vn-ridge",3,2.2],["vn-end",6.5,2.2]],
 edges:[["vn-start","vn-boat","RIDE_PLATFORM"],["vn-boat","vn-island","JUMP"],["vn-island","vn-high","JUMP"],["vn-high","vn-cave","DROP"],["vn-cave","vn-wall","CLIMB"],["vn-wall","vn-exit","JUMP"],["vn-exit","vn-ridge","JUMP"],["vn-ridge","vn-low","DROP"],["vn-low","vn-end","JUMP"],["vn-exit","vn-bonus","JUMP",false],["vn-bonus","vn-ridge","JUMP",false]]
});
