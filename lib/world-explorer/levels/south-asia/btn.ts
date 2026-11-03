import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.BTN;
const platforms=[
 platform("bt-start",0,0,12,{"thickness":7}),
 platform("bt-steps",12,0,8,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("bt-cliff",21.8,2.45,5,{"thickness":7,"terrain":"cliff"}),
 platform("bt-ledge",28.6,3.7,5,{"thickness":7,"terrain":"cliff"}),
 platform("bt-lift",35.4,4.9,4,{"thickness":0.3,"motion":"vertical","amplitude":0.15,"period":8,"pause":0.8,"terrain":"mechanical","style":"mountain-lift"}),
 platform("bt-bridge",41.2,6.15,11,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge"}),
 platform("bt-rest",54,7.4,8,{"thickness":7,"terrain":"cliff"}),
 platform("bt-end",63.8,7.4,13,{"thickness":7,"terrain":"cliff"}),
 platform("bt-bonus",27,3.9,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'BTN',iso2:'BT',title:place.title,environmentId:'south-asia-bt',tier:5,
 design:{archetype:'forested-monastery-cliff-ascent',signatureMechanic:place.signature,mechanics:["vertical-platform"],terrain:["ground", "stairs", "cliff", "mechanical", "bridge", "rock"],verticality:'high',enemyProfile:'none',targetDurationSeconds:70,seed:8102},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:35.4},{id:'C',label:'Discovery overlook',x:63.8}],
 platforms,
 spawn:["bt-start",2],
 finish:["bt-end",11],
 checkpoints:[["bt-cliff",1.2],["bt-bridge",1.2]],
 discovery:["bt-end",9],
 coins:[["bt-start",2,1.1],["bt-steps",2,1.1],["bt-cliff",2,1.1],["bt-ledge",2,1.1],["bt-lift",2,1.1],["bt-bridge",2,1.1],["bt-rest",2,1.1],["bt-end",2,1.1],["bt-start",5,1.1],["bt-end",10,1.1],["bt-bonus",0.8,0.85]],
 stars:[["bt-bonus",0.8,0.8],["bt-bridge",3,2.2],["bt-end",6.5,2.2]],
 edges:[["bt-start","bt-steps","WALK"],["bt-steps","bt-cliff","JUMP"],["bt-cliff","bt-ledge","JUMP"],["bt-ledge","bt-lift","RIDE_PLATFORM"],["bt-lift","bt-bridge","JUMP"],["bt-bridge","bt-rest","JUMP"],["bt-rest","bt-end","JUMP"],["bt-cliff","bt-bonus","JUMP",false],["bt-bonus","bt-ledge","JUMP",false]]
});
