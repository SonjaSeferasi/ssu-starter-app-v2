import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.SYR;
const platforms=[
 platform("sy-oasis",0,0,20,{"thickness":7,"terrain":"sand"}),
 platform("sy-court",20,0,17,{"thickness":7,"terrain":"terrace"}),
 platform("sy-raised-stone",38.8,0.95,8,{"thickness":7,"terrain":"rock","raise":{"switchId":"sy-plate","drop":0.8,"seconds":18}}),
 platform("sy-colonnade-walk",48.6,1.9,14,{"thickness":7,"terrain":"rooftop"}),
 platform("sy-wind-passage",62.6,1.9,13,{"thickness":7,"terrain":"terrace"}),
 platform("sy-high-stone",77.4,2.85,9,{"thickness":7,"terrain":"rock"}),
 platform("sy-overlook",88.2,3.8,17,{"thickness":7,"terrain":"terrace"}),
 platform("sy-bonus",86.5,4.25,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"SYR",
 iso2:"SY",
 title:place.title,
 environmentId:"west-asia-sy",
 tier:3,
 design:{"archetype":"oasis-mechanism-raising-stone-and-wind-gallery","signatureMechanic":"fictional-stone-raising-mechanism-and-warned-wind","mechanics":["raise","wind"],"terrain":["sand","terrace","rock","rooftop"],"verticality":"medium","enemyProfile":"none","targetDurationSeconds":71,"seed":9113},
 environment:{"biome":"desert","locationReference":"Palmyra","terrainMaterial":"palmyra-oasis","vegetationPack":"palmyra-oasis","architecturePack":"palmyra-oasis","landmarkAssets":["Palmyra"],"lightingPreset":"palmyra-oasis","skyPreset":"palmyra-oasis"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":48.6},{"id":"C","label":"Discovery viewpoint","x":88.2}],
 spawn:["sy-oasis",2],
 finish:["sy-overlook",15],
 checkpoints:[["sy-colonnade-walk",1.2],["sy-wind-passage",1.2]],
 discovery:["sy-overlook",13],
 coins:[["sy-oasis",2,1.1],["sy-court",2,1.1],["sy-raised-stone",2,1.1],["sy-colonnade-walk",2,1.1],["sy-wind-passage",2,1.1],["sy-high-stone",2,1.1],["sy-overlook",2,1.1],["sy-oasis",5,1.1],["sy-overlook",14,1.1],["sy-bonus",0.8,0.85]],
 stars:[["sy-bonus",0.8,0.8],["sy-high-stone",3,2.2],["sy-overlook",8.5,2.2]],
 edges:[["sy-oasis","sy-court","WALK"],["sy-court","sy-raised-stone","JUMP"],["sy-raised-stone","sy-colonnade-walk","JUMP"],["sy-colonnade-walk","sy-wind-passage","WALK"],["sy-wind-passage","sy-high-stone","JUMP"],["sy-high-stone","sy-overlook","JUMP"],["sy-high-stone","sy-bonus","JUMP",false],["sy-bonus","sy-overlook","DROP",false]],
 switches:[{"id":"sy-plate","platformId":"sy-court","offset":8,"gateIds":[]}],
 zones:[{"id":"sy-wind","type":"wind","x":50,"width":34,"bottom":0,"top":10,"force":0.4,"period":9,"warning":1.6,"duration":1.8,"phase":0.5}]
});
