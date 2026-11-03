import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.JOR;
const platforms=[
 platform("jo-canyon-entry",0,0,16,{"thickness":7,"terrain":"cave"}),
 platform("jo-passage",16,0,18,{"thickness":7,"terrain":"cave"}),
 platform("jo-stair",35.8,1.1,8,{"thickness":7,"terrain":"stairs"}),
 platform("jo-mechanism",45.6,2.2,13,{"thickness":7,"terrain":"terrace"}),
 platform("jo-gate-passage",58.6,2.2,13,{"thickness":7,"terrain":"cave"}),
 platform("jo-upper-canyon",73.4,3.3,7,{"thickness":7,"terrain":"cliff"}),
 platform("jo-facade-view",82.2,4.4,17,{"thickness":7,"terrain":"terrace"}),
 platform("jo-bonus",43.9,2.5,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"JOR",
 iso2:"JO",
 title:place.title,
 environmentId:"west-asia-jo",
 tier:4,
 design:{"archetype":"narrow-siq-switch-passage-to-facade-view","signatureMechanic":"narrow-sandstone-passage-and-switch-gate","mechanics":["gate"],"terrain":["cave","stairs","terrace","cliff","rock"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":71,"seed":9107},
 environment:{"biome":"desert","locationReference":"Petra","terrainMaterial":"petra-siq","vegetationPack":"petra-siq","architecturePack":"petra-siq","landmarkAssets":["Petra"],"lightingPreset":"petra-siq","skyPreset":"petra-siq"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":45.6},{"id":"C","label":"Discovery viewpoint","x":82.2}],
 spawn:["jo-canyon-entry",2],
 finish:["jo-facade-view",15],
 checkpoints:[["jo-stair",1.2],["jo-gate-passage",1.2]],
 discovery:["jo-facade-view",13],
 coins:[["jo-canyon-entry",2,1.1],["jo-passage",2,1.1],["jo-stair",2,1.1],["jo-mechanism",2,1.1],["jo-gate-passage",2,1.1],["jo-upper-canyon",2,1.1],["jo-facade-view",2,1.1],["jo-canyon-entry",5,1.1],["jo-facade-view",14,1.1],["jo-bonus",0.8,0.85]],
 stars:[["jo-bonus",0.8,0.8],["jo-upper-canyon",3,2.2],["jo-facade-view",8.5,2.2]],
 edges:[["jo-canyon-entry","jo-passage","WALK"],["jo-passage","jo-stair","JUMP"],["jo-stair","jo-mechanism","JUMP"],["jo-mechanism","jo-gate-passage","WALK"],["jo-gate-passage","jo-upper-canyon","JUMP"],["jo-upper-canyon","jo-facade-view","JUMP"],["jo-stair","jo-bonus","JUMP",false],["jo-bonus","jo-mechanism","DROP",false]],
 switches:[{"id":"jo-plate","platformId":"jo-mechanism","offset":5,"gateIds":["jo-gate"]}],
 gates:[{"id":"jo-gate","x":64,"y":2.2,"width":0.35,"height":2.2,"openSeconds":7}]
});
