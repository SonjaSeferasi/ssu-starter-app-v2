import * as T from 'three';
import {random,v3} from './common';

/** Lightweight distant wildlife: instanced, animated by time only, never
 * placed on the playable lane and never part of physics. */
function wingGeometry(span:number){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,-.12,span,.02,0,0,0,.14, 0,0,-.12,0,0,.14,span*.55,.01,.02],3));g.computeVertexNormals();return g;}

export type FlockOptions={count:number;centre:[number,number,number];radius:[number,number,number];speed:number;size:number;color:string;wing?:string;seed:number;glide?:boolean;name?:string};
/** A flock of birds circling a centre with flapping wings. */
export function createFlock(parent:T.Object3D,options:FlockOptions){
 const root=new T.Group();root.name=options.name||'bird-flock';parent.add(root);const r=random(options.seed);
 const bodyMaterial=new T.MeshStandardMaterial({color:options.color,roughness:.8}),wingMaterial=new T.MeshStandardMaterial({color:options.wing||options.color,roughness:.8,side:T.DoubleSide});
 const body=new T.InstancedMesh(new T.SphereGeometry(1,6,4).scale(.09,.07,.3),bodyMaterial,options.count),left=new T.InstancedMesh(wingGeometry(-.5),wingMaterial,options.count),right=new T.InstancedMesh(wingGeometry(.5),wingMaterial,options.count);
 for(const m of [body,left,right]){m.castShadow=false;m.frustumCulled=false;root.add(m);}
 const birds=Array.from({length:options.count},()=>({phase:r()*Math.PI*2,lane:(r()-.5)*2,height:(r()-.5)*2,flap:6+r()*4,offset:r()*Math.PI*2}));
 const dummy=new T.Object3D(),wing=new T.Object3D(),[cx,cy,cz]=options.centre,[rx,ry,rz]=options.radius;
 const update=(time:number)=>{
  birds.forEach((b,i)=>{
   const a=b.phase+time*options.speed,x=cx+Math.cos(a)*rx+b.lane*1.2,z=cz+Math.sin(a)*rz,y=cy+b.height*ry+Math.sin(time*.7+b.offset)*.4,heading=Math.atan2(-Math.sin(a)*rx,Math.cos(a)*rz);
   dummy.position.set(x,y,z);dummy.rotation.set(0,heading,0);dummy.scale.setScalar(options.size);dummy.updateMatrix();body.setMatrixAt(i,dummy.matrix);
   const beat=options.glide&&Math.sin(time*.5+b.offset)>.2?.15:Math.sin(time*b.flap+b.offset)*.7;
   for(const [mesh,sign] of [[left,1],[right,-1]] as const){wing.position.copy(dummy.position);wing.rotation.set(0,heading,sign*beat);wing.scale.setScalar(options.size);wing.updateMatrix();mesh.setMatrixAt(i,wing.matrix);}
  });
  body.instanceMatrix.needsUpdate=left.instanceMatrix.needsUpdate=right.instanceMatrix.needsUpdate=true;
 };
 update(0);return{root,update};
}

/** A school of small fish swimming loops below a water surface. */
export function createSchool(parent:T.Object3D,options:{count:number;centre:[number,number,number];radius:[number,number];colors:string[];size:number;seed:number}){
 const shape=new T.Shape();shape.moveTo(-.5,0);shape.quadraticCurveTo(0,.32,.42,0);shape.lineTo(.62,.18);shape.lineTo(.62,-.18);shape.lineTo(.42,0);shape.quadraticCurveTo(0,-.32,-.5,0);
 const geometry=new T.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false});geometry.center();
 const fish=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color:'#ffffff',roughness:.4,metalness:.15}),options.count),r=random(options.seed),dummy=new T.Object3D();fish.name='fish-school';fish.castShadow=false;fish.frustumCulled=false;parent.add(fish);
 const seeds=Array.from({length:options.count},(_,i)=>{fish.setColorAt(i,new T.Color(options.colors[i%options.colors.length]));return{phase:r()*Math.PI*2,lane:v3((r()-.5)*2,(r()-.5)*.8,(r()-.5)*2),speed:.25+r()*.2};});
 const update=(time:number)=>{seeds.forEach((s,i)=>{const a=s.phase+time*s.speed,x=options.centre[0]+Math.cos(a)*options.radius[0]+s.lane.x,z=options.centre[2]+Math.sin(a)*options.radius[1]+s.lane.z;dummy.position.set(x,options.centre[1]+s.lane.y+Math.sin(time*2+s.phase)*.08,z);dummy.rotation.set(0,Math.atan2(Math.cos(a)*options.radius[1],Math.sin(a)*options.radius[0])+Math.sin(time*8+s.phase)*.12,0);dummy.scale.setScalar(options.size);dummy.updateMatrix();fish.setMatrixAt(i,dummy.matrix);});fish.instanceMatrix.needsUpdate=true;};
 update(0);return{fish,update};
}
