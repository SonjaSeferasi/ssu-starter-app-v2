import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.THA;
const platforms=[
 platform("th-start",0,0,14,{"thickness":7,"terrain":"rock"}),
 platform("th-shore",14,0,13,{"thickness":7,"terrain":"rock"}),
 platform("th-boat",29.5,0.2,5,{"thickness":0.4,"motion":"horizontal","amplitude":0.5,"period":7.6,"pause":1,"terrain":"water-raft","type":"wooden-moving","style":"long-tail-boat"}),
 platform("th-islet",36.3,1.3,7,{"thickness":7,"terrain":"cliff"}),
 platform("th-shelf",45.1,2.4,6,{"thickness":7,"terrain":"cliff"}),
 platform("th-shelter",52.9,3.5,10,{"thickness":7,"terrain":"cliff"}),
 platform("th-end",64.7,3.8,13,{"thickness":7,"terrain":"rock"}),
 platform("th-bonus",51.3,3.8,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'THA',iso2:'TH',title:place.title,environmentId:'southeast-th',tier:4,
 design:{archetype:'tidal-karst-boat-chain',signatureMechanic:place.signature,mechanics:["horizontal-platform", "hazards"],terrain:["rock", "water-raft", "cliff"],verticality:'high',enemyProfile:'none',targetDurationSeconds:65,seed:8108},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:36.3},{id:'C',label:'Discovery overlook',x:64.7}],
 platforms,
 spawn:["th-start",2],
 finish:["th-end",11],
 checkpoints:[["th-islet",1.2],["th-shelf",1.2]],
 discovery:["th-end",9],
 coins:[["th-start",2,1.1],["th-shore",2,1.1],["th-boat",2,1.1],["th-islet",2,1.1],["th-shelf",2,1.1],["th-shelter",2,1.1],["th-end",2,1.1],["th-start",5,1.1],["th-end",10,1.1],["th-bonus",0.8,0.85]],
 stars:[["th-bonus",0.8,0.8],["th-shelf",3,2.2],["th-end",6.5,2.2]],
 edges:[["th-start","th-shore","WALK"],["th-shore","th-boat","RIDE_PLATFORM"],["th-boat","th-islet","JUMP"],["th-islet","th-shelf","JUMP"],["th-shelf","th-shelter","JUMP"],["th-shelter","th-end","JUMP"],["th-shelf","th-bonus","JUMP",false],["th-bonus","th-shelter","JUMP",false]],
 hazards:[{"id":"th-hazard-0","x":22,"y":0,"width":0.8,"height":2.2,"style":"wave","cycle":{"period":9,"warning":1.5,"active":1.6,"phase":0.4}}]
});
