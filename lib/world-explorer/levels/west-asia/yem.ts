import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.YEM;
const platforms=[
 platform("ye-highland",0,0,17,{"thickness":7,"terrain":"rock"}),
 platform("ye-slope",17,0,11,{"thickness":7,"terrain":"slope","slope":1.2}),
 platform("ye-ridge-a",29.8,2.45,7,{"thickness":7,"terrain":"cliff"}),
 platform("ye-ridge-b",38.6,3.7,7,{"thickness":7,"terrain":"cliff"}),
 platform("ye-plateau",47.4,4.95,10,{"thickness":7,"terrain":"terrace"}),
 platform("ye-descent",57.4,4.95,15,{"thickness":7,"terrain":"slope","slope":-2.5}),
 platform("ye-coastal-shelf",74.2,3.7,9,{"thickness":7,"terrain":"rock"}),
 platform("ye-coast-view",85,4.95,19,{"thickness":7,"terrain":"terrace"}),
 platform("ye-bonus",36.9,3.85,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"YEM",
 iso2:"YE",
 title:place.title,
 environmentId:"west-asia-ye",
 tier:5,
 design:{"archetype":"dragon-tree-highland-ridge-and-coastal-descent","signatureMechanic":"irregular-limestone-ridge-and-changing-wind","mechanics":["wind"],"terrain":["rock","slope","cliff","terrace"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":74,"seed":9116},
 environment:{"biome":"coastal","locationReference":"Socotra","terrainMaterial":"socotra-highlands","vegetationPack":"socotra-highlands","architecturePack":"socotra-highlands","landmarkAssets":["Socotra"],"lightingPreset":"socotra-highlands","skyPreset":"socotra-highlands"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":47.4},{"id":"C","label":"Discovery viewpoint","x":85}],
 spawn:["ye-highland",2],
 finish:["ye-coast-view",17],
 checkpoints:[["ye-ridge-a",1.2],["ye-descent",1.2]],
 discovery:["ye-coast-view",15],
 coins:[["ye-highland",2,1.1],["ye-slope",2,1.1],["ye-ridge-a",2,1.1],["ye-ridge-b",2,1.1],["ye-plateau",2,1.1],["ye-descent",2,1.1],["ye-coastal-shelf",2,1.1],["ye-coast-view",2,1.1],["ye-highland",5,1.1],["ye-coast-view",16,1.1],["ye-bonus",0.8,0.85]],
 stars:[["ye-bonus",0.8,0.8],["ye-coastal-shelf",3,2.2],["ye-coast-view",9.5,2.2]],
 edges:[["ye-highland","ye-slope","WALK"],["ye-slope","ye-ridge-a","JUMP"],["ye-ridge-a","ye-ridge-b","JUMP"],["ye-ridge-b","ye-plateau","JUMP"],["ye-plateau","ye-descent","WALK"],["ye-descent","ye-coastal-shelf","JUMP"],["ye-coastal-shelf","ye-coast-view","JUMP"],["ye-ridge-a","ye-bonus","JUMP",false],["ye-bonus","ye-ridge-b","DROP",false]],
 zones:[{"id":"ye-wind","type":"wind","x":29,"width":34,"bottom":0,"top":13,"force":0.5,"period":9,"warning":1.6,"duration":1.8,"phase":0.5}]
});
