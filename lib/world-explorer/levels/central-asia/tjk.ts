import {authorLevel,platform} from '../author';
import {centralAsiaPlaces} from '../../central-asia';
const place=centralAsiaPlaces.TJK;
const platforms=[
 platform("tj-start",0,0,14,{"thickness":7,"terrain":"rock"}),
 platform("tj-steps",14,0,8,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("tj-face",22,4.6,3.6,{"thickness":7,"terrain":"climb-wall","climbable":true}),
 platform("tj-high",27.4,5.3,8.4,{"thickness":7,"terrain":"cliff"}),
 platform("tj-peak",37.6,6.55,6,{"thickness":7,"terrain":"cliff"}),
 platform("tj-ledge",45.4,7.8,6,{"thickness":7,"terrain":"cliff"}),
 platform("tj-rest",53.2,9.05,10,{"thickness":7,"terrain":"cliff"}),
 platform("tj-descent",63.2,6,12,{"thickness":7,"terrain":"cliff"}),
 platform("tj-end",77,6.3,15,{"thickness":7,"terrain":"cliff"}),
 platform("tj-bonus",43.7,8.2,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'TJK',iso2:'TJ',title:place.title,environmentId:'central-asia-tj',tier:5,
 design:{archetype:'high-plateau-climb-and-exposed-pass',signatureMechanic:place.signature,mechanics:["climbing", "wind"],terrain:["rock", "stairs", "climb-wall", "cliff"],verticality:'high',enemyProfile:'none',targetDurationSeconds:70,seed:8102},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:37.6},{id:'C',label:'Discovery overlook',x:77}],
 platforms,
 spawn:["tj-start",2],
 finish:["tj-end",13],
 checkpoints:[["tj-high",1.2],["tj-rest",1.2]],
 discovery:["tj-end",11],
 coins:[["tj-start",2,1.1],["tj-steps",2,1.1],["tj-face",2,2.2],["tj-high",2,1.1],["tj-peak",2,1.1],["tj-ledge",2,1.1],["tj-rest",2,1.1],["tj-descent",2,1.1],["tj-end",2,1.1],["tj-start",5,1.1],["tj-end",12,1.1],["tj-bonus",0.8,0.85]],
 stars:[["tj-bonus",0.8,0.8],["tj-rest",3,2.2],["tj-end",7.5,2.2]],
 edges:[["tj-start","tj-steps","WALK"],["tj-steps","tj-face","CLIMB"],["tj-face","tj-high","JUMP"],["tj-high","tj-peak","JUMP"],["tj-peak","tj-ledge","JUMP"],["tj-ledge","tj-rest","JUMP"],["tj-rest","tj-descent","DROP"],["tj-descent","tj-end","JUMP"],["tj-peak","tj-bonus","JUMP",false],["tj-bonus","tj-ledge","JUMP",false]],
 zones:[{"id":"tj-ridge-wind","type":"wind","x":28,"width":29,"bottom":3,"top":15,"force":0.55,"period":9,"warning":1.6,"duration":1.8,"phase":0.5}]
});
