import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.ARM;
const platforms=[
 platform("am-trail",0,4,15,{"thickness":7,"terrain":"ground"}),
 platform("am-descent",15,4,12,{"thickness":7,"terrain":"slope","slope":-2}),
 platform("am-bank",28.8,3.1,9,{"thickness":7,"terrain":"rock"}),
 platform("am-column-a",39.6,4.2,6,{"thickness":7,"terrain":"cliff"}),
 platform("am-column-b",47.4,5.3,6,{"thickness":7,"terrain":"cliff"}),
 platform("am-column-c",55.2,6.4,6,{"thickness":7,"terrain":"cliff"}),
 platform("am-overlook",63,7.5,15,{"thickness":7,"terrain":"terrace"}),
 platform("am-bonus",45.7,5.6,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"ARM",
 iso2:"AM",
 title:place.title,
 environmentId:"west-asia-am",
 tier:4,
 design:{"archetype":"basalt-organ-column-ascent","signatureMechanic":"hexagonal-column-trail-and-upper-organ-pipes","mechanics":[],"terrain":["ground","slope","rock","cliff","terrace"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":71,"seed":9100},
 environment:{"biome":"temperate","locationReference":"Garni Gorge","terrainMaterial":"garni-basalt","vegetationPack":"garni-basalt","architecturePack":"garni-basalt","landmarkAssets":["Garni Gorge"],"lightingPreset":"garni-basalt","skyPreset":"garni-basalt"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":39.6},{"id":"C","label":"Discovery viewpoint","x":63}],
 spawn:["am-trail",2],
 finish:["am-overlook",13],
 checkpoints:[["am-bank",1.2],["am-column-b",1.2]],
 discovery:["am-overlook",11],
 coins:[["am-trail",2,1.1],["am-descent",2,1.1],["am-bank",2,1.1],["am-column-a",2,1.1],["am-column-b",2,1.1],["am-column-c",2,1.1],["am-overlook",2,1.1],["am-trail",5,1.1],["am-overlook",12,1.1],["am-bonus",0.8,0.85]],
 stars:[["am-bonus",0.8,0.8],["am-column-c",3,2.2],["am-overlook",7.5,2.2]],
 edges:[["am-trail","am-descent","WALK"],["am-descent","am-bank","JUMP"],["am-bank","am-column-a","JUMP"],["am-column-a","am-column-b","JUMP"],["am-column-b","am-column-c","JUMP"],["am-column-c","am-overlook","JUMP"],["am-column-a","am-bonus","JUMP",false],["am-bonus","am-column-b","DROP",false]]
});
