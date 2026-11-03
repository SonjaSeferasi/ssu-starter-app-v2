import {africaLevel,platform,ledge,hazardStrip} from './common';

const frost=(id:string,x:number,y:number)=>platform(id,x,y,5.2,{terrain:'ice-shelf',surface:'ice',thickness:1.2,style:'frosted-basalt'});
const lift=(id:string,x:number,y:number,amplitude:number,style:string)=>platform(id,x,y,3,{type:'moving',motion:'vertical',amplitude,period:7.4,pause:1.2,terrain:'mechanical',thickness:.4,style});
/** Lesotho — Maletsunyane Falls: The Highland Gorge. Tier 4 (Expert Explorer).
 * From a Basotho village along the pony trail onto frosted basalt ledges,
 * down into the gorge on the abseil platform beside the 192-metre falls,
 * across spray-wet rocks, up again on the winch, over the rim in the
 * highland gusts and on across frost to the Maloti lookout. A shepherd's
 * ledge under the trail holds a star. */
export const level=africaLevel('LSO',{
 design:{archetype:'gorge-descent-and-winch-climb',signatureMechanic:'abseil-platform-down-winch-up-beside-the-falls',mechanics:['frosted-basalt-ledges','abseil-platform-descent','spray-rock-leaps','gorge-winch-ascent','rim-gusts'],terrain:['ground','cliff','ice-shelf','mechanical','rock'],verticality:'high',enemyProfile:'none',targetDurationSeconds:60,seed:2026463},
 environment:{biome:'maloti-highlands',locationReference:'Maletsunyane Falls, Semonkong, Lesotho',terrainMaterial:'drakensberg-basalt-and-frost',vegetationPack:'highland-grass-and-aloes',architecturePack:'basotho-rondavels',landmarkAssets:['maletsunyane-falls','basalt-gorge','highland-villages','pony-trail','maloti-mountains'],lightingPreset:'cold-highland-morning',skyPreset:'highland-clear'},
 sections:[{id:'A',label:'Highland village',x:0},{id:'B',label:'Pony trail',x:8},{id:'C',label:'Frosted ledges',x:19},{id:'D',label:'Abseil and gorge',x:32},{id:'E',label:'Winch',x:50},{id:'F',label:'Windy rim',x:54},{id:'G',label:'Frost and rock',x:68},{id:'H',label:'Maloti lookout',x:84}],
 platforms:[
  platform('ls-village',-6,0,14,{style:'highland-village'}),
  platform('ls-trail',8,0,8,{style:'pony-trail'}),
  platform('ls-ledge-1',19.6,.4,3.4,{terrain:'cliff',style:'basalt-ledge'}),
  frost('ls-frost-1',26.6,.6),
  lift('ls-abseil',32.6,-.8,1.4,'abseil-platform'),
  platform('ls-gorge-shelf',36.4,-2.2,7,{terrain:'cliff',style:'gorge-shelf'}),
  platform('ls-spray-rock',47,-1.8,3,{terrain:'rock',thickness:1,style:'spray-rock'}),
  lift('ls-winch',50.8,0,1.8,'gorge-winch'),
  platform('ls-rim',54.6,1.6,10,{terrain:'cliff',style:'gorge-rim'}),
  frost('ls-frost-2',68.2,1.8),
  platform('ls-rim-3',77,2.2,3.4,{terrain:'cliff',style:'basalt-ledge'}),
  platform('ls-lookout',84.2,2.6,13,{style:'maloti-lookout'}),
  ledge('ls-shepherd-ledge',23.3,-.6,1.6,{style:'shepherd-ledge'}),
 ],
 spawn:['ls-village',4],finish:['ls-lookout',11],discovery:['ls-lookout',8],checkpoints:[['ls-gorge-shelf',1.2],['ls-rim',1]],
 hazards:hazardStrip('ls-river',31,26,-4.6,'river'),
 zones:[{id:'ls-rim-gust',type:'wind',x:56.4,width:7.4,bottom:1,top:10,force:-2,period:7.5,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'ls-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'ls-discovery'}],
 stars:[['ls-shepherd-ledge',.9,2],['ls-gorge-shelf',4,2.3],['ls-rim-3',1.5,2.2]],
 edges:[
  ['ls-village','ls-trail','WALK'],['ls-trail','ls-ledge-1','JUMP'],['ls-ledge-1','ls-frost-1','JUMP'],['ls-frost-1','ls-abseil','RIDE_PLATFORM'],['ls-abseil','ls-gorge-shelf','JUMP'],['ls-gorge-shelf','ls-spray-rock','JUMP'],
  ['ls-spray-rock','ls-winch','RIDE_PLATFORM'],['ls-winch','ls-rim','JUMP'],['ls-rim','ls-frost-2','JUMP'],['ls-frost-2','ls-rim-3','JUMP'],['ls-rim-3','ls-lookout','JUMP'],
  ['ls-ledge-1','ls-shepherd-ledge','DROP',false],['ls-shepherd-ledge','ls-frost-1','JUMP',false],
 ],
});
