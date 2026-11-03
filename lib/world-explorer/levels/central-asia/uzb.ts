import {authorLevel,platform} from '../author';
import {centralAsiaPlaces} from '../../central-asia';
const place=centralAsiaPlaces.UZB;
const platforms=[
 platform("uz-start",0,0,18,{"thickness":7,"terrain":"terrace"}),
 platform("uz-court",18,0,14,{"thickness":7,"terrain":"terrace"}),
 platform("uz-garden",33.8,0.75,10,{"thickness":7,"terrain":"terrace"}),
 platform("uz-lift",45.6,1,4,{"thickness":0.3,"terrain":"mechanical","motion":"vertical","amplitude":0.2,"period":7.5,"pause":0.8,"style":"tiled-service-lift"}),
 platform("uz-gallery",51.4,1.9,12,{"thickness":7,"terrain":"rooftop"}),
 platform("uz-walk",65.2,2.6,10,{"thickness":7,"terrain":"terrace"}),
 platform("uz-end",77,2.6,16,{"thickness":7,"terrain":"terrace"}),
 platform("uz-bonus",44,2.1,1.6,{"thickness":0.15,"terrain":"rooftop","route":"upper"})
];
export const level=authorLevel({
 code:'UZB',iso2:'UZ',title:place.title,environmentId:'central-asia-uz',tier:2,
 design:{archetype:'mosaic-courtyard-gate-and-raised-gallery',signatureMechanic:place.signature,mechanics:["vertical-platform", "gate"],terrain:["terrace", "mechanical", "rooftop"],verticality:'medium',enemyProfile:'none',targetDurationSeconds:55,seed:8104},
 environment:{biome:place.biome,locationReference:place.landmark,terrainMaterial:place.theme,vegetationPack:place.theme,architecturePack:place.theme,landmarkAssets:[place.landmark],lightingPreset:place.theme,skyPreset:place.theme},
 sections:[{id:'A',label:'Arrival',x:0},{id:'B',label:'Signature challenge',x:45.6},{id:'C',label:'Discovery overlook',x:77}],
 platforms,
 spawn:["uz-start",2],
 finish:["uz-end",14],
 checkpoints:[["uz-garden",1.2],["uz-gallery",1.2]],
 discovery:["uz-end",12],
 coins:[["uz-start",2,1.1],["uz-court",2,1.1],["uz-garden",2,1.1],["uz-lift",2,1.1],["uz-gallery",2,1.1],["uz-walk",2,1.1],["uz-end",2,1.1],["uz-start",5,1.1],["uz-end",13,1.1],["uz-bonus",0.8,0.85]],
 stars:[["uz-bonus",0.8,0.8],["uz-gallery",3,2.2],["uz-end",8.0,2.2]],
 edges:[["uz-start","uz-court","WALK"],["uz-court","uz-garden","JUMP"],["uz-garden","uz-lift","RIDE_PLATFORM"],["uz-lift","uz-gallery","JUMP"],["uz-gallery","uz-walk","JUMP"],["uz-walk","uz-end","JUMP"],["uz-garden","uz-bonus","JUMP",false],["uz-bonus","uz-lift","DROP",false]],
 switches:[{"id":"uz-plate","platformId":"uz-start","offset":11,"gateIds":["uz-gate"]}],
 gates:[{"id":"uz-gate","x":26,"y":0,"width":0.35,"height":2.2,"openSeconds":8}]
});
