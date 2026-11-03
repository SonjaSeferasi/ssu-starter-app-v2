import {authorLevel,platform} from '../author';
import {southAsiaPlaces} from '../../south-asia';
const place=southAsiaPlaces.IND;
const platforms=[
 platform("in-start",0,0,16,{"thickness":7,"terrain":"terrace"}),
 platform("in-bridge",16,0,10,{"thickness":0.5,"type":"bridge","terrain":"bridge"}),
 platform("in-court",27.8,0.7,12,{"thickness":7,"terrain":"terrace"}),
 platform("in-garden",41.6,1.45,8,{"thickness":7,"terrain":"terrace"}),
 platform("in-pavilion",51.4,1.4,5,{"thickness":0.3,"motion":"horizontal","amplitude":0.25,"period":7.5,"terrain":"mechanical","style":"garden-pavilion"}),
 platform("in-island",58.5,1.7,12,{"thickness":7,"terrain":"terrace"}),
 platform("in-end",72.2,1.7,16,{"thickness":7,"terrain":"terrace"}),
 platform("in-bonus",40,2,1.6,{"thickness":0.15,"terrain":"rooftop","route":"upper"})
];
export const level=authorLevel({
 code:'IND',iso2:'IN',title:place.title,environmentId:'south-asia-in',tier:2,
 design:{archetype:'symmetrical-water-garden-circuit',signatureMechanic:place.signature,mechanics:["horizontal-platform"],terrain:["terrace", "bridge", "mechanical", "rooftop"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:55,seed:8103},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:41.6},{id:'C',label:'Discovery overlook',x:72.2}],
 platforms,
 spawn:["in-start",2],
 finish:["in-end",14],
 checkpoints:[["in-court",1.2],["in-island",1.2]],
 discovery:["in-end",12],
 coins:[["in-start",2,1.1],["in-bridge",2,1.1],["in-court",2,1.1],["in-garden",2,1.1],["in-pavilion",2,1.1],["in-island",2,1.1],["in-end",2,1.1],["in-start",5,1.1],["in-end",13,1.1],["in-bonus",0.8,0.85]],
 stars:[["in-bonus",0.8,0.8],["in-pavilion",2.5,2.2],["in-end",8.0,2.2]],
 edges:[["in-start","in-bridge","WALK"],["in-bridge","in-court","JUMP"],["in-court","in-garden","JUMP"],["in-garden","in-pavilion","RIDE_PLATFORM"],["in-pavilion","in-island","JUMP"],["in-island","in-end","JUMP"],["in-court","in-bonus","JUMP",false],["in-bonus","in-garden","DROP",false]]
});
