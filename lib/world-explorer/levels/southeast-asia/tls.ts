import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.TLS;
const platforms=[
 platform("tl-start",0,0,18,{"thickness":7,"terrain":"sand"}),
 platform("tl-pier",18,0,12,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge","sagDepth":0.06}),
 platform("tl-dock",31.6,0,6,{"thickness":0.3,"motion":"vertical","amplitude":0.08,"period":6,"terrain":"water-raft","type":"wooden-moving","style":"floating-dock"}),
 platform("tl-beach",39.2,0.2,14,{"thickness":7,"terrain":"sand"}),
 platform("tl-rock",54.9,0.5,8,{"thickness":7,"terrain":"rock"}),
 platform("tl-end",64.5,0.4,18,{"thickness":7,"terrain":"sand"}),
 platform("tl-bonus",53.2,1.4,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'TLS',iso2:'TL',title:place.title,environmentId:'southeast-tl',tier:1,
 design:{archetype:'low-coastal-pier-exploration',signatureMechanic:place.signature,mechanics:["vertical-platform"],terrain:["sand", "bridge", "water-raft", "rock"],verticality:'low',enemyProfile:'none',targetDurationSeconds:50,seed:8109},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:39.2},{id:'C',label:'Discovery overlook',x:64.5}],
 platforms,
 spawn:["tl-start",2],
 finish:["tl-end",16],
 checkpoints:[["tl-pier",1.2],["tl-beach",1.2]],
 discovery:["tl-end",14],
 coins:[["tl-start",2,1.1],["tl-pier",2,1.1],["tl-dock",2,1.1],["tl-beach",2,1.1],["tl-rock",2,1.1],["tl-end",2,1.1],["tl-start",5,1.1],["tl-end",15,1.1],["tl-bonus",0.8,0.85]],
 stars:[["tl-bonus",0.8,0.8],["tl-beach",3,2.2],["tl-end",9.0,2.2]],
 edges:[["tl-start","tl-pier","WALK"],["tl-pier","tl-dock","RIDE_PLATFORM"],["tl-dock","tl-beach","JUMP"],["tl-beach","tl-rock","JUMP"],["tl-rock","tl-end","JUMP"],["tl-beach","tl-bonus","JUMP",false],["tl-bonus","tl-rock","DROP",false]]
});
