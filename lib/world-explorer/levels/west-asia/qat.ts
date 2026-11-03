import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.QAT;
const platforms=[
 platform("qa-corniche",0,0,22,{"thickness":7,"terrain":"terrace"}),
 platform("qa-raised-walk",23.8,0.7,12,{"thickness":0.8,"terrain":"mechanical"}),
 platform("qa-lift",37.6,0.9,6,{"thickness":0.3,"terrain":"mechanical","motion":"vertical","amplitude":0.25,"period":8,"pause":0.8}),
 platform("qa-roof",45.4,1.6,16,{"thickness":7,"terrain":"rooftop"}),
 platform("qa-garden-stairs",61.4,1.6,11,{"thickness":7,"terrain":"stairs","slope":0.9,"steps":4}),
 platform("qa-bay-view",74.2,3.2,19,{"thickness":7,"terrain":"terrace"}),
 platform("qa-bonus",35.9,2.0999999999999996,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"QAT",
 iso2:"QA",
 title:place.title,
 environmentId:"west-asia-qa",
 tier:2,
 design:{"archetype":"corniche-to-west-bay-elevated-service-deck","signatureMechanic":"elevated-walkway-and-west-bay-service-lift","mechanics":["vertical-platform"],"terrain":["terrace","mechanical","rooftop","stairs","rock"],"verticality":"medium","enemyProfile":"none","targetDurationSeconds":68,"seed":9111},
 environment:{"biome":"coastal","locationReference":"Doha Corniche","terrainMaterial":"doha-corniche","vegetationPack":"doha-corniche","architecturePack":"doha-corniche","landmarkAssets":["Doha Corniche"],"lightingPreset":"doha-corniche","skyPreset":"doha-corniche"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":45.4},{"id":"C","label":"Discovery viewpoint","x":74.2}],
 spawn:["qa-corniche",2],
 finish:["qa-bay-view",17],
 checkpoints:[["qa-raised-walk",1.2],["qa-roof",1.2]],
 discovery:["qa-bay-view",15],
 coins:[["qa-corniche",2,1.1],["qa-raised-walk",2,1.1],["qa-lift",2,1.1],["qa-roof",2,1.1],["qa-garden-stairs",2,1.1],["qa-bay-view",2,1.1],["qa-corniche",5,1.1],["qa-bay-view",16,1.1],["qa-bonus",0.8,0.85]],
 stars:[["qa-bonus",0.8,0.8],["qa-garden-stairs",3,2.2],["qa-bay-view",9.5,2.2]],
 edges:[["qa-corniche","qa-raised-walk","JUMP"],["qa-raised-walk","qa-lift","RIDE_PLATFORM"],["qa-lift","qa-roof","JUMP"],["qa-roof","qa-garden-stairs","WALK"],["qa-garden-stairs","qa-bay-view","JUMP"],["qa-raised-walk","qa-bonus","JUMP",false],["qa-bonus","qa-lift","DROP",false]]
});
