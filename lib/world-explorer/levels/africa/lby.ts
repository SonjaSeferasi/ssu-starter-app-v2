import {africaLevel,platform,ledge} from './common';

const drum={collapse:{delay:.9,respawn:3.2}};
const surge=(id:string,x:number,width:number,phase:number)=>({id,x,y:0,width,height:1.5,style:'wave',cycle:{period:7,warning:2,active:1.6,phase}});
/** Libya — Leptis Magna: Columns by the Sea. Tier 3 (Challenger).
 * Through the Severan arch and across the forum, over the toppled column
 * drums of the basilica (each rocks and drops soon after landing), down the
 * quay steps to the old harbour where warned waves wash the quays, over a
 * mooring block and the lighthouse footing, and up the seats of the theatre
 * to the stage building. Between two drums a broken mosaic floor holds a
 * star. */
export const level=africaLevel('LBY',{
 design:{archetype:'roman-ruins-to-harbour-surge',signatureMechanic:'toppling-column-drums-and-harbour-waves',mechanics:['toppling-column-drums','harbour-wave-surges','mooring-block-hop','quay-stairs','theatre-cavea-climb','mosaic-pit'],terrain:['ground','rock','stairs','terrace'],verticality:'medium',enemyProfile:'none',targetDurationSeconds:62,seed:2026404},
 environment:{biome:'mediterranean-coast',locationReference:'Leptis Magna, near Al Khums on the Libyan coast',terrainMaterial:'limestone-ashlar-and-marble',vegetationPack:'coastal-scrub-and-date-palms',architecturePack:'severan-roman-city',landmarkAssets:['severan-arch','basilica-colonnade','roman-theatre','harbour-quays','mediterranean-sea'],lightingPreset:'bright-coastal-noon',skyPreset:'mediterranean-clear'},
 sections:[{id:'A',label:'Severan arch',x:0},{id:'B',label:'Forum',x:9},{id:'C',label:'Toppled drums',x:21},{id:'D',label:'Basilica',x:37},{id:'E',label:'Harbour quay',x:46},{id:'F',label:'Mooring block',x:63},{id:'G',label:'Lighthouse footing',x:81},{id:'H',label:'Theatre',x:88}],
 platforms:[
  platform('ly-arch',-6,0,15,{style:'decumanus'}),
  platform('ly-forum',9,0,10,{style:'forum'}),
  platform('ly-drum-1',21.8,.9,1.8,{terrain:'rock',thickness:.8,style:'column-drum',...drum}),
  platform('ly-drum-2',26.8,1.5,1.8,{terrain:'rock',thickness:.8,style:'column-drum',...drum}),
  platform('ly-drum-3',31.8,1.9,1.8,{terrain:'rock',thickness:.8,style:'column-drum',...drum}),
  platform('ly-basilica',36.8,1.6,9,{style:'basilica-floor'}),
  platform('ly-quay-steps',45.8,1.6,5,{terrain:'stairs',slope:-1.6,steps:5,style:'quay-steps'}),
  platform('ly-quay-1',50.8,0,10,{style:'harbour-quay'}),
  platform('ly-mooring',63.8,0,2.4,{terrain:'rock',thickness:.8,style:'mooring-block'}),
  platform('ly-quay-2',69.4,0,9,{style:'harbour-quay'}),
  platform('ly-lighthouse',81.6,.8,3,{terrain:'rock',thickness:.8,style:'lighthouse-footing'}),
  platform('ly-theatre-1',87.8,1.7,3,{terrain:'terrace',style:'theatre-seats'}),
  platform('ly-cavea',93.8,2.6,7,{terrain:'stairs',slope:2,steps:6,style:'theatre-seats'}),
  platform('ly-scaenae',100.8,4.6,13,{style:'theatre-stage'}),
  ledge('ly-mosaic',24.2,0,1.8,{style:'mosaic-floor'}),
 ],
 spawn:['ly-arch',4],finish:['ly-scaenae',11],discovery:['ly-scaenae',8],checkpoints:[['ly-basilica',1.4],['ly-quay-2',1.2]],
 hazards:[
  {id:'ly-sea-1',x:60.8,y:-2.6,width:8.6,height:.9,style:'sea'},{id:'ly-sea-2',x:78.4,y:-2.6,width:9.4,height:.9,style:'sea'},
  surge('ly-surge-1',54.4,3,0),surge('ly-surge-2',72.8,2.8,3.5),
 ],
 discoveryBlocks:[{id:'ly-discovery-block',x:12,y:3.05,width:.75,height:.8,factId:'ly-discovery'}],
 stars:[['ly-mosaic',.9,2],['ly-basilica',5,2.4],['ly-lighthouse',1.5,2.3]],
 edges:[
  ['ly-arch','ly-forum','WALK'],['ly-forum','ly-drum-1','JUMP'],['ly-drum-1','ly-drum-2','JUMP'],['ly-drum-2','ly-drum-3','JUMP'],['ly-drum-3','ly-basilica','JUMP'],['ly-basilica','ly-quay-steps','WALK'],['ly-quay-steps','ly-quay-1','WALK'],
  ['ly-quay-1','ly-mooring','JUMP'],['ly-mooring','ly-quay-2','JUMP'],['ly-quay-2','ly-lighthouse','JUMP'],['ly-lighthouse','ly-theatre-1','JUMP'],['ly-theatre-1','ly-cavea','JUMP'],['ly-cavea','ly-scaenae','WALK'],
  ['ly-drum-1','ly-mosaic','DROP',false],['ly-mosaic','ly-drum-2','JUMP',false],
 ],
});
