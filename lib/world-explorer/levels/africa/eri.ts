import {africaLevel,platform,ledge} from './common';

const lift=(id:string,x:number,y:number,amplitude:number,period:number)=>platform(id,x,y,3,{type:'moving',motion:'vertical',amplitude,period,pause:1.1,terrain:'mechanical',thickness:.4,style:'art-deco-lift'});
/** Eritrea — Asmara: The Modernist City. Tier 3 (Challenger).
 * Along a palm boulevard of Art Deco blocks: lifts climb the towers, rows
 * of cantilevered balconies are hopped, a cinema canopy and a sliding
 * shop sign cross the street, and the run ends on the great concrete wings
 * of the Fiat Tagliero service station. A café awning below the first
 * balconies holds a star. */
export const level=africaLevel('ERI',{
 design:{archetype:'modernist-boulevard-tower-lifts',signatureMechanic:'art-deco-lifts-and-cantilever-balconies',mechanics:['tower-lifts','cantilever-balcony-hops','sliding-shop-sign','cinema-canopy','service-station-wings'],terrain:['ground','mechanical','rooftop'],verticality:'high',enemyProfile:'none',targetDurationSeconds:58,seed:2026444},
 environment:{biome:'eritrean-highland-city',locationReference:'Harnet Avenue and the Fiat Tagliero, Asmara, Eritrea',terrainMaterial:'rendered-concrete-and-terrazzo',vegetationPack:'palms-bougainvillea-and-jacaranda',architecturePack:'art-deco-modernist-blocks',landmarkAssets:['fiat-tagliero','art-deco-blocks','cinema-impero','palm-boulevard','highland-hills'],lightingPreset:'clear-highland-light',skyPreset:'highland-blue'},
 sections:[{id:'A',label:'Palm boulevard',x:0},{id:'B',label:'First lift',x:10},{id:'C',label:'Balconies',x:16},{id:'D',label:'Cinema canopy',x:34},{id:'E',label:'Shop sign',x:44},{id:'F',label:'Second lift',x:56},{id:'G',label:'Roof terrace',x:63},{id:'H',label:'Fiat Tagliero wings',x:80}],
 platforms:[
  platform('er-boulevard',-6,0,15,{style:'palm-boulevard'}),
  lift('er-lift-1',10.4,1.2,1.6,7),
  platform('er-balcony-1',16.4,3.2,3,{terrain:'rooftop',thickness:.5,style:'cantilever-balcony'}),
  platform('er-balcony-2',22.4,3.6,3,{terrain:'rooftop',thickness:.5,style:'cantilever-balcony'}),
  platform('er-balcony-3',28.4,4,3,{terrain:'rooftop',thickness:.5,style:'cantilever-balcony'}),
  platform('er-canopy',34.4,4,8,{terrain:'rooftop',thickness:.6,style:'cinema-canopy'}),
  platform('er-sign',45.4,4,3,{type:'moving',motion:'horizontal',amplitude:1.8,period:7,pause:1,terrain:'mechanical',thickness:.4,style:'shop-sign'}),
  platform('er-ledge',53.2,4.2,3,{terrain:'rooftop',thickness:.6,style:'cornice'}),
  lift('er-lift-2',57.6,5.2,1.4,7.2),
  platform('er-roof',63.6,6.8,8,{terrain:'rooftop',thickness:.8,style:'roof-terrace'}),
  platform('er-pylon',74.6,7,3,{terrain:'rooftop',thickness:.6,style:'tagliero-pylon'}),
  platform('er-wings',80.6,7,14,{terrain:'rooftop',thickness:.8,style:'tagliero-wing'}),
  ledge('er-cafe-awning',19.8,2.4,1.8,{terrain:'rooftop',style:'cafe-awning'}),
 ],
 spawn:['er-boulevard',4],finish:['er-wings',12],discovery:['er-wings',9],checkpoints:[['er-canopy',1.2],['er-roof',1.2]],
 discoveryBlocks:[{id:'er-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'er-discovery'}],
 stars:[['er-cafe-awning',.9,2],['er-balcony-3',1.5,2.2],['er-pylon',1.5,2.2]],
 edges:[
  ['er-boulevard','er-lift-1','RIDE_PLATFORM'],['er-lift-1','er-balcony-1','JUMP'],['er-balcony-1','er-balcony-2','JUMP'],['er-balcony-2','er-balcony-3','JUMP'],['er-balcony-3','er-canopy','JUMP'],['er-canopy','er-sign','RIDE_PLATFORM'],['er-sign','er-ledge','JUMP'],
  ['er-ledge','er-lift-2','RIDE_PLATFORM'],['er-lift-2','er-roof','JUMP'],['er-roof','er-pylon','JUMP'],['er-pylon','er-wings','JUMP'],
  ['er-balcony-1','er-cafe-awning','DROP',false],['er-cafe-awning','er-balcony-2','JUMP',false],
 ],
});
