import {africaLevel,platform,ledge,hazardStrip} from './common';

const pirogue=(id:string,x:number,y:number,amplitude:number,period:number)=>platform(id,x,y,3,{type:'moving',motion:'horizontal',amplitude,period,pause:1,bob:.15,terrain:'water-raft',thickness:.4,style:'pirogue'});
const fence={collapse:{delay:1.2,respawn:3}};
/** Benin — Ganvié: The Stilt Village. Tier 2 (Adventurer).
 * A lake crossing from house to house: pirogues ferry the player between
 * stilt verandas, a floating market is the rest stop, reed fish-park fences
 * sag and drop underfoot, and a pelican paces the school jetty before the
 * church pier. A drop beside the first houses lands on a fish trap with a
 * star. */
export const level=africaLevel('BEN',{
 design:{archetype:'stilt-village-pirogue-crossing',signatureMechanic:'pirogue-ferries-between-stilt-houses',mechanics:['pirogue-ferries','stilt-verandas','sagging-reed-fences','floating-market','pelican-patrol'],terrain:['ground','bridge','water-raft','rock'],verticality:'low',enemyProfile:'light',targetDurationSeconds:56,seed:2026412},
 environment:{biome:'coastal-lagoon',locationReference:'Ganvié on Lake Nokoué, near Cotonou, Benin',terrainMaterial:'timber-stilts-and-lagoon-sand',vegetationPack:'coconut-and-reeds',architecturePack:'stilt-houses',landmarkAssets:['ganvie-stilt-houses','lake-nokoue','pirogues','acadja-fish-parks','floating-market'],lightingPreset:'bright-lagoon-light',skyPreset:'humid-coastal'},
 sections:[{id:'A',label:'Lagoon shore',x:0},{id:'B',label:'First pirogue',x:16},{id:'C',label:'Stilt verandas',x:26},{id:'D',label:'Floating market',x:41},{id:'E',label:'Fish parks',x:51},{id:'F',label:'School jetty',x:73},{id:'G',label:'Church pier',x:90}],
 platforms:[
  platform('bj-shore',-6,0,14,{style:'lagoon-shore'}),
  platform('bj-jetty',8,0,8,{type:'wooden-bridge',terrain:'bridge',sagDepth:.2,style:'stilt-jetty'}),
  pirogue('bj-pirogue-1',19,-.2,1.8,6.5),
  platform('bj-house-1',26.6,.5,5,{terrain:'bridge',thickness:.4,style:'stilt-veranda'}),
  platform('bj-house-2',34.4,.9,4,{terrain:'bridge',thickness:.4,style:'stilt-veranda'}),
  platform('bj-market',41,.9,9.6,{terrain:'bridge',thickness:.4,style:'floating-market'}),
  pirogue('bj-pirogue-2',53.4,.4,2,7),
  platform('bj-acadja',61.2,.7,3,{terrain:'rock',thickness:.4,style:'acadja-fence',...fence}),
  platform('bj-house-3',66.8,1.1,4,{terrain:'bridge',thickness:.4,style:'stilt-veranda'}),
  platform('bj-school',73.6,1.1,8,{terrain:'bridge',thickness:.4,style:'school-jetty'}),
  platform('bj-house-4',84.4,1.4,3,{terrain:'bridge',thickness:.4,style:'stilt-veranda'}),
  platform('bj-church-pier',90,1.4,13,{style:'church-pier'}),
  ledge('bj-fish-trap',32,-.4,1.8,{style:'fish-trap'}),
 ],
 spawn:['bj-shore',4],finish:['bj-church-pier',11],discovery:['bj-church-pier',8],checkpoints:[['bj-market',1.2],['bj-school',1.2]],
 hazards:[...hazardStrip('bj-lagoon',16,74,-2.3,'lagoon')],
 enemies:[{id:'bj-pelican',platformId:'bj-school',minOffset:2.6,maxOffset:5.6,speed:.9,turnPause:.7,height:.75}],
 discoveryBlocks:[{id:'bj-discovery-block',x:45,y:4,width:.75,height:.8,factId:'bj-discovery'}],
 stars:[['bj-fish-trap',.9,2],['bj-house-2',2,2.3],['bj-house-4',1.5,2.2]],
 edges:[
  ['bj-shore','bj-jetty','WALK'],['bj-jetty','bj-pirogue-1','RIDE_PLATFORM'],['bj-pirogue-1','bj-house-1','JUMP'],['bj-house-1','bj-house-2','JUMP'],['bj-house-2','bj-market','JUMP'],['bj-market','bj-pirogue-2','RIDE_PLATFORM'],
  ['bj-pirogue-2','bj-acadja','JUMP'],['bj-acadja','bj-house-3','JUMP'],['bj-house-3','bj-school','JUMP'],['bj-school','bj-house-4','JUMP'],['bj-house-4','bj-church-pier','JUMP'],
  ['bj-house-1','bj-fish-trap','DROP',false],['bj-fish-trap','bj-house-2','JUMP',false],
 ],
});
