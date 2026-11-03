import {africaLevel,platform,ledge,hazardStrip} from './common';

const wet={collapse:{delay:.85,respawn:3}};
const spray=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:1.2,height:2.6,style:'spray',cycle:{period:6.5,warning:1.8,active:1.4,phase}});
/** Uganda — Murchison Falls: The Nile Squeeze. Tier 4 (Expert Explorer).
 * Along the top of the gorge where the Victoria Nile is forced through a
 * slot: the river lip pushes the player toward the drop, spray bursts over
 * the squeeze rocks after a warning, wet ledges break away, and gorge rocks
 * lead to the falls trail. A hollow below the second gorge rock holds a
 * star. */
export const level=africaLevel('UGA',{
 design:{archetype:'gorge-rim-above-the-squeeze',signatureMechanic:'river-lip-current-toward-the-drop',mechanics:['downstream-lip-current','squeeze-rock-spray','breaking-wet-ledges','gorge-rock-hops'],terrain:['ground','rock','cliff'],verticality:'medium',enemyProfile:'none',targetDurationSeconds:58,seed:2026448},
 environment:{biome:'nile-gorge-savanna',locationReference:'The top of Murchison Falls on the Victoria Nile, Uganda',terrainMaterial:'dark-gneiss',vegetationPack:'borassus-palms-and-spray-forest',architecturePack:'none',landmarkAssets:['murchison-gorge','victoria-nile','spray-plume','borassus-savanna','nile-crocodiles'],lightingPreset:'bright-river-light',skyPreset:'savanna-cumulus',weatherPreset:'falls-spray'},
 sections:[{id:'A',label:'Borassus savanna',x:0},{id:'B',label:'Gorge rocks',x:11},{id:'C',label:'River lip',x:25},{id:'D',label:'The squeeze',x:35},{id:'E',label:'Top of the falls',x:49},{id:'F',label:'Wet ledges',x:61},{id:'G',label:'Gorge terrace',x:75},{id:'H',label:'Falls trail',x:93}],
 platforms:[
  platform('ug-savanna',-6,0,14,{style:'borassus-savanna'}),
  platform('ug-rock-1',11.6,.2,3,{terrain:'rock',thickness:1.2,style:'gorge-rock'}),
  platform('ug-rock-2',18.4,.4,3,{terrain:'rock',thickness:1.2,style:'gorge-rock'}),
  platform('ug-lip',25.2,.6,7,{terrain:'rock',thickness:1.2,current:1.4,style:'river-lip'}),
  platform('ug-squeeze-1',36,.6,3.4,{terrain:'rock',thickness:1.2,style:'squeeze-rock'}),
  platform('ug-squeeze-2',43.2,.8,3.4,{terrain:'rock',thickness:1.2,style:'squeeze-rock'}),
  platform('ug-top',50.4,1,8,{terrain:'cliff',style:'top-of-the-falls'}),
  platform('ug-ledge-1',62.2,1.2,3,{terrain:'rock',thickness:.7,style:'wet-ledge',...wet}),
  platform('ug-ledge-2',69,1.4,3,{terrain:'rock',thickness:.7,style:'wet-ledge',...wet}),
  platform('ug-terrace',75.8,1.6,8,{terrain:'cliff',style:'gorge-terrace'}),
  platform('ug-rock-3',87.6,1.8,3,{terrain:'rock',thickness:1.2,style:'gorge-rock'}),
  platform('ug-trail',94.4,2,13,{style:'falls-trail'}),
  ledge('ug-hollow',21.8,-.6,1.8,{style:'spray-hollow'}),
 ],
 spawn:['ug-savanna',4],finish:['ug-trail',11],discovery:['ug-trail',8],checkpoints:[['ug-top',1.2],['ug-terrace',1.2]],
 hazards:[spray('ug-spray-1',38,.6,0),spray('ug-spray-2',45.2,.8,3.2),...hazardStrip('ug-nile',10,82,-3,'river')],
 discoveryBlocks:[{id:'ug-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'ug-discovery'}],
 stars:[['ug-hollow',.9,2],['ug-top',4,2.3],['ug-rock-3',1.5,2.2]],
 edges:[
  ['ug-savanna','ug-rock-1','JUMP'],['ug-rock-1','ug-rock-2','JUMP'],['ug-rock-2','ug-lip','JUMP'],['ug-lip','ug-squeeze-1','JUMP'],['ug-squeeze-1','ug-squeeze-2','JUMP'],['ug-squeeze-2','ug-top','JUMP'],
  ['ug-top','ug-ledge-1','JUMP'],['ug-ledge-1','ug-ledge-2','JUMP'],['ug-ledge-2','ug-terrace','JUMP'],['ug-terrace','ug-rock-3','JUMP'],['ug-rock-3','ug-trail','JUMP'],
  ['ug-rock-2','ug-hollow','DROP',false],['ug-hollow','ug-lip','JUMP',false],
 ],
});
