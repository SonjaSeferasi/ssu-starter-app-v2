import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.ISR;
const platforms=[
 platform("il-foothill",0,0,18,{"thickness":7,"terrain":"sand"}),
 platform("il-ramp",18,0,14,{"thickness":7,"terrain":"slope","slope":1}),
 platform("il-cliff-path",33.8,1.95,10,{"thickness":7,"terrain":"cliff"}),
 platform("il-shelter",43.8,1.95,13,{"thickness":7,"terrain":"rock"}),
 platform("il-wind-ledge",58.6,2.9,8,{"thickness":7,"terrain":"cliff"}),
 platform("il-upper-path",68.4,3.85,9,{"thickness":7,"terrain":"cliff"}),
 platform("il-plateau",79.2,4.8,18,{"thickness":7,"terrain":"terrace"}),
 platform("il-bonus",66.69999999999999,4.3,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"ISR",
 iso2:"IL",
 title:place.title,
 environmentId:"west-asia-il",
 tier:3,
 design:{"archetype":"foothill-to-wind-exposed-desert-plateau","signatureMechanic":"wind-exposed-trail-and-desert-overlook","mechanics":["wind"],"terrain":["sand","slope","cliff","rock","terrace"],"verticality":"medium","enemyProfile":"none","targetDurationSeconds":71,"seed":9106},
 environment:{"biome":"desert","locationReference":"Masada","terrainMaterial":"masada-plateau","vegetationPack":"masada-plateau","architecturePack":"masada-plateau","landmarkAssets":["Masada"],"lightingPreset":"masada-plateau","skyPreset":"masada-plateau"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":43.8},{"id":"C","label":"Discovery viewpoint","x":79.2}],
 spawn:["il-foothill",2],
 finish:["il-plateau",16],
 checkpoints:[["il-cliff-path",1.2],["il-wind-ledge",1.2]],
 discovery:["il-plateau",14],
 coins:[["il-foothill",2,1.1],["il-ramp",2,1.1],["il-cliff-path",2,1.1],["il-shelter",2,1.1],["il-wind-ledge",2,1.1],["il-upper-path",2,1.1],["il-plateau",2,1.1],["il-foothill",5,1.1],["il-plateau",15,1.1],["il-bonus",0.8,0.85]],
 stars:[["il-bonus",0.8,0.8],["il-upper-path",3,2.2],["il-plateau",9.0,2.2]],
 edges:[["il-foothill","il-ramp","WALK"],["il-ramp","il-cliff-path","JUMP"],["il-cliff-path","il-shelter","WALK"],["il-shelter","il-wind-ledge","JUMP"],["il-wind-ledge","il-upper-path","JUMP"],["il-upper-path","il-plateau","JUMP"],["il-wind-ledge","il-bonus","JUMP",false],["il-bonus","il-upper-path","DROP",false]],
 zones:[{"id":"il-wind","type":"wind","x":44,"width":35,"bottom":0,"top":12,"force":0.45,"period":9,"warning":1.6,"duration":1.8,"phase":0.5}]
});
