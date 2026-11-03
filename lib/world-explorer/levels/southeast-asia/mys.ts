import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.MYS;
const platforms=[
 platform("my-start",0,0,14,{"thickness":7}),
 platform("my-forest",14,0,10,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("my-face",24,4.5,6,{"thickness":7,"terrain":"climb-wall","climbable":true}),
 platform("my-ledge",32,5.65,6,{"thickness":7,"terrain":"cliff"}),
 platform("my-ridge",39.8,6.85,6,{"thickness":7,"terrain":"cliff"}),
 platform("my-rest",47.6,7.1,12,{"thickness":7,"terrain":"cliff"}),
 platform("my-down",59.6,4.5,11,{"thickness":7,"terrain":"cliff"}),
 platform("my-end",72.4,4.8,12,{"thickness":7}),
 platform("my-bonus",38.2,7.05,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'MYS',iso2:'MY',title:place.title,environmentId:'southeast-my',tier:4,
 design:{archetype:'granite-face-and-wind-pass',signatureMechanic:place.signature,mechanics:["climbing", "wind"],terrain:["ground", "stairs", "climb-wall", "cliff", "rock"],verticality:'high',enemyProfile:'none',targetDurationSeconds:65,seed:8104},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:39.8},{id:'C',label:'Discovery overlook',x:72.4}],
 platforms,
 spawn:["my-start",2],
 finish:["my-end",10],
 checkpoints:[["my-face",1.2],["my-rest",1.2]],
 discovery:["my-end",8],
 coins:[["my-start",2,1.1],["my-forest",2,1.1],["my-face",2,1.1],["my-ledge",2,1.1],["my-ridge",2,1.1],["my-rest",2,1.1],["my-down",2,1.1],["my-end",2,1.1],["my-start",5,1.1],["my-end",9,1.1],["my-bonus",0.8,0.85]],
 stars:[["my-bonus",0.8,0.8],["my-rest",3,2.2],["my-end",6.0,2.2]],
 edges:[["my-start","my-forest","WALK"],["my-forest","my-face","CLIMB"],["my-face","my-ledge","JUMP"],["my-ledge","my-ridge","JUMP"],["my-ridge","my-rest","JUMP"],["my-rest","my-down","DROP"],["my-down","my-end","JUMP"],["my-ledge","my-bonus","JUMP",false],["my-bonus","my-ridge","JUMP",false]],
 zones:[{"id":"my-ridge-wind","type":"wind","x":31,"width":17,"bottom":3,"top":12,"force":0.75,"period":9,"warning":1.6,"duration":1.8,"phase":0.5}]
});
