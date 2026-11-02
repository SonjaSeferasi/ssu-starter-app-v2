import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,vertexMaterial} from '../../kit/common';
import {createSkyDome,createCloudBanks,type SkyOptions,type CloudOptions} from '../../kit/sky';
import {loadSurfaceMaps} from '../../kit/surface-maps';
import {createCreatureRig,finishCreature,type CreatureRig,type CreatureState} from '../../kit/creature';
import type {EnvironmentContext,EnvironmentSignals,MountedEnvironment} from '../types';

/** The scaffolding every South American environment shares: sky, fog,
 * depth layers, a static root batched into few draw calls, animated pieces,
 * reduced motion, the review overview and clean disposal. What a country
 * looks like (landforms, landmarks, plants, light) stays in its own module. */
export type Animated={update:(time:number,signals?:EnvironmentSignals)=>void;setVisible?:(value:boolean)=>void;motion?:boolean};
export function mountShell(context:EnvironmentContext,options:{id:string;name:string;background:string;fog:[string,number,number];overviewFog?:[number,number];sky:SkyOptions;clouds?:Partial<CloudOptions>|false;layers:string[]}){
 const {scene,finish,low}=context;let reduced=context.reducedMotion;
 const root=new T.Group();root.name=options.name;root.userData={environmentId:options.id,decorative:true,layers:options.layers};scene.add(root);
 const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color(options.background);scene.fog=new T.Fog(...options.fog);
 const sky=createSkyDome(root,options.sky);
 if(options.clouds!==false)createCloudBanks(root,{finish,low,seed:options.id.length*17,...options.clouds});
 const staticRoot=new T.Group();staticRoot.name=options.id+'-static-scenery';root.add(staticRoot);
 const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
 const foreground=new T.Group();foreground.name=options.id+'-foreground';root.add(foreground);
 const animated:Animated[]=[],cleanups:(()=>void)[]=[];let disposed=false;
 return{root,staticRoot,features,foreground,
  animate(item:Animated){animated.push(item);item.setVisible?.(!(reduced&&item.motion));return item;},
  /** Release resources a tree walk cannot find (render targets). */
  onDispose(cleanup:()=>void){cleanups.push(cleanup);},
  finish():MountedEnvironment{
   batchStatic(staticRoot);
   return{root,
    update(time,_dt,signals){if(disposed)return;const t=reduced?0:time;for(const item of animated)item.update(t,signals);},
    frame(cameraX){sky.follow(cameraX);},
    setReducedMotion(value){reduced=value;for(const item of animated)if(item.motion)item.setVisible?.(!value);},
    setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?(options.overviewFog?.[0]??140):options.fog[1];fog.far=view==='overview'?(options.overviewFog?.[1]??380):options.fog[2];}foreground.visible=view!=='overview';},
    finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
    dispose(){if(disposed)return;disposed=true;for(const cleanup of cleanups)cleanup();disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
  },
 };
}

/** A simple round-bodied patrol creature built on the shared rig: each country
 * passes its own colours and a signature crest so no two look alike. */
export function roundCreature(parent:T.Object3D,options:{name:string;height:number;shell:string;belly:string;foot:string;eye?:string;crest:(rig:CreatureRig,b:{add:(object:T.Object3D)=>void})=>void;animate?:(rig:CreatureRig,time:number,state:CreatureState,moving:boolean)=>void}){
 const rig=createCreatureRig(parent,{name:options.name,height:options.height,feet:[-.12,.12],footColor:options.foot,footSize:[.07,.05,.09],stride:8,animate:options.animate});
 const h=options.height,white=matte('#fbf7ea'),pupil=matte(options.eye||'#1d1a18');
 ellipsoid(rig.body,matte(options.shell,.6),0,h*.42,0,h*.32,h*.36,h*.29,18);ellipsoid(rig.body,matte(options.belly),0,h*.36,h*.17,h*.2,h*.24,h*.12,14);
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*h*.1,h*.52,h*.25,h*.08,h*.1,h*.05,12);ellipsoid(rig.head,pupil,side*h*.1,h*.51,h*.29,h*.04,h*.05,h*.02,10);}
 options.crest(rig,{add:object=>rig.head.add(object)});
 return finishCreature(rig);
}

/** Merge a list of boxes and cylinders into one vertex-coloured mesh. */
export function built(parent:T.Object3D,name:string,make:(b:Builder,r:()=>number)=>void,seed=1,roughness=.88){const b=new Builder();make(b,random(seed));return b.mesh(parent,vertexMaterial(roughness),name);}
