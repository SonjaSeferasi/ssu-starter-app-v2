import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.ARE;
const platforms=[
 platform("ae-waterfront",0,0,20,{"thickness":7,"terrain":"terrace"}),
 platform("ae-lift",21.8,0.3,6,{"thickness":0.3,"terrain":"mechanical","motion":"vertical","amplitude":0.25,"period":8,"pause":0.8}),
 platform("ae-garden",29.6,1.25,12,{"thickness":7,"terrain":"ground"}),
 platform("ae-moving-bridge-a",44,1.4,7,{"thickness":0.6,"terrain":"mechanical","motion":"horizontal","amplitude":0.45,"period":9,"pause":1,"bob":0.08,"style":"urban-moving-bridge"}),
 platform("ae-terrace",52.2,2.35,11,{"thickness":7,"terrain":"rooftop"}),
 platform("ae-moving-bridge-b",65,2.5,7,{"thickness":0.6,"terrain":"mechanical","motion":"horizontal","amplitude":0.45,"period":9,"pause":1,"bob":0.08,"style":"urban-moving-bridge","phase":2}),
 platform("ae-view",73.8,3.45,19,{"thickness":7,"terrain":"terrace"}),
 platform("ae-bonus",41.7,2.65,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"ARE",
 iso2:"AE",
 title:place.title,
 environmentId:"west-asia-ae",
 tier:3,
 design:{"archetype":"urban-lift-and-two-moving-garden-bridges","signatureMechanic":"maintenance-elevator-and-two-moving-garden-bridges","mechanics":["vertical-platform","moving-platform"],"terrain":["terrace","mechanical","ground","rooftop","rock"],"verticality":"medium","enemyProfile":"none","targetDurationSeconds":71,"seed":9115},
 environment:{"biome":"coastal","locationReference":"Downtown Dubai","terrainMaterial":"dubai-gardens","vegetationPack":"dubai-gardens","architecturePack":"dubai-gardens","landmarkAssets":["Downtown Dubai"],"lightingPreset":"dubai-gardens","skyPreset":"dubai-gardens"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":44},{"id":"C","label":"Discovery viewpoint","x":73.8}],
 spawn:["ae-waterfront",2],
 finish:["ae-view",17],
 checkpoints:[["ae-garden",1.2],["ae-terrace",1.2]],
 discovery:["ae-view",15],
 coins:[["ae-waterfront",2,1.1],["ae-lift",2,1.1],["ae-garden",2,1.1],["ae-moving-bridge-a",4.5,1.1],["ae-terrace",2,1.1],["ae-moving-bridge-b",2,1.1],["ae-view",2,1.1],["ae-waterfront",5,1.1],["ae-view",16,1.1],["ae-bonus",0.8,0.85]],
 stars:[["ae-bonus",0.8,0.8],["ae-moving-bridge-b",3,2.2],["ae-view",9.5,2.2]],
 edges:[["ae-waterfront","ae-lift","RIDE_PLATFORM"],["ae-lift","ae-garden","JUMP"],["ae-garden","ae-moving-bridge-a","RIDE_PLATFORM"],["ae-moving-bridge-a","ae-terrace","JUMP"],["ae-terrace","ae-moving-bridge-b","RIDE_PLATFORM"],["ae-moving-bridge-b","ae-view","JUMP"],["ae-garden","ae-bonus","JUMP",false],["ae-bonus","ae-moving-bridge-a","DROP",false]]
});
