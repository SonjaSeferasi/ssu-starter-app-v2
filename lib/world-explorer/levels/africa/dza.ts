import {africaLevel,platform,ledge} from './common';

const crack={collapse:{delay:.95,respawn:3}};
/** Algeria — Tassili n’Ajjer: The Stone Forest. Tier 4 (Expert Explorer).
 * Precision hopping across a wind canyon of sandstone hoodoos: warned gusts
 * blow back down the canyon, thin flakes of sandstone crack and fall under a
 * standing player, a painted rock shelter is the rest stop, its wall is
 * climbed by hand, and natural arches lead over a second windy gap to the
 * plateau rim. A short fall into the guelta gorge lands on a ledge with a
 * star, one climb below the cracking flakes. */
export const level=africaLevel('DZA',{
 design:{archetype:'sandstone-stone-forest-wind-canyon',signatureMechanic:'cracking-sandstone-flakes-in-gusts',mechanics:['canyon-gusts','cracking-flakes','hoodoo-hops','shelter-wall-climb','natural-arch-crossing','guelta-ledge'],terrain:['sand','slope','cliff','rock','cave','climb-wall','arch','ground'],verticality:'high',enemyProfile:'none',targetDurationSeconds:66,seed:2026402},
 environment:{biome:'saharan-sandstone-plateau',locationReference:'Tassili n’Ajjer National Park, south-eastern Algeria',terrainMaterial:'eroded-sandstone',vegetationPack:'cypress-of-tassili-and-acacia',architecturePack:'rock-art-shelters',landmarkAssets:['sandstone-stone-forest','natural-rock-arches','rock-art-shelter','guelta-pool','erg-dunes'],lightingPreset:'saharan-low-sun',skyPreset:'desert-haze'},
 sections:[{id:'A',label:'Erg edge',x:0},{id:'B',label:'Plateau climb',x:9},{id:'C',label:'Hoodoo canyon',x:24},{id:'D',label:'Cracking flakes',x:37},{id:'E',label:'Rock-art shelter',x:50},{id:'F',label:'Natural arches',x:61},{id:'G',label:'Windy rim',x:83},{id:'H',label:'Plateau summit',x:107}],
 platforms:[
  platform('dz-erg',-6,0,15,{terrain:'sand',style:'erg'}),
  platform('dz-slope',9,0,6,{terrain:'slope',slope:1.2,style:'sand-ramp'}),
  platform('dz-plateau',15,1.2,8,{terrain:'cliff',style:'plateau'}),
  platform('dz-hoodoo-1',26.4,1.4,2.4,{terrain:'cliff',style:'hoodoo'}),
  platform('dz-hoodoo-2',32.4,2.2,2.2,{terrain:'cliff',style:'hoodoo'}),
  platform('dz-flake-1',38.4,2.6,2.4,{terrain:'rock',thickness:.6,style:'flake',...crack}),
  platform('dz-flake-2',44.6,2.4,2.4,{terrain:'rock',thickness:.6,style:'flake',...crack}),
  platform('dz-shelter',50.6,2.8,10,{terrain:'cave',style:'rock-art-shelter'}),
  platform('dz-wall',61,5.4,6,{terrain:'climb-wall',climbable:true,style:'shelter-wall'}),
  platform('dz-arch-1',70.6,5.2,3,{terrain:'arch',thickness:1.2,style:'natural-arch'}),
  platform('dz-arch-2',77.4,5.6,2.6,{terrain:'arch',thickness:1.2,style:'natural-arch'}),
  platform('dz-rim',83.8,5.2,8,{terrain:'cliff',style:'plateau'}),
  platform('dz-hoodoo-3',95.6,5.4,2.2,{terrain:'cliff',style:'hoodoo'}),
  platform('dz-hoodoo-4',101.6,6.2,2.2,{terrain:'cliff',style:'hoodoo'}),
  platform('dz-summit',107.6,6,14,{terrain:'ground',style:'plateau'}),
  ledge('dz-guelta-ledge',35.4,1.2,1.8,{style:'guelta-ledge'}),
 ],
 spawn:['dz-erg',4],finish:['dz-summit',12],discovery:['dz-summit',9],checkpoints:[['dz-shelter',1.4],['dz-rim',1.4]],
 zones:[
  {id:'dz-canyon-gust',type:'wind',x:24,width:13,bottom:0,top:10,force:-2,period:7,warning:1.8,duration:2,phase:0},
  {id:'dz-rim-gust',type:'wind',x:92,width:16,bottom:3,top:14,force:-2.2,period:7.5,warning:1.8,duration:2,phase:3},
 ],
 discoveryBlocks:[{id:'dz-discovery-block',x:55.6,y:6.05,width:.75,height:.8,factId:'dz-discovery'}],
 stars:[['dz-guelta-ledge',.9,2.1],['dz-rim',4,2.4],['dz-summit',4,2.3]],
 edges:[
  ['dz-erg','dz-slope','WALK'],['dz-slope','dz-plateau','WALK'],['dz-plateau','dz-hoodoo-1','JUMP'],['dz-hoodoo-1','dz-hoodoo-2','JUMP'],['dz-hoodoo-2','dz-flake-1','JUMP'],['dz-flake-1','dz-flake-2','JUMP'],['dz-flake-2','dz-shelter','JUMP'],
  ['dz-shelter','dz-wall','CLIMB'],['dz-wall','dz-arch-1','JUMP'],['dz-arch-1','dz-arch-2','JUMP'],['dz-arch-2','dz-rim','JUMP'],['dz-rim','dz-hoodoo-3','JUMP'],['dz-hoodoo-3','dz-hoodoo-4','JUMP'],['dz-hoodoo-4','dz-summit','JUMP'],
  ['dz-hoodoo-2','dz-guelta-ledge','DROP',false],['dz-guelta-ledge','dz-flake-1','JUMP',false],
 ],
});
