import {africaLevel,platform,ledge,hazardStrip} from './common';

const mat=(id:string,x:number,y:number,period:number,phase=0)=>platform(id,x,y,3,{type:'moving',motion:'vertical',amplitude:.35,period,phase,pause:.6,terrain:'water-raft',thickness:.5,style:'papyrus-mat'});
const soft=(id:string,x:number,y:number)=>platform(id,x,y,3,{terrain:'water-raft',thickness:.5,style:'soft-papyrus',collapse:{delay:1.2,respawn:3}});
/** South Sudan — The Sudd: Floating Papyrus. Tier 2 (Adventurer).
 * From a cattle camp out across the swamp: papyrus mats bob under the
 * player, soft mats sink if they linger, a floating island is the rest
 * stop, and a shoebill paces the reed bank before the landing on the
 * channel. A sunken mat by the first reeds holds a star. */
export const level=africaLevel('SSD',{
 design:{archetype:'floating-papyrus-swamp-crossing',signatureMechanic:'bobbing-and-sinking-papyrus-mats',mechanics:['bobbing-papyrus-mats','sinking-soft-mats','floating-island-rest','shoebill-patrol','channel-landing'],terrain:['ground','water-raft'],verticality:'low',enemyProfile:'light',targetDurationSeconds:38,seed:2026447},
 environment:{biome:'nilotic-swamp',locationReference:'The Sudd wetland on the White Nile, South Sudan',terrainMaterial:'black-cotton-soil-and-papyrus',vegetationPack:'papyrus-reeds-and-borassus',architecturePack:'cattle-camp',landmarkAssets:['the-sudd','papyrus-islands','white-nile-channel','cattle-camp','shoebill'],lightingPreset:'humid-golden-evening',skyPreset:'tall-cumulus'},
 sections:[{id:'A',label:'Cattle camp',x:0},{id:'B',label:'Reed bank',x:8},{id:'C',label:'Papyrus mats',x:16},{id:'D',label:'Floating island',x:33},{id:'E',label:'Soft mats',x:45},{id:'F',label:'Shoebill reeds',x:56},{id:'G',label:'Channel landing',x:72}],
 platforms:[
  platform('ss-camp',-6,0,14,{style:'cattle-camp'}),
  platform('ss-reed-bank',8,0,6,{style:'reed-bank'}),
  mat('ss-mat-1',16.6,-.3,5),
  soft('ss-mat-2',22.2,-.3),
  mat('ss-mat-3',27.8,-.3,5.6,2),
  platform('ss-island',33.4,0,9,{style:'papyrus-island'}),
  soft('ss-mat-4',45,-.2),
  mat('ss-mat-5',50.6,-.1,5.2,1),
  platform('ss-reeds',56.2,.2,8,{style:'reed-bank'}),
  soft('ss-mat-6',66.8,0),
  platform('ss-landing',72.4,.4,13,{style:'channel-landing'}),
  ledge('ss-sunken-mat',14.4,-1.2,1.6,{style:'sunken-mat'}),
 ],
 spawn:['ss-camp',4],finish:['ss-landing',11],discovery:['ss-landing',8],checkpoints:[['ss-island',1.2],['ss-reeds',1]],
 hazards:hazardStrip('ss-swamp',14,58,-2.4,'swamp'),
 enemies:[{id:'ss-shoebill',platformId:'ss-reeds',minOffset:4,maxOffset:5.8,speed:.8,turnPause:1,height:.9}],
 discoveryBlocks:[{id:'ss-discovery-block',x:37,y:3.05,width:.75,height:.8,factId:'ss-discovery'}],
 stars:[['ss-sunken-mat',.8,2],['ss-island',6.5,2.3],['ss-mat-6',1.5,2.1]],
 coinRange:{'ss-reed-bank':[3.2,4.6]},
 edges:[
  ['ss-camp','ss-reed-bank','WALK'],['ss-reed-bank','ss-mat-1','RIDE_PLATFORM'],['ss-mat-1','ss-mat-2','JUMP'],['ss-mat-2','ss-mat-3','RIDE_PLATFORM'],['ss-mat-3','ss-island','JUMP'],['ss-island','ss-mat-4','JUMP'],['ss-mat-4','ss-mat-5','RIDE_PLATFORM'],['ss-mat-5','ss-reeds','JUMP'],
  ['ss-reeds','ss-mat-6','JUMP'],['ss-mat-6','ss-landing','JUMP'],
  ['ss-reed-bank','ss-sunken-mat','DROP',false],['ss-sunken-mat','ss-mat-1','JUMP',false],
 ],
});
