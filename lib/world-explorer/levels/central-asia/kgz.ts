import {authorLevel,platform} from '../author';
import {centralAsiaPlaces} from '../../central-asia';
const place=centralAsiaPlaces.KGZ;
const platforms=[
 platform("kg-start",0,0,15,{"thickness":7}),
 platform("kg-bridge",15,0,13,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("kg-shelf",29.8,1.1,8,{"thickness":7,"terrain":"rock"}),
 platform("kg-forest",39.6,2.2,8,{"thickness":7,"terrain":"ground"}),
 platform("kg-steps",47.6,2.2,9,{"thickness":7,"terrain":"stairs","slope":0.9,"steps":4}),
 platform("kg-ridge",58.4,4.2,7,{"thickness":7,"terrain":"cliff"}),
 platform("kg-snow",68,5.3,10,{"thickness":7,"terrain":"cliff"}),
 platform("kg-end",79.8,5.3,15,{"thickness":7,"terrain":"cliff"}),
 platform("kg-bonus",65.5,5.35,2.2,{"thickness":0.15,"terrain":"ice-shelf","surface":"ice","route":"upper"})
];
export const level=authorLevel({
 code:'KGZ',iso2:'KG',title:place.title,environmentId:'central-asia-kg',tier:4,
 design:{archetype:'green-gorge-to-optional-ice-ridge',signatureMechanic:place.signature,mechanics:[],terrain:["ground", "bridge", "rock", "stairs", "cliff", "ice-shelf"],verticality:'high',enemyProfile:'none',targetDurationSeconds:65,seed:8101},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:47.6},{id:'C',label:'Discovery overlook',x:79.8}],
 platforms,
 spawn:["kg-start",2],
 finish:["kg-end",13],
 checkpoints:[["kg-shelf",1.2],["kg-ridge",1.2]],
 discovery:["kg-end",11],
 coins:[["kg-start",2,1.1],["kg-bridge",2,1.1],["kg-shelf",2,1.1],["kg-forest",2,1.1],["kg-steps",2,1.1],["kg-ridge",2,1.1],["kg-snow",5,1.1],["kg-end",2,1.1],["kg-start",5,1.1],["kg-end",12,1.1],["kg-bonus",0.8,0.85]],
 stars:[["kg-bonus",0.8,0.8],["kg-ridge",3,2.2],["kg-end",7.5,2.2]],
 edges:[["kg-start","kg-bridge","WALK"],["kg-bridge","kg-shelf","JUMP"],["kg-shelf","kg-forest","JUMP"],["kg-forest","kg-steps","WALK"],["kg-steps","kg-ridge","JUMP"],["kg-ridge","kg-snow","JUMP"],["kg-snow","kg-end","JUMP"],["kg-ridge","kg-bonus","JUMP",false],["kg-bonus","kg-snow","JUMP",false]]
});
