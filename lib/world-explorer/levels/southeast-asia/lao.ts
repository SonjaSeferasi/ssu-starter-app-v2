import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.LAO;
const platforms=[
 platform("la-start",0,0,13,{"thickness":7}),
 platform("la-stream",13,0,12,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge"}),
 platform("la-pool",26.7,0.8,8,{"thickness":7,"terrain":"terrace"}),
 platform("la-terrace",34.7,0.8,9,{"thickness":7,"terrain":"stairs","slope":0.8,"steps":4}),
 platform("la-wheel",45.5,1.6,4,{"thickness":0.3,"motion":"vertical","amplitude":0.3,"period":7.2,"pause":0.8,"terrain":"mechanical","style":"water-wheel-lift"}),
 platform("la-upper",51.2,2.1,10,{"thickness":7,"terrain":"terrace"}),
 platform("la-end",63,2.2,14,{"thickness":7,"terrain":"terrace"}),
 platform("la-bonus",25.1,1.3,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'LAO',iso2:'LA',title:place.title,environmentId:'southeast-la',tier:2,
 design:{archetype:'waterfall-terrace-and-wheel',signatureMechanic:place.signature,mechanics:["vertical-platform"],terrain:["ground", "bridge", "terrace", "stairs", "mechanical", "rock"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:55,seed:8103},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:34.7},{id:'C',label:'Discovery overlook',x:63}],
 platforms,
 spawn:["la-start",2],
 finish:["la-end",12],
 checkpoints:[["la-pool",1.2],["la-upper",1.2]],
 discovery:["la-end",10],
 coins:[["la-start",2,1.1],["la-stream",2,1.1],["la-pool",2,1.1],["la-terrace",2,1.1],["la-wheel",2,1.1],["la-upper",2,1.1],["la-end",2,1.1],["la-start",5,1.1],["la-end",11,1.1],["la-bonus",0.8,0.85]],
 stars:[["la-bonus",0.8,0.8],["la-wheel",2.0,2.2],["la-end",7.0,2.2]],
 edges:[["la-start","la-stream","WALK"],["la-stream","la-pool","JUMP"],["la-pool","la-terrace","WALK"],["la-terrace","la-wheel","RIDE_PLATFORM"],["la-wheel","la-upper","JUMP"],["la-upper","la-end","JUMP"],["la-stream","la-bonus","JUMP",false],["la-bonus","la-pool","JUMP",false]]
});
