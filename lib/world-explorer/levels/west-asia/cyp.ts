import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.CYP;
const platforms=[
 platform("cy-square",0,0,19,{"thickness":7,"terrain":"terrace"}),
 platform("cy-stairs",19,0,12,{"thickness":7,"terrain":"stairs","slope":1.2,"steps":5}),
 platform("cy-village",32.8,1.9,11,{"thickness":7,"terrain":"ground"}),
 platform("cy-lift",45.6,2.15,5,{"thickness":0.3,"terrain":"mechanical","motion":"vertical","amplitude":0.25,"period":8,"pause":0.8}),
 platform("cy-pine-trail",52.4,2.85,12,{"thickness":7,"terrain":"slope","slope":0.8}),
 platform("cy-balcony",66.2,4.35,9,{"thickness":7,"terrain":"rooftop"}),
 platform("cy-forest-view",77,5.05,16,{"thickness":7,"terrain":"ground"}),
 platform("cy-bonus",43.9,3.3,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"CYP",
 iso2:"CY",
 title:place.title,
 environmentId:"west-asia-cy",
 tier:2,
 design:{"archetype":"village-stairs-and-hillside-lift","signatureMechanic":"terraced-stairway-and-village-service-lift","mechanics":["vertical-platform"],"terrain":["terrace","stairs","ground","mechanical","slope","rooftop","rock"],"verticality":"medium","enemyProfile":"none","targetDurationSeconds":71,"seed":9103},
 environment:{"biome":"temperate","locationReference":"Troodos Mountains","terrainMaterial":"troodos-villages","vegetationPack":"troodos-villages","architecturePack":"troodos-villages","landmarkAssets":["Troodos Mountains"],"lightingPreset":"troodos-villages","skyPreset":"troodos-villages"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":45.6},{"id":"C","label":"Discovery viewpoint","x":77}],
 spawn:["cy-square",2],
 finish:["cy-forest-view",14],
 checkpoints:[["cy-village",1.2],["cy-pine-trail",1.2]],
 discovery:["cy-forest-view",12],
 coins:[["cy-square",2,1.1],["cy-stairs",2,1.1],["cy-village",2,1.1],["cy-lift",2,1.1],["cy-pine-trail",2,1.1],["cy-balcony",2,1.1],["cy-forest-view",2,1.1],["cy-square",5,1.1],["cy-forest-view",13,1.1],["cy-bonus",0.8,0.85]],
 stars:[["cy-bonus",0.8,0.8],["cy-balcony",3,2.2],["cy-forest-view",8.0,2.2]],
 edges:[["cy-square","cy-stairs","WALK"],["cy-stairs","cy-village","JUMP"],["cy-village","cy-lift","RIDE_PLATFORM"],["cy-lift","cy-pine-trail","JUMP"],["cy-pine-trail","cy-balcony","JUMP"],["cy-balcony","cy-forest-view","JUMP"],["cy-village","cy-bonus","JUMP",false],["cy-bonus","cy-lift","DROP",false]]
});
