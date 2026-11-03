import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.IRN;
const platforms=[
 platform("ir-start",0,0,18,{"thickness":7,"terrain":"ground"}),
 platform("ir-steps",18,0,8,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("ir-roof",27.8,2.15,9,{"thickness":7,"terrain":"rooftop"}),
 platform("ir-lift",38.6,3.3,4,{"thickness":0.3,"motion":"vertical","amplitude":0.2,"period":8,"pause":0.8,"terrain":"mechanical","style":"rooftop-lift"}),
 platform("ir-terrace",44.4,4.45,11,{"thickness":7,"terrain":"rooftop"}),
 platform("ir-court",55.4,2.45,14,{"thickness":7,"terrain":"arch"}),
 platform("ir-end",71.2,2.7,15,{"thickness":7,"terrain":"rooftop"}),
 platform("ir-bonus",37,3.8,1.6,{"thickness":0.15,"terrain":"rooftop","route":"upper"})
];
export const level=authorLevel({
 code:'IRN',iso2:'IR',title:place.title,environmentId:'south-asia-ir',tier:3,
 design:{archetype:'earthen-rooftop-airflow-courtyard',signatureMechanic:place.signature,mechanics:["vertical-platform", "wind"],terrain:["ground", "stairs", "rooftop", "mechanical", "arch"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:60,seed:8104},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:38.6},{id:'C',label:'Discovery overlook',x:71.2}],
 platforms,
 spawn:["ir-start",2],
 finish:["ir-end",13],
 checkpoints:[["ir-roof",1.2],["ir-terrace",1.2]],
 discovery:["ir-end",11],
 coins:[["ir-start",2,1.1],["ir-steps",2,1.1],["ir-roof",2,1.1],["ir-lift",2,1.1],["ir-terrace",2,1.1],["ir-court",2,1.1],["ir-end",2,1.1],["ir-start",5,1.1],["ir-end",12,1.1],["ir-bonus",0.8,0.85]],
 stars:[["ir-bonus",0.8,0.8],["ir-terrace",3,2.2],["ir-end",7.5,2.2]],
 edges:[["ir-start","ir-steps","WALK"],["ir-steps","ir-roof","JUMP"],["ir-roof","ir-lift","RIDE_PLATFORM"],["ir-lift","ir-terrace","JUMP"],["ir-terrace","ir-court","DROP"],["ir-court","ir-end","JUMP"],["ir-roof","ir-bonus","JUMP",false],["ir-bonus","ir-lift","JUMP",false]],
 zones:[{"id":"ir-ridge-wind","type":"wind","x":30,"width":22,"bottom":0,"top":10,"force":0.6,"period":9,"warning":1.6,"duration":1.8,"phase":0.5}]
});
