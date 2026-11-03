import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.BRN;
const platforms=[
 platform("bn-start",0,0,12,{"thickness":7}),
 platform("bn-bridge",12,0,12,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge","sagDepth":0.12}),
 platform("bn-tower",24,0,7,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("bn-lift",32.6,1.5,4,{"thickness":0.3,"motion":"vertical","amplitude":0.3,"period":6,"pause":0.6,"terrain":"mechanical","style":"canopy-lift"}),
 platform("bn-rest",38.2,2,9,{"thickness":0.7,"terrain":"canopy"}),
 platform("bn-canopy",49,2.8,6,{"thickness":0.6,"terrain":"canopy"}),
 platform("bn-walk",56.8,2.8,10,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge"}),
 platform("bn-end",68.5,2.5,12,{"thickness":0.7,"terrain":"canopy"}),
 platform("bn-bonus",47.3,3.3,1.6,{"thickness":0.15,"terrain":"canopy","route":"upper"})
];
export const level=authorLevel({
 code:'BRN',iso2:'BN',title:place.title,environmentId:'southeast-bn',tier:2,
 design:{archetype:'canopy-research-traverse',signatureMechanic:place.signature,mechanics:["vertical-platform"],terrain:["ground", "bridge", "stairs", "mechanical", "canopy"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:55,seed:8100},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:38.2},{id:'C',label:'Discovery overlook',x:68.5}],
 platforms,
 spawn:["bn-start",2],
 finish:["bn-end",10],
 checkpoints:[["bn-tower",1.2],["bn-canopy",1.2]],
 discovery:["bn-end",8],
 coins:[["bn-start",2,1.1],["bn-bridge",2,1.1],["bn-tower",2,1.1],["bn-lift",2,1.1],["bn-rest",2,1.1],["bn-canopy",2,1.1],["bn-walk",2,1.1],["bn-end",2,1.1],["bn-start",5,1.1],["bn-end",9,1.1],["bn-bonus",0.8,0.85]],
 stars:[["bn-bonus",0.8,0.8],["bn-canopy",3,2.2],["bn-end",6.0,2.2]],
 edges:[["bn-start","bn-bridge","WALK"],["bn-bridge","bn-tower","WALK"],["bn-tower","bn-lift","RIDE_PLATFORM"],["bn-lift","bn-rest","JUMP"],["bn-rest","bn-canopy","JUMP"],["bn-canopy","bn-walk","JUMP"],["bn-walk","bn-end","JUMP"],["bn-rest","bn-bonus","JUMP",false],["bn-bonus","bn-canopy","JUMP",false]]
});
