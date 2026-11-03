import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.MMR;
const platforms=[
 platform("mm-start",0,0,15,{"thickness":7}),
 platform("mm-market",15,0,12,{"thickness":7}),
 platform("mm-steps",27,0,8,{"thickness":7,"terrain":"stairs","slope":0.9,"steps":4}),
 platform("mm-lift",36.8,1.1,4,{"thickness":0.3,"motion":"vertical","amplitude":0.45,"period":7.5,"pause":1,"terrain":"mechanical","style":"market-lift"}),
 platform("mm-gallery",42.5,2.4,12,{"thickness":7,"terrain":"arch"}),
 platform("mm-roof",56.3,3.35,6,{"thickness":7,"terrain":"arch"}),
 platform("mm-view",64.1,4.25,7,{"thickness":7,"terrain":"arch"}),
 platform("mm-end",72.9,4.5,12,{"thickness":7}),
 platform("mm-bonus",62.5,4.7,1.6,{"thickness":0.15,"terrain":"arch","route":"upper"})
];
export const level=authorLevel({
 code:'MMR',iso2:'MM',title:place.title,environmentId:'southeast-mm',tier:3,
 design:{archetype:'brick-market-lift-gallery',signatureMechanic:place.signature,mechanics:["vertical-platform", "gate"],terrain:["ground", "stairs", "mechanical", "arch"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:60,seed:8105},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:42.5},{id:'C',label:'Discovery overlook',x:72.9}],
 platforms,
 spawn:["mm-start",2],
 finish:["mm-end",10],
 checkpoints:[["mm-steps",1.2],["mm-roof",1.2]],
 discovery:["mm-end",8],
 coins:[["mm-start",2,1.1],["mm-market",2,1.1],["mm-steps",2,1.1],["mm-lift",2,1.1],["mm-gallery",2,1.1],["mm-roof",2,1.1],["mm-view",2,1.1],["mm-end",2,1.1],["mm-start",5,1.1],["mm-end",9,1.1],["mm-bonus",0.8,0.85]],
 stars:[["mm-bonus",0.8,0.8],["mm-roof",3,2.2],["mm-end",6.0,2.2]],
 edges:[["mm-start","mm-market","WALK"],["mm-market","mm-steps","WALK"],["mm-steps","mm-lift","RIDE_PLATFORM"],["mm-lift","mm-gallery","JUMP"],["mm-gallery","mm-roof","JUMP"],["mm-roof","mm-view","JUMP"],["mm-view","mm-end","JUMP"],["mm-roof","mm-bonus","JUMP",false],["mm-bonus","mm-view","JUMP",false]],
 switches:[{"id":"mm-plate","platformId":"mm-gallery","offset":1.5,"gateIds":["mm-gate"]}],
 gates:[{"id":"mm-gate","x":51.4,"y":2.4,"width":0.35,"height":2.2,"openSeconds":6}]
});
