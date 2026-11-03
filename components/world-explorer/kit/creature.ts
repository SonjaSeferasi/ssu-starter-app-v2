import * as T from 'three';
import {batchStatic,ellipsoid,matte} from './common';

export type CreatureState='IDLE'|'PATROL_LEFT'|'PATROL_RIGHT'|'TURN'|'ALERT'|'STUNNED'|'DISABLED';
export type CreatureRig={root:T.Group;figure:T.Group;body:T.Group;head:T.Group;feet:T.Group[];extras:Record<string,T.Group>;update:(time:number,facing:1|-1,state:CreatureState)=>void};

/** Merge opaque coloured parts into one vertex-coloured mesh per animation
 * pivot, so a creature costs a handful of draw calls. */
export function paletteBatch(root:T.Object3D,roughness=.8){
 const retired=new Set<T.Material>(),material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness});
 root.traverse(object=>{
  if(!(object instanceof T.Mesh)||!(object.material instanceof T.MeshStandardMaterial)||object.material.transparent||object.material.emissiveIntensity>0||object.material.metalness>0)return;
  const previous=object.material,count=object.geometry.getAttribute('position').count,colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){colors[i*3]=previous.color.r;colors[i*3+1]=previous.color.g;colors[i*3+2]=previous.color.b;}
  object.geometry.setAttribute('color',new T.BufferAttribute(colors,3));object.material=material;retired.add(previous);
 });
 batchStatic(root);retired.forEach(previous=>previous.dispose());
}

/** Shared skeleton for the original patrol creatures. Ground origin is y=0; the
 * simulation owns position and collision. `animate` adds a creature's own
 * motion (wings, rolling, glow) on top of the common walk cycle. */
export function createCreatureRig(parent:T.Object3D,options:{name:string;height:number;feet:number[];footColor:string;footSize?:[number,number,number];stride?:number;turn?:number;animate?:(rig:CreatureRig,time:number,state:CreatureState,moving:boolean)=>void}){
 const root=new T.Group(),figure=new T.Group(),body=new T.Group(),head=new T.Group();
 root.name=options.name;root.userData.originalCharacter=true;root.userData.height=options.height;root.userData.collisionOwner='level-simulation';
 parent.add(root);root.add(figure);figure.add(body,head);
 const [fx,fy,fz]=options.footSize??[.06,.06,.09],foot=matte(options.footColor),feet:T.Group[]=[];
 options.feet.forEach((x,i)=>{const g=new T.Group();g.position.set(x,fy*2,i%2?.04:-.04);g.name=`${options.name}-foot-${i}`;figure.add(g);ellipsoid(g,foot,0,-fy,.02,fx,fy,fz,10);feet.push(g);});
 let previous:1|-1=1,turn=0;
 const rig:CreatureRig={root,figure,body,head,feet,extras:{},update(time,facing,state){
  const clock=Number.isFinite(time)?Math.max(0,time):0,moving=state==='PATROL_LEFT'||state==='PATROL_RIGHT',direction=facing===-1?-1:1;
  root.visible=state!=='DISABLED';root.userData.state=state;
  if(direction!==previous){previous=direction;turn=1;}turn=Math.max(0,turn-.06);
  const angle=direction*(options.turn??1.08);figure.rotation.y+=(angle-figure.rotation.y)*.18;
  const stride=options.stride??7;figure.position.y=moving?Math.abs(Math.sin(clock*stride))*.015:0;
  feet.forEach((f,i)=>{f.rotation.x=moving?Math.sin(clock*stride+i*Math.PI)*.3:0;});
  head.rotation.y=state==='IDLE'||state==='TURN'?Math.sin(clock*2.2)*.45:0;head.rotation.z=state==='ALERT'?-direction*.12:Math.sin(clock*1.8)*.015;
  body.rotation.z=state==='ALERT'?-direction*.05:0;
  options.animate?.(rig,clock,state,moving);
 }};
 return rig;
}
export function finishCreature(rig:CreatureRig){for(const group of [rig.body,rig.head,...rig.feet,...Object.values(rig.extras)])paletteBatch(group);rig.update(0,1,'IDLE');return rig;}
