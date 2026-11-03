import * as T from 'three';
import {Builder,random,scatter,v3,valueNoise,vertexMaterial,type Placement} from '../../kit/common';

/** South American plant templates. Each returns one vertex-coloured geometry
 * (built once and cached), so a whole stand of one plant is a single
 * instanced draw. Placements vary scale, rotation and tint; `swaying` gives a
 * group a cheap vertex-shader breeze so foliage moves without per-frame CPU. */
export type FloraKind='emergent'|'mid-canopy'|'acai-palm'|'heliconia'|'big-leaf'|'ground-fern'|'liana-curtain'|'tepui-bromeliad'|'tepui-shrub'|'grass-clump';

function lump(seed:number,detail:number,rough=.24){
 const g=new T.IcosahedronGeometry(1,detail),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const v=v3(p.getX(i),p.getY(i),p.getZ(i)),n=valueNoise(v.x*1.9+seed,v.y*1.9+v.z*1.4,seed)*2-1;v.multiplyScalar(1+n*rough);p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return g;
}
/** A curved leaf blade: a shape bent along its length so it droops. */
function blade(length:number,width:number,droop:number,segments=6){
 const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(width,length*.2,width*.85,length*.75,0,length);shape.bezierCurveTo(-width*.85,length*.75,-width,length*.2,0,0);
 const g=new T.ShapeGeometry(shape,segments),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const y=p.getY(i)/length;p.setZ(i,-droop*y*y*length);}
 g.computeVertexNormals();return g;
}
function frond(length:number,droop:number,width:number,leaflets:number){
 const positions:number[]=[],spine=(t:number)=>v3(0,Math.sin(t*Math.PI*.55)*length*.3-t*t*droop,t*length);
 for(let i=0;i<leaflets;i++){const t=(i+.5)/leaflets,a=spine(t),b=spine(Math.min(1,t+1/leaflets)),w=width*Math.sin(Math.PI*Math.min(1,t*1.1))*(1-t*.25);for(const side of [-1,1]){const tip=a.clone().add(v3(side*w,-w*.7,w*.15));positions.push(...a.toArray(),...tip.toArray(),...b.toArray());}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}

const cache=new Map<string,T.BufferGeometry>();
export function floraGeometry(kind:FloraKind,variant=0,low=false):T.BufferGeometry{
 const key=`${kind}:${variant}:${low}`,hit=cache.get(key);if(hit)return hit;
 const b=new Builder(),r=random(7000+variant*131+kind.length*17),detail=low?0:1,greens=['#2c6b2f','#3d7f36','#4f9140','#2f5e2a','#5a9a3f'];
 switch(kind){
  case'emergent':{
   // A rainforest giant: straight pale trunk, plank buttresses, a few big
   // limbs, and a broad crown built of many separate leaf clusters.
   const h=16+r()*5;b.add(new T.CylinderGeometry(.42,.7,h,low?7:11),'#8a7f6c',[0,h/2,0],[0,0,0],[1,1,1],.07);
   for(let i=0;i<6;i++){const a=i/6*Math.PI*2+r()*.4,fin=new T.BufferGeometry();fin.setAttribute('position',new T.Float32BufferAttribute([0,0,-.1,2.4,0,-.03,0,3.6,-.08,0,0,.1,0,3.6,.08,2.4,0,.03,0,0,-.1,0,3.6,-.08,0,0,.1,0,0,.1,0,3.6,-.08,0,3.6,.08],3));fin.computeVertexNormals();b.add(fin,'#7d725f',[Math.cos(a)*.35,0,Math.sin(a)*.35],[0,-a,0],[1,1,1],.1);}
   for(let i=0;i<5;i++){const a=i*1.3+r(),end=v3(Math.cos(a)*(3+r()*1.5),h+1.5+r()*1.5,Math.sin(a)*(2.4+r()));b.strut(v3(0,h-2.5,0),end,.22,'#7d725f',6);}
   for(let i=0;i<(low?9:20);i++){const a=r()*Math.PI*2,rad=1+r()*4.2,y=h+1.4+r()*2.6-rad*.18;b.add(lump(i+variant*7,detail,.28),greens[i%5],[Math.cos(a)*rad,y,Math.sin(a)*rad*.85],[0,r()*3,0],[1.5+r()*.9,.8+r()*.35,1.3+r()*.6],.14);}
   for(let i=0;i<(low?2:5);i++){const a=r()*Math.PI*2,x=Math.cos(a)*(2+r()*2),z=Math.sin(a)*(1.6+r()*1.5),len=4+r()*6;b.add(new T.CylinderGeometry(.035,.03,len,4),'#4a6b34',[x,h+.8-len/2,z]);}
   break;
  }
  case'mid-canopy':{
   const h=7+r()*3;b.add(new T.CylinderGeometry(.18,.3,h,low?6:8),'#7a6a55',[0,h/2,0],[0,0,0],[1,1,1],.08);
   for(let i=0;i<(low?5:11);i++){const a=r()*Math.PI*2,rad=r()*2.2;b.add(lump(i+variant*5+30,detail,.26),greens[(i+2)%5],[Math.cos(a)*rad,h+.4+r()*1.6,Math.sin(a)*rad*.8],[0,r()*3,0],[1.1+r()*.6,.75+r()*.3,1+r()*.4],.14);}
   break;
  }
  case'acai-palm':{
   // A clump of slender stems, each with a drooping crown of fine fronds.
   for(let s=0;s<(low?2:4);s++){const ox=(r()-.5)*.9,oz=(r()-.5)*.9,h=6+r()*4,lean=(r()-.5)*.6;
    const top=v3(ox+lean,h,oz);b.strut(v3(ox,0,oz),top,.07,'#9a8f7a',5,.9);
    for(let i=0;i<(low?6:10);i++){const a=i/(low?6:10)*Math.PI*2+r()*.2;b.add(frond(2.2,1.3,.22,low?7:12),i%2?'#3f8a3a':'#4f9a45',[top.x,top.y,top.z],[-.2,a,0],[1,1,1],.12);}}
   break;
  }
  case'heliconia':{
   for(let i=0;i<(low?4:7);i++){const a=i/7*Math.PI*2+r()*.5,len=1.4+r()*.6;b.add(blade(len,.28,.25),i%2?'#3f9a3c':'#56ad48',[Math.cos(a)*.1,.05,Math.sin(a)*.1],[-.35,a,0],[1,1,1],.08);}
   for(let k=0;k<(low?1:3);k++){const x=(r()-.5)*.5,y=.9+r()*.5;for(let i=0;i<5;i++)b.add(new T.ConeGeometry(.07,.32,4),i%2?'#e0402f':'#f2b33a',[x+(i%2?.12:-.12),y-i*.16,(r()-.5)*.2],[0,0,(i%2?1:-1)*1.1]);b.add(new T.CylinderGeometry(.02,.025,y,4),'#4f7a35',[x,y/2,0]);}
   break;
  }
  case'big-leaf':{
   for(let i=0;i<(low?3:6);i++){const a=i/6*Math.PI*2+r()*.4,stalk=.6+r()*.5;b.add(new T.CylinderGeometry(.025,.03,stalk,4),'#4a7a35',[Math.cos(a)*.15,stalk/2,Math.sin(a)*.15],[Math.sin(a)*.35,0,-Math.cos(a)*.35]);
    b.add(blade(1.1+r()*.4,.6+r()*.2,.4,8),i%2?'#2f7a34':'#3f8a3c',[Math.cos(a)*.4,stalk,Math.sin(a)*.4],[-.9,a,0],[1,1,1],.06);}
   break;
  }
  case'ground-fern':{
   for(let i=0;i<(low?5:9);i++){const a=i/9*Math.PI*2+r()*.3;b.add(frond(1+r()*.4,.55,.16,low?6:10),i%2?'#4f8a35':'#62a045',[0,.05,0],[-.5,a,0],[1,1,1],.1);}
   break;
  }
  case'liana-curtain':{
   // Hanging lianas and aerial roots, with leaves along the upper half.
   for(let i=0;i<(low?4:9);i++){const x=(r()-.5)*2.4,len=3+r()*5,sway=(r()-.5)*.5;b.add(new T.TubeGeometry(new T.CatmullRomCurve3([v3(x,0,0),v3(x+sway,-len*.5,.1),v3(x-sway*.4,-len,0)]),8,.025+r()*.02,4,false),'#556b35');
    for(let k=0;k<(low?2:5);k++)b.add(blade(.25,.1,.05,3),k%2?'#4f9a3c':'#3f7f33',[x+sway*k/5,-len*k/6,.05],[r(),r()*6,r()]);}
   break;
  }
  case'tepui-bromeliad':{
   // A tank bromeliad of the tepui summits: stiff, upturned, reddish leaves.
   for(let i=0;i<(low?7:13);i++){const a=i/13*Math.PI*2+r()*.2;b.add(blade(.7+r()*.3,.13,-.15,4),i%3?'#a8a04a':'#c26a3a',[0,.05,0],[-.45,a,0],[1,1,1],.12);}
   break;
  }
  case'tepui-shrub':{
   for(let i=0;i<(low?3:6);i++){const a=i*2.1;b.add(lump(i+variant+60,detail,.3),i%2?'#4f6a3a':'#6a7a45',[Math.cos(a)*.35,.3+r()*.3,Math.sin(a)*.3],[0,0,0],[.5+r()*.2,.35,.45],.16);}
   for(let i=0;i<(low?2:5);i++)b.add(new T.IcosahedronGeometry(.06,0),'#f2e2a0',[(r()-.5)*.8,.65+r()*.2,(r()-.5)*.6]);
   break;
  }
  case'grass-clump':{
   for(let i=0;i<(low?5:10);i++){const a=i/10*Math.PI*2+r(),h=.5+r()*.5,g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.03,0,0,.03,0,0,Math.sin(a)*.2,h,Math.cos(a)*.2],3));g.computeVertexNormals();b.add(g,i%2?'#6a9a3a':'#8aae4f',[Math.cos(a)*.06,0,Math.sin(a)*.06],[0,a,0],[1,1,1],.15);}
   break;
  }
 }
 const geometry=b.geometry();geometry.computeBoundingSphere();cache.set(key,geometry);return geometry;
}

/** A material whose vertices sway in a breeze, phase-shifted per instance and
 * growing with height. Update `time` once per frame. */
export function swayingMaterial(amplitude=.05,roughness=.85){
 const time={value:0},material=vertexMaterial(roughness,{side:T.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.swayTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float swayTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
   float swayPhase=0.;
   #ifdef USE_INSTANCING
    swayPhase=instanceMatrix[3].x*.37+instanceMatrix[3].z*.21;
   #endif
   float swayHeight=max(0.,position.y);
   transformed.x+=sin(swayTime*1.3+swayPhase+position.y*.35)*${amplitude.toFixed(3)}*swayHeight;
   transformed.z+=cos(swayTime*1.1+swayPhase*1.3)*${(amplitude*.6).toFixed(3)}*swayHeight;`);
 };
 material.customProgramCacheKey=()=>`sway-${amplitude}`;
 return{material,time};
}

/** Plant a stand of one template as a single instanced draw. */
export function plantFlora(parent:T.Object3D,kind:FloraKind,placements:Placement[],options:{low?:boolean;variant?:number;name?:string;sway?:number;shadows?:boolean}={}){
 const geometry=floraGeometry(kind,options.variant??0,!!options.low).clone();
 const swaying=options.sway?swayingMaterial(options.sway):null,material=swaying?.material??vertexMaterial(.85,{side:T.DoubleSide});
 const stand=scatter(parent,geometry,material,placements,options.name||'flora-'+kind,options.shadows??false);stand.userData.decorative=true;stand.userData.kind=kind;
 return{stand,update:(time:number)=>{if(swaying)swaying.time.value=time;}};
}
