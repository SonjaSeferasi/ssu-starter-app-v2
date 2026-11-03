import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.IDN;
const platforms=[
 platform("id-start",0,0,19,{"thickness":7,"terrain":"sand"}),
 platform("id-ash",19,0,14,{"thickness":7,"terrain":"lava"}),
 platform("id-shelf",34.8,1.25,6,{"thickness":7,"terrain":"lava"}),
 platform("id-spur",42.6,2.5,5,{"thickness":7,"terrain":"lava"}),
 platform("id-rest",49.4,3.75,10,{"thickness":7,"terrain":"lava"}),
 platform("id-crumble",61.2,5,4,{"thickness":1,"terrain":"rock","collapse":{"delay":3.2,"respawn":5}}),
 platform("id-rim",67,6.2,8,{"thickness":7,"terrain":"lava"}),
 platform("id-down",75,3.3,10,{"thickness":7,"terrain":"lava"}),
 platform("id-end",86.8,3.3,13,{"thickness":7,"terrain":"lava"}),
 platform("id-bonus",41,2.65,1.6,{"thickness":0.15,"terrain":"lava","route":"upper"})
];
export const level=authorLevel({
 code:'IDN',iso2:'ID',title:place.title,environmentId:'southeast-id',tier:5,
 design:{archetype:'volcanic-plain-ridge-ascent',signatureMechanic:place.signature,mechanics:["hazards"],terrain:["sand", "lava", "rock"],verticality:'high',enemyProfile:'none',targetDurationSeconds:70,seed:8102},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:49.4},{id:'C',label:'Discovery overlook',x:86.8}],
 platforms,
 spawn:["id-start",2],
 finish:["id-end",11],
 checkpoints:[["id-spur",1.2],["id-rim",1.2]],
 discovery:["id-end",9],
 coins:[["id-start",2,1.1],["id-ash",2,1.1],["id-shelf",2,1.1],["id-spur",2,1.1],["id-rest",2,1.1],["id-crumble",2,1.1],["id-rim",2,1.1],["id-down",2,1.1],["id-end",2,1.1],["id-start",5,1.1],["id-end",10,1.1],["id-bonus",0.8,0.85]],
 stars:[["id-bonus",0.8,0.8],["id-rim",3,2.2],["id-end",6.5,2.2]],
 edges:[["id-start","id-ash","WALK"],["id-ash","id-shelf","JUMP"],["id-shelf","id-spur","JUMP"],["id-spur","id-rest","JUMP"],["id-rest","id-crumble","JUMP"],["id-crumble","id-rim","JUMP"],["id-rim","id-down","DROP"],["id-down","id-end","JUMP"],["id-shelf","id-bonus","JUMP",false],["id-bonus","id-spur","JUMP",false]],
 hazards:[{"id":"id-hazard-0","x":26,"y":0,"width":0.8,"height":2.4,"style":"steam","cycle":{"period":8,"warning":1.6,"active":1.5,"phase":0.4}}]
});
