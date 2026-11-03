import {authorLevel,platform} from '../author';
import {southeastAsiaPlaces} from '../../southeast-asia';
const place=southeastAsiaPlaces.SGP;
const platforms=[
 platform("sg-start",0,0,14,{"thickness":7,"terrain":"rooftop"}),
 platform("sg-plaza",14,0,9,{"thickness":7,"terrain":"stairs","slope":0.6,"steps":3}),
 platform("sg-elevator",24.8,0.9,4,{"thickness":0.3,"motion":"vertical","amplitude":0.3,"period":6.5,"pause":0.8,"terrain":"mechanical","style":"glass-lift"}),
 platform("sg-skywalk",30.4,1.6,12,{"thickness":0.6,"terrain":"rooftop"}),
 platform("sg-garden",44.2,2.4,9,{"thickness":7,"terrain":"rooftop"}),
 platform("sg-walkway",55,2.1,6,{"thickness":0.3,"motion":"horizontal","amplitude":0.3,"period":7,"pause":0.8,"terrain":"mechanical","style":"garden-walkway"}),
 platform("sg-waterfront",62.6,1.4,12,{"thickness":7,"terrain":"rooftop"}),
 platform("sg-end",76.4,1.4,12,{"thickness":7,"terrain":"rooftop"}),
 platform("sg-bonus",42.6,2.9,1.6,{"thickness":0.15,"terrain":"rooftop","route":"upper","style":"glass-observation"})
];
export const level=authorLevel({
 code:'SGP',iso2:'SG',title:place.title,environmentId:'southeast-sg',tier:2,
 design:{archetype:'garden-city-elevator-circuit',signatureMechanic:place.signature,mechanics:["vertical-platform", "horizontal-platform"],terrain:["rooftop", "stairs", "mechanical"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:55,seed:8107},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:44.2},{id:'C',label:'Discovery overlook',x:76.4}],
 platforms,
 spawn:["sg-start",2],
 finish:["sg-end",10],
 checkpoints:[["sg-skywalk",1.2],["sg-waterfront",1.2]],
 discovery:["sg-end",8],
 coins:[["sg-start",2,1.1],["sg-plaza",2,1.1],["sg-elevator",2,1.1],["sg-skywalk",2,1.1],["sg-garden",2,1.1],["sg-walkway",2,1.1],["sg-waterfront",2,1.1],["sg-end",2,1.1],["sg-start",5,1.1],["sg-end",9,1.1],["sg-bonus",0.8,0.85]],
 stars:[["sg-bonus",0.8,0.8],["sg-walkway",3,2.2],["sg-end",6.0,2.2]],
 edges:[["sg-start","sg-plaza","WALK"],["sg-plaza","sg-elevator","RIDE_PLATFORM"],["sg-elevator","sg-skywalk","JUMP"],["sg-skywalk","sg-garden","JUMP"],["sg-garden","sg-walkway","RIDE_PLATFORM"],["sg-walkway","sg-waterfront","JUMP"],["sg-waterfront","sg-end","JUMP"],["sg-skywalk","sg-bonus","JUMP",false],["sg-bonus","sg-garden","JUMP",false]]
});
