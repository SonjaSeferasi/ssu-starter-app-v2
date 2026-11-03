import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.SAU;
const platforms=[
 platform("sa-valley",0,0,17,{"thickness":7,"terrain":"sand"}),
 platform("sa-steps",17,0,9,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("sa-climb",26,4.6,3.6,{"thickness":7,"terrain":"climb-wall","climbable":true}),
 platform("sa-light-court",31.4,5.3,17,{"thickness":7,"terrain":"cave"}),
 platform("sa-light-gate",48.4,5.3,12,{"thickness":7,"terrain":"cave"}),
 platform("sa-high-sandstone",62.2,6.55,7,{"thickness":7,"terrain":"cliff"}),
 platform("sa-upper-rim",71,7.8,7,{"thickness":7,"terrain":"cliff"}),
 platform("sa-panorama",79.8,9.05,18,{"thickness":7,"terrain":"terrace"}),
 platform("sa-bonus",69.3,7.949999999999999,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"SAU",
 iso2:"SA",
 title:place.title,
 environmentId:"west-asia-sa",
 tier:5,
 design:{"archetype":"sandstone-light-switch-ascent","signatureMechanic":"sandstone-ascent-and-light-marked-switch-puzzle","mechanics":["climb","gate"],"terrain":["sand","stairs","climb-wall","cave","cliff","terrace","rock"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":74,"seed":9112},
 environment:{"biome":"desert","locationReference":"AlUla and Hegra","terrainMaterial":"alula-sandstone","vegetationPack":"alula-sandstone","architecturePack":"alula-sandstone","landmarkAssets":["AlUla and Hegra"],"lightingPreset":"alula-sandstone","skyPreset":"alula-sandstone"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":48.4},{"id":"C","label":"Discovery viewpoint","x":79.8}],
 spawn:["sa-valley",2],
 finish:["sa-panorama",16],
 checkpoints:[["sa-light-court",1.2],["sa-high-sandstone",1.2]],
 discovery:["sa-panorama",14],
 coins:[["sa-valley",2,1.1],["sa-steps",2,1.1],["sa-climb",2,2.2],["sa-light-court",2,1.1],["sa-light-gate",2,1.1],["sa-high-sandstone",2,1.1],["sa-upper-rim",2,1.1],["sa-panorama",2,1.1],["sa-valley",5,1.1],["sa-panorama",15,1.1],["sa-bonus",0.8,0.85]],
 stars:[["sa-bonus",0.8,0.8],["sa-upper-rim",3,2.2],["sa-panorama",9.0,2.2]],
 edges:[["sa-valley","sa-steps","WALK"],["sa-steps","sa-climb","CLIMB"],["sa-climb","sa-light-court","JUMP"],["sa-light-court","sa-light-gate","WALK"],["sa-light-gate","sa-high-sandstone","JUMP"],["sa-high-sandstone","sa-upper-rim","JUMP"],["sa-upper-rim","sa-panorama","JUMP"],["sa-high-sandstone","sa-bonus","JUMP",false],["sa-bonus","sa-upper-rim","DROP",false]],
 lightPuzzles:[{id:"sa-mirror",gateId:"sa-gate",platformId:"sa-light-court",offset:8,height:2.2,emitter:{x:33.4,y:10.5},receiver:{x:52.5,y:8.4,radius:.35},normals:[[1,0],[-.1963,-.9805],[0,1]],initialIndex:0,chargeSeconds:.4,range:17}],
 switches:[{"id":"sa-plate","platformId":"sa-light-court","offset":8,"gateIds":[]}],
 gates:[{"id":"sa-gate","x":53,"y":5.3,"width":0.35,"height":2.2,"openSeconds":7.5}]
});
