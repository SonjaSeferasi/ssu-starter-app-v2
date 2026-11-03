import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.BGD;
const platforms=[
 platform("bd-start",0,0,18,{"thickness":7,"terrain":"ground"}),
 platform("bd-roots",18,0,10,{"thickness":7,"terrain":"stairs","slope":0.3,"steps":3}),
 platform("bd-boardwalk",28,0.3,14,{"thickness":0.3,"type":"wooden-bridge","terrain":"bridge"}),
 platform("bd-raft",43.6,0.3,6,{"thickness":0.3,"type":"wooden-moving","terrain":"water-raft","motion":"vertical","amplitude":0.08,"period":8,"style":"tidal-raft"}),
 platform("bd-bank",51.3,0.5,13,{"thickness":7,"terrain":"ground"}),
 platform("bd-end",67,0.6,18,{"thickness":0.6,"terrain":"canopy"}),
 platform("bd-bonus",64.4,1.25,2.2,{"thickness":0.15,"terrain":"canopy","route":"upper"})
];
export const level=authorLevel({
 code:'BGD',iso2:'BD',title:place.title,environmentId:'south-asia-bd',tier:1,
 design:{archetype:'tidal-mangrove-observation-trail',signatureMechanic:place.signature,mechanics:["vertical-platform"],terrain:["ground", "stairs", "bridge", "water-raft", "canopy"],verticality:'low',enemyProfile:'none',targetDurationSeconds:50,seed:8101},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:43.6},{id:'C',label:'Discovery overlook',x:67}],
 platforms,
 spawn:["bd-start",2],
 finish:["bd-end",16],
 checkpoints:[["bd-roots",1.2],["bd-bank",1.2]],
 discovery:["bd-end",14],
 coins:[["bd-start",2,1.1],["bd-roots",2,1.1],["bd-boardwalk",2,1.1],["bd-raft",2,1.1],["bd-bank",2,1.1],["bd-end",2,1.1],["bd-start",5,1.1],["bd-end",15,1.1],["bd-bonus",0.8,0.85]],
 stars:[["bd-bonus",0.8,0.8],["bd-raft",3,2.2],["bd-end",9.0,2.2]],
 edges:[["bd-start","bd-roots","WALK"],["bd-roots","bd-boardwalk","WALK"],["bd-boardwalk","bd-raft","RIDE_PLATFORM"],["bd-raft","bd-bank","JUMP"],["bd-bank","bd-end","JUMP"],["bd-bank","bd-bonus","JUMP",false],["bd-bonus","bd-end","DROP",false]]
});
