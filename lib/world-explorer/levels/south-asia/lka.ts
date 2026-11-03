import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.LKA;
const platforms=[
 platform("lk-start",0,0,15,{"thickness":7,"terrain":"terrace"}),
 platform("lk-garden",15,0,13,{"thickness":7,"terrain":"terrace"}),
 platform("lk-court",28,0,12,{"thickness":7,"terrain":"terrace"}),
 platform("lk-stairs",40,0,8,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("lk-ledge",49.8,2.15,8,{"thickness":7,"terrain":"terrace"}),
 platform("lk-overlook",59.6,3.1,8,{"thickness":7,"terrain":"terrace"}),
 platform("lk-end",69.4,4,15,{"thickness":7,"terrain":"terrace"}),
 platform("lk-bonus",58,3.65,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'LKA',iso2:'LK',title:place.title,environmentId:'south-asia-lk',tier:3,
 design:{archetype:'water-garden-and-rock-overlook-puzzle',signatureMechanic:place.signature,mechanics:["gate"],terrain:["terrace", "stairs", "rock"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:60,seed:8108},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:40},{id:'C',label:'Discovery overlook',x:69.4}],
 platforms,
 spawn:["lk-start",2],
 finish:["lk-end",13],
 checkpoints:[["lk-court",1.2],["lk-ledge",1.2]],
 discovery:["lk-end",11],
 coins:[["lk-start",2,1.1],["lk-garden",2,1.1],["lk-court",2,1.1],["lk-stairs",2,1.1],["lk-ledge",2,1.1],["lk-overlook",2,1.1],["lk-end",2,1.1],["lk-start",5,1.1],["lk-end",12,1.1],["lk-bonus",0.8,0.85]],
 stars:[["lk-bonus",0.8,0.8],["lk-ledge",3,2.2],["lk-end",7.5,2.2]],
 edges:[["lk-start","lk-garden","WALK"],["lk-garden","lk-court","WALK"],["lk-court","lk-stairs","WALK"],["lk-stairs","lk-ledge","JUMP"],["lk-ledge","lk-overlook","JUMP"],["lk-overlook","lk-end","JUMP"],["lk-ledge","lk-bonus","JUMP",false],["lk-bonus","lk-overlook","DROP",false]],
 switches:[{"id":"lk-plate","platformId":"lk-garden","offset":2,"gateIds":["lk-gate"]}],
 gates:[{"id":"lk-gate","x":24,"y":0,"width":0.35,"height":2.2,"openSeconds":7}]
});
