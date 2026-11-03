import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.KWT;
const platforms=[
 platform("kw-promenade",0,0,25,{"thickness":7,"terrain":"terrace"}),
 platform("kw-pier",26.4,0.5,14,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("kw-lift",41.8,0.5,6,{"thickness":0.3,"terrain":"mechanical","motion":"vertical","amplitude":0.25,"period":8,"pause":0.8}),
 platform("kw-garden",49.2,1,18,{"thickness":7,"terrain":"ground"}),
 platform("kw-deck",69,1.5,19,{"thickness":7,"terrain":"rooftop"}),
 platform("kw-end",88,1.5,16,{"thickness":7,"terrain":"terrace"}),
 platform("kw-bonus",67.3,2.4,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"KWT",
 iso2:"KW",
 title:place.title,
 environmentId:"west-asia-kw",
 tier:1,
 design:{"archetype":"open-promenade-pier-lift-observation-loop","signatureMechanic":"beginner-waterfront-lift-and-observation-deck","mechanics":["vertical-platform"],"terrain":["terrace","bridge","mechanical","ground","rooftop","rock"],"verticality":"low","enemyProfile":"none","targetDurationSeconds":68,"seed":9108},
 environment:{"biome":"coastal","locationReference":"Kuwait Towers","terrainMaterial":"kuwait-seafront","vegetationPack":"kuwait-seafront","architecturePack":"kuwait-seafront","landmarkAssets":["Kuwait Towers"],"lightingPreset":"kuwait-seafront","skyPreset":"kuwait-seafront"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":49.2},{"id":"C","label":"Discovery viewpoint","x":88}],
 spawn:["kw-promenade",2],
 finish:["kw-end",14],
 checkpoints:[["kw-garden",1.2],["kw-deck",1.2]],
 discovery:["kw-end",12],
 coins:[["kw-promenade",2,1.1],["kw-pier",2,1.1],["kw-lift",2,1.1],["kw-garden",2,1.1],["kw-deck",2,1.1],["kw-end",2,1.1],["kw-promenade",5,1.1],["kw-end",13,1.1],["kw-bonus",0.8,0.85]],
 stars:[["kw-bonus",0.8,0.8],["kw-deck",3,2.2],["kw-end",8.0,2.2]],
 edges:[["kw-promenade","kw-pier","JUMP"],["kw-pier","kw-lift","RIDE_PLATFORM"],["kw-lift","kw-garden","JUMP"],["kw-garden","kw-deck","JUMP"],["kw-deck","kw-end","WALK"],["kw-garden","kw-bonus","JUMP",false],["kw-bonus","kw-deck","DROP",false]]
});
