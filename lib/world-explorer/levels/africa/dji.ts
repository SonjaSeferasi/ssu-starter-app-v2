import {africaLevel,platform,ledge} from './common';

const crust={collapse:{delay:.85,respawn:3}};
const steam=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:1.4,height:2.6,style:'steam',cycle:{period:6.5,warning:1.8,active:1.4,phase}});
/** Djibouti — Lac Abbé: The Steaming Chimneys. Tier 4 (Expert Explorer).
 * Across salt flats among limestone chimneys: thin travertine crusts break
 * underfoot, each chimney top hisses and then steams on one side (land on
 * the cool side and wait), a hot-spring terrace is the rest stop, and the
 * lake shore beyond is swept by warned gusts. A hot pool below the first
 * chimney holds a star. */
export const level=africaLevel('DJI',{
 design:{archetype:'steaming-chimney-field-crossing',signatureMechanic:'land-on-the-cool-side-of-steaming-chimneys',mechanics:['breaking-travertine-crust','steaming-chimney-tops','hot-spring-terrace','salt-flat-gusts','flamingo-shore'],terrain:['salt-flat','rock','cliff','ground'],verticality:'low',enemyProfile:'none',targetDurationSeconds:50,seed:2026445},
 environment:{biome:'afar-salt-desert',locationReference:'Lake Abbé, on the Djibouti–Ethiopia border',terrainMaterial:'travertine-and-salt',vegetationPack:'doum-palms-and-salt-scrub',architecturePack:'none',landmarkAssets:['limestone-chimneys','lake-abbe','salt-flats','flamingo-flocks','dama-ali-volcano'],lightingPreset:'dawn-over-the-chimneys',skyPreset:'pastel-dawn',weatherPreset:'steam-plumes'},
 sections:[{id:'A',label:'Salt flats',x:0},{id:'B',label:'Travertine crust',x:11},{id:'C',label:'First chimneys',x:25},{id:'D',label:'Hot springs',x:41},{id:'E',label:'Chimney row',x:53},{id:'F',label:'Last crust',x:68},{id:'G',label:'Windy shore',x:76},{id:'H',label:'Lake lookout',x:95}],
 platforms:[
  platform('dj-flats',-6,0,14,{terrain:'salt-flat',style:'salt-flat'}),
  platform('dj-crust-1',11.6,.2,3.4,{terrain:'rock',thickness:.6,style:'travertine-crust',...crust}),
  platform('dj-crust-2',18.6,.4,3.4,{terrain:'rock',thickness:.6,style:'travertine-crust',...crust}),
  platform('dj-chimney-1',25.8,.6,4,{terrain:'cliff',style:'chimney-top'}),
  platform('dj-chimney-2',33.6,.8,4,{terrain:'cliff',style:'chimney-top'}),
  platform('dj-springs',41.4,.8,8,{style:'hot-spring-terrace'}),
  platform('dj-chimney-3',53.2,1,4,{terrain:'cliff',style:'chimney-top'}),
  platform('dj-chimney-4',61,1.2,4,{terrain:'cliff',style:'chimney-top'}),
  platform('dj-crust-3',68.8,1.2,3.4,{terrain:'rock',thickness:.6,style:'travertine-crust',...crust}),
  platform('dj-shore',76,1,8,{style:'lake-shore'}),
  platform('dj-chimney-5',87.8,1.2,4,{terrain:'cliff',style:'chimney-top'}),
  platform('dj-lookout',95.6,1.4,13,{style:'lake-lookout'}),
  ledge('dj-hot-pool',22.2,-.6,1.8,{style:'hot-pool'}),
 ],
 spawn:['dj-flats',4],finish:['dj-lookout',11],discovery:['dj-lookout',8],checkpoints:[['dj-springs',1.2],['dj-shore',1.2]],
 hazards:[steam('dj-steam-2',35.8,.8,2.2),steam('dj-steam-3',55.4,1,4.4),steam('dj-steam-4',63.2,1.2,1.1)],
 zones:[{id:'dj-shore-gust',type:'wind',x:76.6,width:19,bottom:-1,top:10,force:-2,period:7.5,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'dj-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'dj-discovery'}],
 stars:[['dj-hot-pool',.9,2],['dj-springs',4,2.3],['dj-chimney-5',1.2,2.2]],
noCoins:['dj-chimney-5'],
 edges:[
  ['dj-flats','dj-crust-1','JUMP'],['dj-crust-1','dj-crust-2','JUMP'],['dj-crust-2','dj-chimney-1','JUMP'],['dj-chimney-1','dj-chimney-2','JUMP'],['dj-chimney-2','dj-springs','JUMP'],['dj-springs','dj-chimney-3','JUMP'],
  ['dj-chimney-3','dj-chimney-4','JUMP'],['dj-chimney-4','dj-crust-3','JUMP'],['dj-crust-3','dj-shore','JUMP'],['dj-shore','dj-chimney-5','JUMP'],['dj-chimney-5','dj-lookout','JUMP'],
  ['dj-crust-2','dj-hot-pool','DROP',false],['dj-hot-pool','dj-chimney-1','JUMP',false],
 ],
});
