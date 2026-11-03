import {africaLevel,platform,ledge} from './common';

const liana=(id:string,x:number,y:number)=>platform(id,x,y,1.8,{type:'moving',motion:'pendulum',length:5,amplitude:2.2,period:4.4,terrain:'canopy',thickness:.3,style:'liana'});
const scree={collapse:{delay:.8,respawn:3}};
const rockfall=(id:string,x:number,y:number,phase:number)=>({id,x,y,width:2.4,height:2.6,style:'rockfall',cycle:{period:7,warning:1.8,active:1.2,phase}});
/** Cameroon — Mount Cameroon: The Race of Hope. Tier 4 (Expert Explorer).
 * Up the runners' route from the farms above Buea: buttress roots in the
 * montane forest, a lava gully crossed on swinging lianas, a mossy scarp
 * climbed by hand, heath boulders above the tree line, a mountain hut under
 * warned rockfall, crumbling scree and the windy crater summit. A fern
 * ledge between the roots holds a star. */
export const level=africaLevel('CMR',{
 design:{archetype:'volcano-race-route-ascent',signatureMechanic:'liana-swings-over-lava-gullies',mechanics:['buttress-root-hops','liana-swings','mossy-scarp-climb','hut-rockfall','crumbling-scree'],terrain:['ground','slope','rock','cliff','canopy','climb-wall'],verticality:'high',enemyProfile:'none',targetDurationSeconds:66,seed:2026431},
 environment:{biome:'montane-forest-to-volcano',locationReference:'The Race of Hope route above Buea, Mount Cameroon',terrainMaterial:'basalt-and-forest-loam',vegetationPack:'montane-forest-tree-ferns-and-heath',architecturePack:'mountain-huts',landmarkAssets:['mount-cameroon','montane-cloud-forest','lava-gullies','giant-lianas','gulf-of-guinea'],lightingPreset:'cool-mountain-light',skyPreset:'cloud-sea'},
 sections:[{id:'A',label:'Farms above Buea',x:0},{id:'B',label:'Forest trail',x:8},{id:'C',label:'Buttress roots',x:17},{id:'D',label:'Lava gully lianas',x:35},{id:'E',label:'Mossy scarp',x:51},{id:'F',label:'Heath boulders',x:66},{id:'G',label:'Hut and rockfall',x:80},{id:'H',label:'Crater summit',x:92}],
 platforms:[
  platform('cm-farms',-6,0,14,{style:'farm-terraces'}),
  platform('cm-trail',8,0,6,{terrain:'slope',slope:1.2,style:'forest-trail'}),
  platform('cm-root-1',17.6,1.4,3,{terrain:'rock',thickness:1,style:'buttress-root'}),
  platform('cm-root-2',24.4,1.8,3,{terrain:'rock',thickness:1,style:'buttress-root'}),
  platform('cm-gully-edge',31.2,2.2,4,{terrain:'cliff',style:'gully-edge'}),
  liana('cm-liana-1',38.6,1.6),
  liana('cm-liana-2',45.4,1.6),
  platform('cm-gully-far',51,2.6,6,{terrain:'cliff',style:'gully-edge'}),
  platform('cm-scarp',57.4,5.4,6,{terrain:'climb-wall',climbable:true,style:'mossy-scarp'}),
  platform('cm-heath-1',67.2,5.6,3,{terrain:'rock',thickness:1,style:'heath-boulder'}),
  platform('cm-heath-2',74,6,3,{terrain:'rock',thickness:1,style:'heath-boulder'}),
  platform('cm-hut',80.8,6.2,8,{style:'mountain-hut'}),
  platform('cm-scree-1',92.6,6.6,3,{terrain:'rock',thickness:.6,style:'scree',...scree}),
  platform('cm-scree-2',99.4,7,3,{terrain:'rock',thickness:.6,style:'scree',...scree}),
  platform('cm-summit',106.2,7.2,13,{terrain:'cliff',style:'summit-crater'}),
  ledge('cm-fern-ledge',27.8,.8,1.8,{style:'fern-ledge'}),
 ],
 spawn:['cm-farms',4],finish:['cm-summit',11],discovery:['cm-summit',8],checkpoints:[['cm-gully-far',1.2],['cm-heath-1',1.5]],
 hazards:[rockfall('cm-rockfall',84,6.2,0)],
 discoveryBlocks:[{id:'cm-discovery-block',x:3,y:3.05,width:.75,height:.8,factId:'cm-discovery'}],
 stars:[['cm-fern-ledge',.9,2],['cm-gully-edge',2,2.3],['cm-heath-2',1.5,2.2]],
 edges:[
  ['cm-farms','cm-trail','WALK'],['cm-trail','cm-root-1','JUMP'],['cm-root-1','cm-root-2','JUMP'],['cm-root-2','cm-gully-edge','JUMP'],['cm-gully-edge','cm-liana-1','RIDE_PLATFORM'],['cm-liana-1','cm-liana-2','RIDE_PLATFORM'],['cm-liana-2','cm-gully-far','JUMP'],
  ['cm-gully-far','cm-scarp','CLIMB'],['cm-scarp','cm-heath-1','JUMP'],['cm-heath-1','cm-heath-2','JUMP'],['cm-heath-2','cm-hut','JUMP'],['cm-hut','cm-scree-1','JUMP'],['cm-scree-1','cm-scree-2','JUMP'],['cm-scree-2','cm-summit','JUMP'],
  ['cm-root-2','cm-fern-ledge','DROP',false],['cm-fern-ledge','cm-gully-edge','JUMP',false],
 ],
});
