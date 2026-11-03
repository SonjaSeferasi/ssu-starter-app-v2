import * as T from 'three';
import {random} from './common';

export type DriftKind='petal'|'leaf'|'snow'|'dust'|'pollen'|'spark'|'mist';
export type DriftOptions={kind:DriftKind;count:number;colors:string[];x:[number,number];y:[number,number];z:[number,number];fall:number;sway:number;size:number;seed:number;name?:string;emissive?:boolean};

function shapeFor(kind:DriftKind){
 if(kind==='mist')return new T.SphereGeometry(.5,10,6);
 if(kind==='snow'||kind==='pollen'||kind==='spark'||kind==='dust')return new T.IcosahedronGeometry(.5,0);
 const shape=new T.Shape();
 if(kind==='leaf'){shape.moveTo(0,-.5);shape.quadraticCurveTo(.38,0,0,.5);shape.quadraticCurveTo(-.38,0,0,-.5);}
 else for(let i=0;i<=30;i++){const a=i/30*Math.PI*2,r=.5*(.77+.23*Math.cos(a*5));if(!i)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
 return new T.ShapeGeometry(shape);
}

/** A bounded, wrapping drift of small particles in one instanced draw. Falling
 * kinds descend and wrap; `fall<0` rises (mist, fireflies). Horizontal wind can
 * be added per frame, for example to show an approaching sand gust. The effect
 * never interacts with physics. */
export function createDrift(parent:T.Object3D,options:DriftOptions){
 const r=random(options.seed),geometry=shapeFor(options.kind),glow=options.emissive||options.kind==='spark';
 const soft=options.kind==='dust'||options.kind==='mist',material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,side:T.DoubleSide,transparent:soft||glow,opacity:options.kind==='mist'?.1:options.kind==='dust'?.55:1,depthWrite:!(soft||glow),emissive:glow?'#ffffff':'#000000',emissiveIntensity:glow?.9:0});
 const mesh=new T.InstancedMesh(geometry,material,Math.max(1,options.count)),dummy=new T.Object3D();mesh.name=options.name||'drift-'+options.kind;mesh.castShadow=false;mesh.frustumCulled=false;parent.add(mesh);
 const [x0,x1]=options.x,[y0,y1]=options.y,[z0,z1]=options.z,height=y1-y0,span=x1-x0;
 const seeds=Array.from({length:options.count},(_,i)=>{mesh.setColorAt(i,new T.Color(options.colors[i%options.colors.length]).multiplyScalar(.9+r()*.2));return{x:x0+r()*span,y:r()*height,z:z0+r()*(z1-z0),phase:r()*Math.PI*2,speed:.6+r()*.8,scale:.6+r()*.8};});
 let wind=0,offset=0,last=0;
 const update=(time:number,gust=0)=>{
  const dt=Math.max(0,Math.min(.1,time-last));last=time;wind+=(gust-wind)*Math.min(1,dt*3);offset+=wind*dt;
  for(let i=0;i<seeds.length;i++){
   const s=seeds[i],fall=options.fall*s.speed,y=fall>=0?((s.y-time*fall)%height+height)%height:((s.y-time*fall)%height+height)%height,x=((s.x-x0+Math.sin(time*.4+s.phase)*options.sway+offset*s.speed)%span+span)%span+x0;
   dummy.position.set(x,y0+y,s.z+Math.cos(time*.3+s.phase)*options.sway*.4);
   if(options.kind==='mist'){dummy.rotation.set(0,0,0);}else dummy.rotation.set(Math.sin(time+s.phase)*.9,Math.cos(time*.6+s.phase)*.8,s.phase+time*.5);
   const flicker=options.kind==='spark'?.55+.45*Math.sin(time*3+s.phase):1;dummy.scale.setScalar(options.size*s.scale*flicker);if(options.kind==='mist')dummy.scale.set(options.size*s.scale*2.2,options.size*s.scale*.7,options.size*s.scale*1.4);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
 };
 update(0);return{mesh,update,setVisible(visible:boolean){mesh.visible=visible;}};
}
