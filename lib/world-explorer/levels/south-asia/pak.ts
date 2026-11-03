import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.PAK;
const platforms=[
 platform("pk-start",0,0,16,{"thickness":7}),
 platform("pk-bridge",16,0,18,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge"}),
 platform("pk-lift",36,0.5,4,{"thickness":1,"motion":"vertical","amplitude":0.3,"period":7,"terrain":"rock","style":"moving-rock"}),
 platform("pk-rock",42,2.05,7,{"thickness":7,"terrain":"cliff"}),
 platform("pk-peak",50.8,3.3,6,{"thickness":7,"terrain":"cliff"}),
 platform("pk-ledge",58.6,4.55,7,{"thickness":7,"terrain":"cliff"}),
 platform("pk-descent",65.6,1.7,13,{"thickness":7,"terrain":"cliff"}),
 platform("pk-end",80.4,1.7,16,{"thickness":7}),
 platform("pk-bonus",49.2,3.5,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'PAK',iso2:'PK',title:place.title,environmentId:'south-asia-pk',tier:5,
 design:{archetype:'long-river-bridge-and-moving-rock-ascent',signatureMechanic:place.signature,mechanics:["vertical-platform"],terrain:["ground", "bridge", "rock", "cliff"],verticality:'high',enemyProfile:'none',targetDurationSeconds:70,seed:8107},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:50.8},{id:'C',label:'Discovery overlook',x:80.4}],
 platforms,
 spawn:["pk-start",2],
 finish:["pk-end",14],
 checkpoints:[["pk-rock",1.2],["pk-ledge",1.2]],
 discovery:["pk-end",12],
 coins:[["pk-start",2,1.1],["pk-bridge",2,1.1],["pk-lift",2,1.1],["pk-rock",2,1.1],["pk-peak",2,1.1],["pk-ledge",2,1.1],["pk-descent",2,1.1],["pk-end",2,1.1],["pk-start",5,1.1],["pk-end",13,1.1],["pk-bonus",0.8,0.85]],
 stars:[["pk-bonus",0.8,0.8],["pk-ledge",3,2.2],["pk-end",8.0,2.2]],
 edges:[["pk-start","pk-bridge","WALK"],["pk-bridge","pk-lift","RIDE_PLATFORM"],["pk-lift","pk-rock","JUMP"],["pk-rock","pk-peak","JUMP"],["pk-peak","pk-ledge","JUMP"],["pk-ledge","pk-descent","DROP"],["pk-descent","pk-end","JUMP"],["pk-rock","pk-bonus","JUMP",false],["pk-bonus","pk-peak","JUMP",false]]
});
