import {authorLevel,platform} from '../author';
import {centralAsiaPlaces} from '../../central-asia';
const place=centralAsiaPlaces.KAZ;
const platforms=[
 platform("kz-start",0,5.2,16,{"thickness":7,"terrain":"cliff"}),
 platform("kz-descent",16,5.2,12,{"thickness":7,"terrain":"slope","slope":-2.1}),
 platform("kz-rest",29.8,3.85,9,{"thickness":7,"terrain":"cliff"}),
 platform("kz-bridge",40.6,3.85,12,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("kz-warn",52.6,3.85,16,{"thickness":7,"terrain":"cliff"}),
 platform("kz-drop",68.6,1.35,13,{"thickness":7,"terrain":"rock"}),
 platform("kz-terrace",83.4,2.05,8,{"thickness":7,"terrain":"terrace"}),
 platform("kz-end",93.2,2.05,15,{"thickness":7,"terrain":"rock"}),
 platform("kz-bonus",39,5.25,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'KAZ',iso2:'KZ',title:place.title,environmentId:'central-asia-kz',tier:2,
 design:{archetype:'canyon-overlook-to-valley-descent',signatureMechanic:place.signature,mechanics:["hazards"],terrain:["cliff", "slope", "bridge", "rock", "terrace"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:55,seed:8100},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:52.6},{id:'C',label:'Discovery overlook',x:93.2}],
 platforms,
 spawn:["kz-start",2],
 finish:["kz-end",13],
 checkpoints:[["kz-rest",1.2],["kz-drop",1.2]],
 discovery:["kz-end",11],
 coins:[["kz-start",2,1.1],["kz-descent",2,1.1],["kz-rest",2,1.1],["kz-bridge",2,1.1],["kz-warn",2,1.1],["kz-drop",2,1.1],["kz-terrace",2,1.1],["kz-end",2,1.1],["kz-start",5,1.1],["kz-end",12,1.1],["kz-bonus",0.8,0.85]],
 stars:[["kz-bonus",0.8,0.8],["kz-drop",3,2.2],["kz-end",7.5,2.2]],
 edges:[["kz-start","kz-descent","WALK"],["kz-descent","kz-rest","JUMP"],["kz-rest","kz-bridge","JUMP"],["kz-bridge","kz-warn","WALK"],["kz-warn","kz-drop","DROP"],["kz-drop","kz-terrace","JUMP"],["kz-terrace","kz-end","JUMP"],["kz-rest","kz-bonus","JUMP",false],["kz-bonus","kz-bridge","DROP",false]],
 hazards:[{"id":"kz-hazard-0","x":59,"y":3.85,"width":0.8,"height":2.4,"style":"rockfall","cycle":{"period":8,"warning":1.5,"active":1.5,"phase":0.4}}]
});
