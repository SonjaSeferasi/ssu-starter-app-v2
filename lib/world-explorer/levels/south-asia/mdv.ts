import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.MDV;
const platforms=[
 platform("mv-start",0,0,20,{"thickness":1.2,"terrain":"sand"}),
 platform("mv-dock",20,0,10,{"thickness":0.25,"type":"wooden-bridge","terrain":"bridge"}),
 platform("mv-island",31.6,0.2,10,{"thickness":1.2,"terrain":"sand"}),
 platform("mv-float",44.2,0.2,6,{"thickness":0.3,"motion":"vertical","amplitude":0.1,"period":8,"terrain":"water-raft","type":"wooden-moving","style":"lagoon-dock"}),
 platform("mv-islet",52,0.5,12,{"thickness":1.2,"terrain":"sand"}),
 platform("mv-end",65.7,0.4,18,{"thickness":1.2,"terrain":"sand"}),
 platform("mv-bonus",41.7,1.4,1.6,{"thickness":0.15,"terrain":"sand","route":"upper"})
];
export const level=authorLevel({
 code:'MDV',iso2:'MV',title:place.title,environmentId:'south-asia-mv',tier:1,
 design:{archetype:'shallow-lagoon-sand-island-chain',signatureMechanic:place.signature,mechanics:["vertical-platform"],terrain:["sand", "bridge", "water-raft"],verticality:'low',enemyProfile:'none',targetDurationSeconds:50,seed:8105},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:44.2},{id:'C',label:'Discovery overlook',x:65.7}],
 platforms,
 spawn:["mv-start",2],
 finish:["mv-end",16],
 checkpoints:[["mv-dock",1.2],["mv-islet",1.2]],
 discovery:["mv-end",14],
 coins:[["mv-start",2,1.1],["mv-dock",2,1.1],["mv-island",2,1.1],["mv-float",2,1.1],["mv-islet",2,1.1],["mv-end",2,1.1],["mv-start",5,1.1],["mv-end",15,1.1],["mv-bonus",0.8,0.85]],
 stars:[["mv-bonus",0.8,0.8],["mv-float",3,2.2],["mv-end",9.0,2.2]],
 edges:[["mv-start","mv-dock","WALK"],["mv-dock","mv-island","JUMP"],["mv-island","mv-float","RIDE_PLATFORM"],["mv-float","mv-islet","JUMP"],["mv-islet","mv-end","JUMP"],["mv-island","mv-bonus","JUMP",false],["mv-bonus","mv-float","DROP",false]]
});
