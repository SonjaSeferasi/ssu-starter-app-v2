import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.NPL;
const platforms=[
 platform("np-start",0,0,13,{"thickness":7,"terrain":"stairs","slope":0.8,"steps":4}),
 platform("np-ledge",14.8,2.05,6,{"thickness":7,"terrain":"cliff"}),
 platform("np-snow",22.6,3.3,6,{"thickness":7,"terrain":"cliff"}),
 platform("np-bridge",30.4,4.55,14,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge"}),
 platform("np-face",44.4,8.2,3.6,{"thickness":7,"terrain":"climb-wall","climbable":true}),
 platform("np-ridge",49.8,8.9,8.4,{"thickness":7,"terrain":"cliff"}),
 platform("np-descent",58.2,6.5,12,{"thickness":7,"terrain":"cliff"}),
 platform("np-end",72,6.8,15,{"thickness":7,"terrain":"cliff"}),
 platform("np-bonus",28.7,4.8,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'NPL',iso2:'NP',title:place.title,environmentId:'south-asia-np',tier:5,
 design:{archetype:'snowy-suspension-and-granite-ascent',signatureMechanic:place.signature,mechanics:["climbing"],terrain:["stairs", "cliff", "bridge", "climb-wall", "rock"],verticality:'high',enemyProfile:'none',targetDurationSeconds:70,seed:8106},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:44.4},{id:'C',label:'Discovery overlook',x:72}],
 platforms,
 spawn:["np-start",2],
 finish:["np-end",13],
 checkpoints:[["np-snow",1.2],["np-ridge",1.2]],
 discovery:["np-end",11],
 coins:[["np-start",2,1.1],["np-ledge",2,1.1],["np-snow",2,1.1],["np-bridge",2,1.1],["np-face",2,2.2],["np-ridge",2,1.1],["np-descent",2,1.1],["np-end",2,1.1],["np-start",5,1.1],["np-end",12,1.1],["np-bonus",0.8,0.85]],
 stars:[["np-bonus",0.8,0.8],["np-ridge",3,2.2],["np-end",7.5,2.2]],
 edges:[["np-start","np-ledge","JUMP"],["np-ledge","np-snow","JUMP"],["np-snow","np-bridge","JUMP"],["np-bridge","np-face","CLIMB"],["np-face","np-ridge","JUMP"],["np-ridge","np-descent","DROP"],["np-descent","np-end","JUMP"],["np-snow","np-bonus","JUMP",false],["np-bonus","np-bridge","JUMP",false]]
});
