import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.LBN;
const platforms=[
 platform("lb-forest",0,3.5,18,{"thickness":7,"terrain":"ground"}),
 platform("lb-bank-slope",18,3.5,12,{"thickness":7,"terrain":"slope","slope":-1.5}),
 platform("lb-stream-bridge",30,2,15,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("lb-rock",46.8,3.1,7,{"thickness":7,"terrain":"rock"}),
 platform("lb-cliff",55.6,4.2,7,{"thickness":7,"terrain":"cliff"}),
 platform("lb-rope-crossing",64.4,5.3,12,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("lb-overlook",78.2,6.4,17,{"thickness":7,"terrain":"cliff"}),
 platform("lb-bonus",53.9,4.5,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"LBN",
 iso2:"LB",
 title:place.title,
 environmentId:"west-asia-lb",
 tier:4,
 design:{"archetype":"forested-stream-to-rope-supported-cliff-trail","signatureMechanic":"rope-supported-valley-crossing-and-cliff-trail","mechanics":[],"terrain":["ground","slope","bridge","rock","cliff"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":71,"seed":9109},
 environment:{"biome":"temperate","locationReference":"Qadisha Valley","terrainMaterial":"qadisha-valley","vegetationPack":"qadisha-valley","architecturePack":"qadisha-valley","landmarkAssets":["Qadisha Valley"],"lightingPreset":"qadisha-valley","skyPreset":"qadisha-valley"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":46.8},{"id":"C","label":"Discovery viewpoint","x":78.2}],
 spawn:["lb-forest",2],
 finish:["lb-overlook",15],
 checkpoints:[["lb-stream-bridge",1.2],["lb-cliff",1.2]],
 discovery:["lb-overlook",13],
 coins:[["lb-forest",2,1.1],["lb-bank-slope",2,1.1],["lb-stream-bridge",2,1.1],["lb-rock",2,1.1],["lb-cliff",2,1.1],["lb-rope-crossing",2,1.1],["lb-overlook",2,1.1],["lb-forest",5,1.1],["lb-overlook",14,1.1],["lb-bonus",0.8,0.85]],
 stars:[["lb-bonus",0.8,0.8],["lb-rope-crossing",3,2.2],["lb-overlook",8.5,2.2]],
 edges:[["lb-forest","lb-bank-slope","WALK"],["lb-bank-slope","lb-stream-bridge","WALK"],["lb-stream-bridge","lb-rock","JUMP"],["lb-rock","lb-cliff","JUMP"],["lb-cliff","lb-rope-crossing","JUMP"],["lb-rope-crossing","lb-overlook","JUMP"],["lb-rock","lb-bonus","JUMP",false],["lb-bonus","lb-cliff","DROP",false]]
});
