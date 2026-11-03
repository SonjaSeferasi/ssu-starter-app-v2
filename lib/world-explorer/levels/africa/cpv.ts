import {africaLevel,platform,ledge,hazardStrip} from './common';

const crust={collapse:{delay:.7,respawn:3}};
const steam=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:1.2,height:2.6,style:'steam',cycle:{period:6.5,warning:1.8,active:1.4,phase}});
/** Cabo Verde — Fogo: Into the Volcano. Tier 5 (Master Explorer).
 * From the vineyards of Chã das Caldeiras over the 2014–15 lava field:
 * long leaps between aa blocks, cinder crust that cracks, a loose cinder
 * slope that slides the player back down, fumarole rocks that hiss and
 * then steam, a crater rim and cracking ash ledges to the summit
 * of Pico do Fogo. A lava tube beside the last fumarole holds a star. */
export const level=africaLevel('CPV',{
 design:{archetype:'volcano-lava-field-to-summit',signatureMechanic:'fumarole-steam-on-the-cone',mechanics:['aa-lava-leaps','cracking-cinder-crust','sliding-cinder-slope','warned-fumarole-steam','ash-ledges'],terrain:['ground','rock','slope','lava'],verticality:'high',enemyProfile:'none',targetDurationSeconds:46,seed:2026426},
 environment:{biome:'volcanic-island',locationReference:'Pico do Fogo and Chã das Caldeiras, Fogo, Cabo Verde',terrainMaterial:'black-basalt-and-cinder',vegetationPack:'caldera-vines-and-fig',architecturePack:'basalt-village-houses',landmarkAssets:['pico-do-fogo','cha-das-caldeiras','lava-fields','fumaroles','caldera-vineyards'],lightingPreset:'thin-volcanic-light',skyPreset:'high-cloud',weatherPreset:'steam-and-ash'},
 sections:[{id:'A',label:'Caldera vineyards',x:0},{id:'B',label:'Aa lava blocks',x:12},{id:'C',label:'Cinder slope',x:32},{id:'D',label:'Crater rim',x:40},{id:'E',label:'Fumaroles',x:52},{id:'F',label:'Windy rim',x:76},{id:'G',label:'Ash ledges',x:88},{id:'H',label:'Summit',x:104}],
 platforms:[
  platform('cv-vineyard',-6,0,14,{style:'caldera-vineyard'}),
  platform('cv-lava-1',12.2,-.2,2.6,{terrain:'lava',style:'aa-block'}),
  platform('cv-lava-2',19,-.4,2.6,{terrain:'rock',thickness:.6,style:'cinder-crust',...crust}),
  platform('cv-lava-3',25.8,-.6,2.6,{terrain:'lava',style:'aa-block'}),
  platform('cv-cinder',32.6,-.8,8,{terrain:'slope',slope:1.6,current:-1.6,style:'cinder-slope'}),
  platform('cv-rim-1',40.6,.8,6,{terrain:'cliff',style:'crater-rim'}),
  platform('cv-rim-step',46.6,2.1,3,{terrain:'cliff',style:'crater-rim'}),
  platform('cv-fumarole-1',53.8,1.9,3.4,{terrain:'rock',thickness:1,style:'fumarole-rock'}),
  platform('cv-fumarole-2',61.4,1.7,3.4,{terrain:'rock',thickness:1,style:'fumarole-rock'}),
  platform('cv-fumarole-3',69,1.5,3.4,{terrain:'rock',thickness:1,style:'fumarole-rock'}),
  platform('cv-rim-2',76.6,1.3,7,{terrain:'cliff',style:'crater-rim'}),
  platform('cv-rim-step-2',83.6,2.6,3,{terrain:'cliff',style:'crater-rim'}),
  platform('cv-ash-1',90.8,2.4,2.6,{terrain:'rock',thickness:.6,style:'ash-ledge',...crust}),
  platform('cv-ash-2',97.6,2.2,2.6,{terrain:'rock',thickness:.6,style:'ash-ledge',...crust}),
  platform('cv-summit',104.4,2,13,{terrain:'cliff',style:'pico-summit'}),
  ledge('cv-lava-tube',72.8,.3,2,{style:'lava-tube'}),
 ],
 spawn:['cv-vineyard',4],finish:['cv-summit',11],discovery:['cv-summit',8],checkpoints:[['cv-rim-1',1.2],['cv-rim-2',1.2]],
 hazards:[steam('cv-steam-1',55.7,1.9,0),steam('cv-steam-2',63.3,1.7,2.2),steam('cv-steam-3',70.9,1.5,4.4),...hazardStrip('cv-lava-flow',10,92,-3.6,'lava')],
 discoveryBlocks:[{id:'cv-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'cv-discovery'}],
 noCoins:['cv-rim-1','cv-rim-step','cv-rim-step-2'],coins:[['cv-rim-1',3.5]],
 stars:[['cv-lava-tube',1,2],['cv-rim-1',3,2.3],['cv-rim-step-2',1.5,2.2]],
 edges:[
  ['cv-vineyard','cv-lava-1','JUMP'],['cv-lava-1','cv-lava-2','JUMP'],['cv-lava-2','cv-lava-3','JUMP'],['cv-lava-3','cv-cinder','JUMP'],['cv-cinder','cv-rim-1','WALK'],
  ['cv-rim-1','cv-rim-step','JUMP'],['cv-rim-step','cv-fumarole-1','JUMP'],['cv-fumarole-1','cv-fumarole-2','JUMP'],['cv-fumarole-2','cv-fumarole-3','JUMP'],['cv-fumarole-3','cv-rim-2','JUMP'],['cv-rim-2','cv-rim-step-2','JUMP'],['cv-rim-step-2','cv-ash-1','JUMP'],['cv-ash-1','cv-ash-2','JUMP'],['cv-ash-2','cv-summit','JUMP'],
  ['cv-fumarole-3','cv-lava-tube','DROP',false],['cv-lava-tube','cv-rim-2','JUMP',false],
 ],
});
