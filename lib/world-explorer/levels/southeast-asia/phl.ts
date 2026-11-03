import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.PHL;
const platforms=[
 platform("ph-start",0,0,13,{"thickness":7,"terrain":"terrace"}),
 platform("ph-terrace-one",14.8,1.1,9,{"thickness":7,"terrain":"terrace"}),
 platform("ph-terrace-two",25.6,2.2,8,{"thickness":7,"terrain":"terrace"}),
 platform("ph-channel",33.6,2.2,13,{"thickness":7,"terrain":"terrace"}),
 platform("ph-upper-field",48.4,3.3,9,{"thickness":7,"terrain":"terrace"}),
 platform("ph-path",57.4,3.3,10,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("ph-rest",69.2,4.8,8,{"thickness":7,"terrain":"terrace"}),
 platform("ph-end",79,5,13,{"thickness":7,"terrain":"terrace"}),
 platform("ph-bonus",24,2.5,1.6,{"thickness":0.15,"terrain":"terrace","route":"upper"})
];
export const level=authorLevel({
 code:'PHL',iso2:'PH',title:place.title,environmentId:'southeast-ph',tier:4,
 design:{archetype:'irrigated-rice-terrace-ascent',signatureMechanic:place.signature,mechanics:["gate"],terrain:["terrace", "stairs"],verticality:'high',enemyProfile:'none',targetDurationSeconds:65,seed:8106},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:48.4},{id:'C',label:'Discovery overlook',x:79}],
 platforms,
 spawn:["ph-start",2],
 finish:["ph-end",11],
 checkpoints:[["ph-terrace-two",1.2],["ph-path",1.2]],
 discovery:["ph-end",9],
 coins:[["ph-start",2,1.1],["ph-terrace-one",2,1.1],["ph-terrace-two",2,1.1],["ph-channel",2,1.1],["ph-upper-field",2,1.1],["ph-path",2,1.1],["ph-rest",2,1.1],["ph-end",2,1.1],["ph-start",5,1.1],["ph-end",10,1.1],["ph-bonus",0.8,0.85]],
 stars:[["ph-bonus",0.8,0.8],["ph-path",3,2.2],["ph-end",6.5,2.2]],
 edges:[["ph-start","ph-terrace-one","JUMP"],["ph-terrace-one","ph-terrace-two","JUMP"],["ph-terrace-two","ph-channel","WALK"],["ph-channel","ph-upper-field","JUMP"],["ph-upper-field","ph-path","WALK"],["ph-path","ph-rest","JUMP"],["ph-rest","ph-end","JUMP"],["ph-terrace-one","ph-bonus","JUMP",false],["ph-bonus","ph-terrace-two","JUMP",false]],
 switches:[{"id":"ph-plate","platformId":"ph-channel","offset":2,"gateIds":["ph-gate"]}],
 gates:[{"id":"ph-gate","x":43.5,"y":2.2,"width":0.35,"height":2.2,"openSeconds":7}]
});
