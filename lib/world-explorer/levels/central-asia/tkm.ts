import {authorLevel,platform} from '../author';
import {centralAsiaPlaces} from '../../central-asia';
const place=centralAsiaPlaces.TKM;
const platforms=[
 platform("tm-start",0,5,17,{"thickness":7,"terrain":"cliff"}),
 platform("tm-ramp",17,5,12,{"thickness":7,"terrain":"slope","slope":-1.5}),
 platform("tm-terrace",30.8,4.45,8,{"thickness":7,"terrain":"terrace"}),
 platform("tm-slide",40.6,4.7,5,{"thickness":1,"terrain":"rock","motion":"horizontal","amplitude":0.6,"period":8,"pause":0.8,"style":"mineral-slider"}),
 platform("tm-ledge",48.4,5.65,8,{"thickness":7,"terrain":"cliff"}),
 platform("tm-drop",60,2.7,13,{"thickness":7,"terrain":"terrace"}),
 platform("tm-end",74.8,3.65,15,{"thickness":7,"terrain":"terrace"}),
 platform("tm-bonus",56.5,7.25,3.2,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'TKM',iso2:'TM',title:place.title,environmentId:'central-asia-tm',tier:3,
 design:{archetype:'banded-mineral-rim-and-sliding-stone',signatureMechanic:place.signature,mechanics:["horizontal-platform"],terrain:["cliff", "slope", "terrace", "rock"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:60,seed:8103},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:40.6},{id:'C',label:'Discovery overlook',x:74.8}],
 platforms,
 spawn:["tm-start",2],
 finish:["tm-end",13],
 checkpoints:[["tm-terrace",1.2],["tm-ledge",1.2]],
 discovery:["tm-end",11],
 coins:[["tm-start",2,1.1],["tm-ramp",2,1.1],["tm-terrace",2,1.1],["tm-slide",2,1.1],["tm-ledge",2,1.1],["tm-drop",5,1.1],["tm-end",2,1.1],["tm-start",5,1.1],["tm-end",12,1.1],["tm-bonus",0.8,0.85]],
 stars:[["tm-bonus",0.8,0.8],["tm-ledge",3,2.2],["tm-end",7.5,2.2]],
 edges:[["tm-start","tm-ramp","WALK"],["tm-ramp","tm-terrace","JUMP"],["tm-terrace","tm-slide","RIDE_PLATFORM"],["tm-slide","tm-ledge","JUMP"],["tm-ledge","tm-drop","DROP"],["tm-drop","tm-end","JUMP"],["tm-ledge","tm-bonus","JUMP",false],["tm-bonus","tm-drop","DROP",false]]
});
