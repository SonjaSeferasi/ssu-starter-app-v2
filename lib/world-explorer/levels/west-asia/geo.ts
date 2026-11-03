import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.GEO;
const platforms=[
 platform("ge-village",0,0,14,{"thickness":7,"terrain":"ground"}),
 platform("ge-stairs",14,0,10,{"thickness":7,"terrain":"stairs","slope":1.5,"steps":6}),
 platform("ge-shelf",25.8,2.75,7,{"thickness":7,"terrain":"rock"}),
 platform("ge-high-trail",34.6,4,7,{"thickness":7,"terrain":"cliff"}),
 platform("ge-lift",43.4,5.25,5,{"thickness":0.3,"terrain":"mechanical","motion":"vertical","amplitude":0.25,"period":8,"pause":0.8,"type":"wooden-moving","style":"wooden-mountain-lift"}),
 platform("ge-upper-trail",50.2,6.25,8,{"thickness":7,"terrain":"rock"}),
 platform("ge-ridge",60,7.5,7,{"thickness":7,"terrain":"cliff"}),
 platform("ge-lookout",68.8,8.75,17,{"thickness":7,"terrain":"terrace"}),
 platform("ge-bonus",32.9,4.15,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"GEO",
 iso2:"GE",
 title:place.title,
 environmentId:"west-asia-ge",
 tier:5,
 design:{"archetype":"tower-village-steep-terraces-and-wood-lift","signatureMechanic":"steep-stone-terraces-and-wooden-mountain-lift","mechanics":["vertical-platform"],"terrain":["ground","stairs","rock","cliff","mechanical","terrace"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":74,"seed":9104},
 environment:{"biome":"alpine","locationReference":"Upper Svaneti","terrainMaterial":"svaneti-towers","vegetationPack":"svaneti-towers","architecturePack":"svaneti-towers","landmarkAssets":["Upper Svaneti"],"lightingPreset":"svaneti-towers","skyPreset":"svaneti-towers"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":43.4},{"id":"C","label":"Discovery viewpoint","x":68.8}],
 spawn:["ge-village",2],
 finish:["ge-lookout",15],
 checkpoints:[["ge-shelf",1.2],["ge-upper-trail",1.2]],
 discovery:["ge-lookout",13],
 coins:[["ge-village",2,1.1],["ge-stairs",2,1.1],["ge-shelf",2,1.1],["ge-high-trail",2,1.1],["ge-lift",2,1.1],["ge-upper-trail",2,1.1],["ge-ridge",2,1.1],["ge-lookout",2,1.1],["ge-village",5,1.1],["ge-lookout",14,1.1],["ge-bonus",0.8,0.85]],
 stars:[["ge-bonus",0.8,0.8],["ge-ridge",3,2.2],["ge-lookout",8.5,2.2]],
 edges:[["ge-village","ge-stairs","WALK"],["ge-stairs","ge-shelf","JUMP"],["ge-shelf","ge-high-trail","JUMP"],["ge-high-trail","ge-lift","RIDE_PLATFORM"],["ge-lift","ge-upper-trail","JUMP"],["ge-upper-trail","ge-ridge","JUMP"],["ge-ridge","ge-lookout","JUMP"],["ge-shelf","ge-bonus","JUMP",false],["ge-bonus","ge-high-trail","DROP",false]]
});
