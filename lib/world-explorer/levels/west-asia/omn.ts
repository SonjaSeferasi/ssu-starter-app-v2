import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.OMN;
const platforms=[
 platform("om-dry-path",0,0,15,{"thickness":7,"terrain":"rock"}),
 platform("om-steps",15,0,9,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("om-climb",24,4.6,3.6,{"thickness":7,"terrain":"climb-wall","climbable":true}),
 platform("om-pool-bank",29.4,5.3,13,{"thickness":7,"terrain":"cliff"}),
 platform("om-sluice",44.2,6.55,7,{"thickness":7,"terrain":"rock","raise":{"switchId":"om-plate","drop":1,"seconds":18}}),
 platform("om-narrow-gorge",53,7.8,8,{"thickness":7,"terrain":"cave"}),
 platform("om-ridge",62.8,9.05,7,{"thickness":7,"terrain":"cliff"}),
 platform("om-view",71.6,10.3,18,{"thickness":7,"terrain":"terrace"}),
 platform("om-bonus",61.1,9.2,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"OMN",
 iso2:"OM",
 title:place.title,
 environmentId:"west-asia-om",
 tier:5,
 design:{"archetype":"limestone-climb-and-pool-sluice-crossing","signatureMechanic":"limestone-climb-and-switch-raised-pool-crossing","mechanics":["climb","raise"],"terrain":["rock","stairs","climb-wall","cliff","cave","terrace"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":74,"seed":9110},
 environment:{"biome":"desert","locationReference":"Wadi Shab","terrainMaterial":"wadi-shab","vegetationPack":"wadi-shab","architecturePack":"wadi-shab","landmarkAssets":["Wadi Shab"],"lightingPreset":"wadi-shab","skyPreset":"wadi-shab"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":44.2},{"id":"C","label":"Discovery viewpoint","x":71.6}],
 spawn:["om-dry-path",2],
 finish:["om-view",16],
 checkpoints:[["om-pool-bank",1.2],["om-narrow-gorge",1.2]],
 discovery:["om-view",14],
 coins:[["om-dry-path",2,1.1],["om-steps",2,1.1],["om-climb",2,2.2],["om-pool-bank",2,1.1],["om-sluice",2,1.1],["om-narrow-gorge",2,1.1],["om-ridge",2,1.1],["om-view",2,1.1],["om-dry-path",5,1.1],["om-view",15,1.1],["om-bonus",0.8,0.85]],
 stars:[["om-bonus",0.8,0.8],["om-ridge",3,2.2],["om-view",9.0,2.2]],
 edges:[["om-dry-path","om-steps","WALK"],["om-steps","om-climb","CLIMB"],["om-climb","om-pool-bank","JUMP"],["om-pool-bank","om-sluice","JUMP"],["om-sluice","om-narrow-gorge","JUMP"],["om-narrow-gorge","om-ridge","JUMP"],["om-ridge","om-view","JUMP"],["om-narrow-gorge","om-bonus","JUMP",false],["om-bonus","om-ridge","DROP",false]],
 waterBasins:[{id:"om-sluice-basin",platformId:"om-sluice",x:42.5,width:10.3,z:-1.5,depth:7,lowSurface:4.95,highSurface:5.95}],
 switches:[{"id":"om-plate","platformId":"om-pool-bank","offset":6,"gateIds":[]}]
});
