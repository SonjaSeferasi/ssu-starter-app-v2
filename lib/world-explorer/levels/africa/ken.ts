import {africaLevel,platform,ledge,hazardStrip} from './common';

// The crossing herd moves together, so the gaps between backs stay fixed.
const wildebeest=(id:string,x:number,y:number)=>platform(id,x,y,3,{type:'moving',motion:'horizontal',amplitude:1.4,period:7.6,pause:1.1,bob:.15,terrain:'water-raft',thickness:.6,style:'wildebeest'});
/** Kenya — Maasai Mara: The Great Migration. Tier 3 (Challenger).
 * Down the riverbank to the Mara River, across on the backs of the crossing
 * herd, past a crocodile basking on the sandbar, over the far bank's rocks,
 * then up the escarpment in a hot-air balloon basket to the plains. A
 * hippo pool below the near bank holds a star. */
export const level=africaLevel('KEN',{
 design:{archetype:'river-crossing-on-the-migration',signatureMechanic:'riding-the-crossing-herd',mechanics:['crossing-herd-rides','sandbar-crocodile','bank-rocks','balloon-basket-lift','escarpment-plains'],terrain:['ground','slope','water-raft','sand','rock','mechanical'],verticality:'medium',enemyProfile:'light',targetDurationSeconds:58,seed:2026441},
 environment:{biome:'east-african-savanna',locationReference:'The Mara River crossing, Maasai Mara National Reserve, Kenya',terrainMaterial:'red-earth-and-river-sand',vegetationPack:'acacia-and-red-oat-grass',architecturePack:'none',landmarkAssets:['mara-river-crossing','wildebeest-herd','hot-air-balloons','acacia-savanna','mara-escarpment'],lightingPreset:'golden-savanna-morning',skyPreset:'big-sky-cumulus'},
 sections:[{id:'A',label:'Plains',x:0},{id:'B',label:'Riverbank',x:8},{id:'C',label:'The crossing',x:17},{id:'D',label:'Sandbar',x:34},{id:'E',label:'Second crossing',x:45},{id:'F',label:'Far-bank rocks',x:61},{id:'G',label:'Balloon basket',x:73},{id:'H',label:'Escarpment plains',x:80}],
 platforms:[
  platform('ke-plains',-6,0,14,{style:'grass-plains'}),
  platform('ke-bank',8,0,6,{terrain:'slope',slope:-1.2,style:'river-bank'}),
  platform('ke-shallows',14,-1.2,3.4,{terrain:'sand',style:'river-shallows'}),
  wildebeest('ke-gnu-1',19.4,-1.2),
  wildebeest('ke-gnu-2',25.4,-1.2),
  platform('ke-sandbar',32.8,-1.2,9,{terrain:'sand',style:'sandbar'}),
  wildebeest('ke-gnu-3',44.6,-1.2),
  wildebeest('ke-gnu-4',50.6,-1.2),
  platform('ke-far-bank',57.6,-.8,5.2,{terrain:'rock',thickness:1,style:'bank-rock'}),
  platform('ke-rock-2',65.8,-.4,3,{terrain:'rock',thickness:1,style:'bank-rock'}),
  platform('ke-ledge',71.8,-.2,4,{style:'escarpment-foot'}),
  platform('ke-balloon',77.4,.6,3,{type:'moving',motion:'vertical',amplitude:2,period:7.6,pause:1.2,terrain:'mechanical',thickness:.5,style:'balloon-basket'}),
  platform('ke-escarpment',83.8,2.4,14,{style:'escarpment-plains'}),
  ledge('ke-hippo-pool',69.2,-1.4,1.6,{style:'hippo-pool'}),
 ],
 spawn:['ke-plains',4],finish:['ke-escarpment',12],discovery:['ke-escarpment',9],checkpoints:[['ke-sandbar',1.2],['ke-ledge',1]],
 hazards:hazardStrip('ke-mara',12,64,-3.6,'river'),
 enemies:[{id:'ke-crocodile',platformId:'ke-sandbar',minOffset:3.4,maxOffset:6,speed:.8,turnPause:1,height:.55}],
 discoveryBlocks:[{id:'ke-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'ke-discovery'}],
 stars:[['ke-hippo-pool',.8,2],['ke-far-bank',2.6,2.2],['ke-balloon',1.5,2.3]],
noCoins:['ke-shallows'],
 edges:[
  ['ke-plains','ke-bank','WALK'],['ke-bank','ke-shallows','WALK'],['ke-shallows','ke-gnu-1','RIDE_PLATFORM'],['ke-gnu-1','ke-gnu-2','JUMP'],['ke-gnu-2','ke-sandbar','JUMP'],['ke-sandbar','ke-gnu-3','RIDE_PLATFORM'],['ke-gnu-3','ke-gnu-4','JUMP'],['ke-gnu-4','ke-far-bank','JUMP'],
  ['ke-far-bank','ke-rock-2','JUMP'],['ke-rock-2','ke-ledge','JUMP'],['ke-ledge','ke-balloon','RIDE_PLATFORM'],['ke-balloon','ke-escarpment','JUMP'],
  ['ke-rock-2','ke-hippo-pool','DROP',false],['ke-hippo-pool','ke-ledge','JUMP',false],
 ],
});
