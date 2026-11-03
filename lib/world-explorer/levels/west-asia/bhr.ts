import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.BHR;
const platforms=[
 platform("bh-promenade",0,0,24,{"thickness":7,"terrain":"terrace"}),
 platform("bh-pier",24,0,15,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("bh-dock",40.4,0.45,7,{"thickness":0.6,"terrain":"water-raft","motion":"horizontal","amplitude":0.45,"period":9,"pause":1,"bob":0.08}),
 platform("bh-shore",48.8,0.5,17,{"thickness":7,"terrain":"sand"}),
 platform("bh-viewpoint",67.6,1,20,{"thickness":7,"terrain":"terrace"}),
 platform("bh-bonus",65.89999999999999,1.9,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"BHR",
 iso2:"BH",
 title:place.title,
 environmentId:"west-asia-bh",
 tier:1,
 design:{"archetype":"wide-coastal-wall-to-gentle-moving-dock","signatureMechanic":"gentle-dock-ride-and-safe-coastal-terrace","mechanics":["moving-platform"],"terrain":["terrace","bridge","water-raft","sand","rock"],"verticality":"low","enemyProfile":"none","targetDurationSeconds":65,"seed":9102},
 environment:{"biome":"coastal","locationReference":"Qalat al-Bahrain","terrainMaterial":"bahrain-harbour","vegetationPack":"bahrain-harbour","architecturePack":"bahrain-harbour","landmarkAssets":["Qalat al-Bahrain"],"lightingPreset":"bahrain-harbour","skyPreset":"bahrain-harbour"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":40.4},{"id":"C","label":"Discovery viewpoint","x":67.6}],
 spawn:["bh-promenade",2],
 finish:["bh-viewpoint",18],
 checkpoints:[["bh-pier",1.2],["bh-shore",1.2]],
 discovery:["bh-viewpoint",16],
 coins:[["bh-promenade",2,1.1],["bh-pier",2,1.1],["bh-dock",2,1.1],["bh-shore",2,1.1],["bh-viewpoint",2,1.1],["bh-promenade",5,1.1],["bh-viewpoint",17,1.1],["bh-bonus",0.8,0.85]],
 stars:[["bh-bonus",0.8,0.8],["bh-shore",3,2.2],["bh-viewpoint",10.0,2.2]],
 edges:[["bh-promenade","bh-pier","WALK"],["bh-pier","bh-dock","RIDE_PLATFORM"],["bh-dock","bh-shore","JUMP"],["bh-shore","bh-viewpoint","JUMP"],["bh-shore","bh-bonus","JUMP",false],["bh-bonus","bh-viewpoint","DROP",false]]
});
