import {africaLevel,platform,ledge} from './common';

const crumble={collapse:{delay:.7,respawn:3}};
/** São Tomé and Príncipe — Pico Cão Grande: The Needle. Tier 5 (Master Explorer).
 * A vertical course on a volcanic plug: buttress roots in the Obô forest,
 * a first face climbed by hand, crumbling ledges with long leaps, a second
 * and higher face, more crumbling flakes, a shoulder in the clouds and a
 * last leap to the windy summit. A ledge in the old cocoa terraces holds a
 * star. */
export const level=africaLevel('STP',{
 design:{archetype:'needle-double-face-ascent',signatureMechanic:'two-hand-climbed-faces-with-crumbling-leaps',mechanics:['buttress-root-leaps','first-face-climb','crumbling-ledges','second-face-climb','summit-gusts'],terrain:['ground','rock','cliff','climb-wall'],verticality:'high',enemyProfile:'none',targetDurationSeconds:46,seed:2026438},
 environment:{biome:'equatorial-rainforest-volcanic-plug',locationReference:'Pico Cão Grande, Obô Natural Park, São Tomé',terrainMaterial:'grey-phonolite',vegetationPack:'obo-rainforest-and-cocoa',architecturePack:'roca-plantation-house',landmarkAssets:['pico-cao-grande','obo-rainforest','volcanic-plug-wall','cocoa-plantation','mist-bands'],lightingPreset:'humid-diffuse',skyPreset:'cloud-bands'},
 sections:[{id:'A',label:'Roça plantation',x:0},{id:'B',label:'Buttress roots',x:12},{id:'C',label:'Forest ledge',x:26},{id:'D',label:'First face',x:32},{id:'E',label:'Crumbling ledges',x:40},{id:'F',label:'Second face',x:54},{id:'G',label:'Cloud shoulder',x:68},{id:'H',label:'Summit',x:87}],
 platforms:[
  platform('st-roca',-6,0,14,{style:'roca-plantation'}),
  platform('st-root-1',12.2,-.2,2.6,{terrain:'rock',thickness:1.2,style:'buttress-root'}),
  platform('st-root-2',19,-.4,2.6,{terrain:'rock',thickness:1.2,style:'buttress-root'}),
  platform('st-forest-ledge',25.8,-.6,6,{terrain:'cliff',style:'forest-ledge'}),
  platform('st-face-1',32.2,4.6,4,{terrain:'climb-wall',climbable:true,style:'phonolite-face'}),
  platform('st-ledge-a',40.4,4.4,2.4,{terrain:'rock',thickness:.7,style:'needle-flake',...crumble}),
  platform('st-ledge-b',47,4.2,2.4,{terrain:'rock',thickness:.7,style:'needle-flake',...crumble}),
  platform('st-needle-base',53.6,4,5,{terrain:'cliff',style:'needle-base'}),
  platform('st-face-2',59,8.6,5,{terrain:'climb-wall',climbable:true,style:'phonolite-face'}),
  platform('st-flake-1',68.2,8.4,2.4,{terrain:'rock',thickness:.7,style:'needle-flake',...crumble}),
  platform('st-flake-2',74.8,8.2,2.4,{terrain:'rock',thickness:.7,style:'needle-flake',...crumble}),
  platform('st-shoulder',81.4,8,6,{terrain:'cliff',style:'cloud-shoulder'}),
  platform('st-spire',87.4,9.3,2.4,{terrain:'rock',thickness:1.2,style:'needle-spire'}),
  platform('st-summit',94,9.1,12,{terrain:'cliff',style:'needle-summit'}),
  ledge('st-cocoa-ledge',22,-1.8,1.8,{style:'cocoa-terrace'}),
 ],
 spawn:['st-roca',4],finish:['st-summit',10],discovery:['st-summit',7.5],checkpoints:[['st-needle-base',1.2],['st-shoulder',1.2]],
 zones:[{id:'st-summit-gust',type:'wind',x:84,width:14,bottom:6,top:20,force:-2.2,period:7.5,warning:1.8,duration:2,phase:0}],
 discoveryBlocks:[{id:'st-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'st-discovery'}],
 stars:[['st-cocoa-ledge',.9,2],['st-needle-base',2.5,2.3],['st-spire',1.2,2.2]],
 edges:[
  ['st-roca','st-root-1','JUMP'],['st-root-1','st-root-2','JUMP'],['st-root-2','st-forest-ledge','JUMP'],['st-forest-ledge','st-face-1','CLIMB'],['st-face-1','st-ledge-a','JUMP'],['st-ledge-a','st-ledge-b','JUMP'],['st-ledge-b','st-needle-base','JUMP'],
  ['st-needle-base','st-face-2','CLIMB'],['st-face-2','st-flake-1','JUMP'],['st-flake-1','st-flake-2','JUMP'],['st-flake-2','st-shoulder','JUMP'],['st-shoulder','st-spire','JUMP'],['st-spire','st-summit','JUMP'],
  ['st-root-2','st-cocoa-ledge','DROP',false],['st-cocoa-ledge','st-forest-ledge','JUMP',false],
 ],
});
