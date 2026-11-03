import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.KHM;
const platforms=[
 platform("kh-start",0,0,15,{"thickness":7,"terrain":"arch"}),
 platform("kh-gallery",15,0,13,{"thickness":7,"terrain":"arch"}),
 platform("kh-court",28,0,12,{"thickness":7}),
 platform("kh-stairs",40,0,8,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("kh-wall",49.8,2.2,6,{"thickness":7,"terrain":"arch"}),
 platform("kh-garden",57.6,3.1,7,{"thickness":7}),
 platform("kh-end",66.4,3.3,13,{"thickness":7}),
 platform("kh-bonus",56,3.5,1.6,{"thickness":0.15,"terrain":"arch","route":"upper"})
];
export const level=authorLevel({
 code:'KHM',iso2:'KH',title:place.title,environmentId:'southeast-kh',tier:3,
 design:{archetype:'forest-courtyard-puzzle',signatureMechanic:place.signature,mechanics:["gate"],terrain:["arch", "ground", "stairs"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:60,seed:8101},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:40},{id:'C',label:'Discovery overlook',x:66.4}],
 platforms,
 spawn:["kh-start",2],
 finish:["kh-end",11],
 checkpoints:[["kh-court",1.2],["kh-wall",1.2]],
 discovery:["kh-end",9],
 coins:[["kh-start",2,1.1],["kh-gallery",2,1.1],["kh-court",2,1.1],["kh-stairs",2,1.1],["kh-wall",2,1.1],["kh-garden",2,1.1],["kh-end",2,1.1],["kh-start",5,1.1],["kh-end",10,1.1],["kh-bonus",0.8,0.85]],
 stars:[["kh-bonus",0.8,0.8],["kh-wall",3,2.2],["kh-end",6.5,2.2]],
 edges:[["kh-start","kh-gallery","WALK"],["kh-gallery","kh-court","WALK"],["kh-court","kh-stairs","WALK"],["kh-stairs","kh-wall","JUMP"],["kh-wall","kh-garden","JUMP"],["kh-garden","kh-end","JUMP"],["kh-wall","kh-bonus","JUMP",false],["kh-bonus","kh-garden","JUMP",false]],
 switches:[{"id":"kh-plate","platformId":"kh-start","offset":10,"gateIds":["kh-gate"]}],
 gates:[{"id":"kh-gate","x":24,"y":0,"width":0.35,"height":2.2,"openSeconds":7}]
});
