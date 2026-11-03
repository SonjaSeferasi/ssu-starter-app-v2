import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.AFG;
const platforms=[
 platform("af-start",0,0,15,{"thickness":7}),
 platform("af-terrace",16.8,1.15,8,{"thickness":7,"terrain":"terrace"}),
 platform("af-shelf",26.6,2.3,6,{"thickness":7,"terrain":"rock"}),
 platform("af-bridge",34.4,3.45,13,{"thickness":0.5,"type":"bridge","terrain":"bridge"}),
 platform("af-overlook",49.2,4.6,8,{"thickness":7,"terrain":"terrace"}),
 platform("af-descent",57.2,4.6,10,{"thickness":7,"terrain":"slope","slope":-0.9}),
 platform("af-end",69,3.7,14,{"thickness":7}),
 platform("af-bonus",32.7,3.75,1.6,{"thickness":0.15,"terrain":"rock","route":"upper"})
];
export const level=authorLevel({
 code:'AFG',iso2:'AF',title:place.title,environmentId:'south-asia-af',tier:4,
 design:{archetype:'mineral-lake-valley-traverse',signatureMechanic:place.signature,mechanics:[],terrain:["ground", "terrace", "rock", "bridge", "slope"],verticality:'high',enemyProfile:'none',targetDurationSeconds:65,seed:8100},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:34.4},{id:'C',label:'Discovery overlook',x:69}],
 platforms,
 spawn:["af-start",2],
 finish:["af-end",12],
 checkpoints:[["af-shelf",1.2],["af-overlook",1.2]],
 discovery:["af-end",10],
 coins:[["af-start",2,1.1],["af-terrace",2,1.1],["af-shelf",2,1.1],["af-bridge",2,1.1],["af-overlook",2,1.1],["af-descent",2,1.1],["af-end",2,1.1],["af-start",5,1.1],["af-end",11,1.1],["af-bonus",0.8,0.85]],
 stars:[["af-bonus",0.8,0.8],["af-overlook",3,2.2],["af-end",7.0,2.2]],
 edges:[["af-start","af-terrace","JUMP"],["af-terrace","af-shelf","JUMP"],["af-shelf","af-bridge","JUMP"],["af-bridge","af-overlook","JUMP"],["af-overlook","af-descent","WALK"],["af-descent","af-end","JUMP"],["af-shelf","af-bonus","JUMP",false],["af-bonus","af-bridge","JUMP",false]]
});
