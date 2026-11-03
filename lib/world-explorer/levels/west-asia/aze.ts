import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.AZE;
const platforms=[
 platform("az-earth",0,0,19,{"thickness":7,"terrain":"sand"}),
 platform("az-rim",19,0,14,{"thickness":7,"terrain":"rock"}),
 platform("az-shelf",34.8,0.95,8,{"thickness":7,"terrain":"terrace"}),
 platform("az-warning",42.8,0.95,17,{"thickness":7,"terrain":"sand"}),
 platform("az-mineral",61.6,1.9,8,{"thickness":7,"terrain":"rock"}),
 platform("az-ridge",71.4,2.85,8,{"thickness":7,"terrain":"cliff"}),
 platform("az-overlook",81.2,3.8,16,{"thickness":7,"terrain":"terrace"}),
 platform("az-bonus",69.69999999999999,3.3,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"AZE",
 iso2:"AZ",
 title:place.title,
 environmentId:"west-asia-az",
 tier:3,
 design:{"archetype":"mud-field-waiting-and-high-mineral-return","signatureMechanic":"warned-mud-bursts-and-mineral-ledge-puzzle","mechanics":["hazards"],"terrain":["sand","rock","terrace","cliff"],"verticality":"medium","enemyProfile":"none","targetDurationSeconds":71,"seed":9101},
 environment:{"biome":"desert","locationReference":"Gobustan mud volcanoes","terrainMaterial":"gobustan-mud","vegetationPack":"gobustan-mud","architecturePack":"gobustan-mud","landmarkAssets":["Gobustan mud volcanoes"],"lightingPreset":"gobustan-mud","skyPreset":"gobustan-mud"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":42.8},{"id":"C","label":"Discovery viewpoint","x":81.2}],
 spawn:["az-earth",2],
 finish:["az-overlook",14],
 checkpoints:[["az-shelf",1.2],["az-mineral",1.2]],
 discovery:["az-overlook",12],
 coins:[["az-earth",2,1.1],["az-rim",2,1.1],["az-shelf",2,1.1],["az-warning",2,1.1],["az-mineral",2,1.1],["az-ridge",2,1.1],["az-overlook",2,1.1],["az-earth",5,1.1],["az-overlook",13,1.1],["az-bonus",0.8,0.85]],
 stars:[["az-bonus",0.8,0.8],["az-ridge",3,2.2],["az-overlook",8.0,2.2]],
 edges:[["az-earth","az-rim","WALK"],["az-rim","az-shelf","JUMP"],["az-shelf","az-warning","WALK"],["az-warning","az-mineral","JUMP"],["az-mineral","az-ridge","JUMP"],["az-ridge","az-overlook","JUMP"],["az-mineral","az-bonus","JUMP",false],["az-bonus","az-ridge","DROP",false]],
 hazards:[{"id":"az-hazard-0","x":50,"y":0.95,"width":0.75,"height":2.1,"style":"mud-burst","cycle":{"period":9,"warning":1.7,"active":1.6,"phase":0.4}}]
});
