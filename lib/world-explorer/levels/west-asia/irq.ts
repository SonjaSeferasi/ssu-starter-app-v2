import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.IRQ;
const platforms=[
 platform("iq-island",0,0,18,{"thickness":7,"terrain":"ground"}),
 platform("iq-walkway",18,0,14,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("iq-landing",33.8,0.7,12,{"thickness":0.7,"terrain":"water-raft","current":0.25}),
 platform("iq-reed-boat",47.6,0.8,7,{"thickness":0.6,"terrain":"water-raft","motion":"horizontal","amplitude":0.45,"period":9,"pause":1,"bob":0.08}),
 platform("iq-islet",56.4,1.5,14,{"thickness":7,"terrain":"ground"}),
 platform("iq-reed-walk",72.2,2.2,13,{"thickness":0.3,"terrain":"bridge","type":"wooden-bridge"}),
 platform("iq-station",87,2.9,18,{"thickness":7,"terrain":"terrace"}),
 platform("iq-bonus",70.5,2.9,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"IRQ",
 iso2:"IQ",
 title:place.title,
 environmentId:"west-asia-iq",
 tier:2,
 design:{"archetype":"reed-islands-boat-current-and-raised-walkway","signatureMechanic":"reed-boat-crossing-and-gentle-water-current","mechanics":["moving-platform"],"terrain":["ground","bridge","water-raft","terrace","rock"],"verticality":"medium","enemyProfile":"none","targetDurationSeconds":71,"seed":9105},
 environment:{"biome":"desert","locationReference":"Mesopotamian Marshes","terrainMaterial":"ahwar-reeds","vegetationPack":"ahwar-reeds","architecturePack":"ahwar-reeds","landmarkAssets":["Mesopotamian Marshes"],"lightingPreset":"ahwar-reeds","skyPreset":"ahwar-reeds"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":47.6},{"id":"C","label":"Discovery viewpoint","x":87}],
 spawn:["iq-island",2],
 finish:["iq-station",16],
 checkpoints:[["iq-landing",1.2],["iq-islet",1.2]],
 discovery:["iq-station",14],
 coins:[["iq-island",2,1.1],["iq-walkway",2,1.1],["iq-landing",2,1.1],["iq-reed-boat",2,1.1],["iq-islet",2,1.1],["iq-reed-walk",2,1.1],["iq-station",2,1.1],["iq-island",5,1.1],["iq-station",15,1.1],["iq-bonus",0.8,0.85]],
 stars:[["iq-bonus",0.8,0.8],["iq-reed-walk",3,2.2],["iq-station",9.0,2.2]],
 edges:[["iq-island","iq-walkway","WALK"],["iq-walkway","iq-landing","JUMP"],["iq-landing","iq-reed-boat","RIDE_PLATFORM"],["iq-reed-boat","iq-islet","JUMP"],["iq-islet","iq-reed-walk","JUMP"],["iq-reed-walk","iq-station","JUMP"],["iq-islet","iq-bonus","JUMP",false],["iq-bonus","iq-reed-walk","DROP",false]]
});
