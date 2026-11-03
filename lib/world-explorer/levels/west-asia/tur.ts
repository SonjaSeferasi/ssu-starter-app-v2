import {authorLevel,platform} from '../author';
import {westAsiaPlaces} from '../../west-asia';
const place=westAsiaPlaces.TUR;
const platforms=[
 platform("tr-valley",0,0,17,{"thickness":7,"terrain":"ground"}),
 platform("tr-tuff",18.8,1.1,9,{"thickness":7,"terrain":"rock"}),
 platform("tr-cave",29.6,2.2,14,{"thickness":7,"terrain":"cave"}),
 platform("tr-lift",45.4,2.45,5,{"thickness":0.3,"terrain":"mechanical","motion":"vertical","amplitude":0.25,"period":8,"pause":0.8,"style":"cave-service-lift"}),
 platform("tr-upper-cave",52.2,3.55,17,{"thickness":7,"terrain":"cave"}),
 platform("tr-chimney-trail",71,4.65,8,{"thickness":7,"terrain":"cliff"}),
 platform("tr-overlook",80.8,5.75,18,{"thickness":7,"terrain":"terrace"}),
 platform("tr-bonus",27.900000000000002,2.5,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 platforms,
 code:"TUR",
 iso2:"TR",
 title:place.title,
 environmentId:"west-asia-tr",
 tier:4,
 design:{"archetype":"fairy-chimney-valley-cave-lift-and-passage-gate","signatureMechanic":"cave-service-lift-and-fairy-chimney-upper-path","mechanics":["vertical-platform","gate"],"terrain":["ground","rock","cave","mechanical","cliff","terrace"],"verticality":"high","enemyProfile":"none","targetDurationSeconds":71,"seed":9114},
 environment:{"biome":"temperate","locationReference":"Cappadocia","terrainMaterial":"cappadocia-tuff","vegetationPack":"cappadocia-tuff","architecturePack":"cappadocia-tuff","landmarkAssets":["Cappadocia"],"lightingPreset":"cappadocia-tuff","skyPreset":"cappadocia-tuff"},
 sections:[{"id":"A","label":"Arrival","x":0},{"id":"B","label":"Country challenge","x":45.4},{"id":"C","label":"Discovery viewpoint","x":80.8}],
 spawn:["tr-valley",2],
 finish:["tr-overlook",16],
 checkpoints:[["tr-cave",1.2],["tr-upper-cave",1.2]],
 discovery:["tr-overlook",14],
 coins:[["tr-valley",2,1.1],["tr-tuff",2,1.1],["tr-cave",2,1.1],["tr-lift",2,1.1],["tr-upper-cave",2,1.1],["tr-chimney-trail",2,1.1],["tr-overlook",2,1.1],["tr-valley",5,1.1],["tr-overlook",15,1.1],["tr-bonus",0.8,0.85]],
 stars:[["tr-bonus",0.8,0.8],["tr-chimney-trail",3,2.2],["tr-overlook",9.0,2.2]],
 edges:[["tr-valley","tr-tuff","JUMP"],["tr-tuff","tr-cave","JUMP"],["tr-cave","tr-lift","RIDE_PLATFORM"],["tr-lift","tr-upper-cave","JUMP"],["tr-upper-cave","tr-chimney-trail","JUMP"],["tr-chimney-trail","tr-overlook","JUMP"],["tr-tuff","tr-bonus","JUMP",false],["tr-bonus","tr-cave","DROP",false]],
 switches:[{"id":"tr-plate","platformId":"tr-upper-cave","offset":3,"gateIds":["tr-gate"]}],
 gates:[{"id":"tr-gate","x":61,"y":3.55,"width":0.35,"height":2.2,"openSeconds":6.5}]
});
