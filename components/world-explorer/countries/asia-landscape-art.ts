import * as T from 'three';
import {Builder,fbm,random,vertexMaterial,boxUV} from '../kit/common';
import {markSurface} from '../kit/surface-maps';

/** A continuous folded massif with connected crests, rather than cone peaks. */
export function foldedMassif(seed:number,height:number,peaks=8){
 return(u:number,v:number)=>{
  const edge=Math.max(0,Math.min(1,Math.min(u,1-u,v,1-v)*10));
  const crest=.43+.06*Math.sin(u*19+seed),section=Math.max(0,1-Math.abs(v-crest)*2.15);
  const skyline=.48+.27*Math.abs(Math.sin(u*peaks*Math.PI+seed))+.21*fbm(u*25,0,seed,3);
  const ribs=1-.15*Math.abs(Math.sin(u*115+v*13+fbm(u*18,v*14,seed,3)*3));
  return height*skyline*Math.pow(section,1.6)*ribs*edge;
 };
}

/** Decorative shore and rock meshes. No geometry in this module enters physics. */
export function shoreIsland(parent:T.Object3D,o:{name:string;x:number;y:number;z:number;width:number;depth:number;height:number;color:string;seed:number;stone?:boolean}){
 const shape=new T.Shape(),n=64;
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=1+.075*Math.sin(a*3+o.seed)+.035*Math.sin(a*7-o.seed),x=Math.cos(a)*o.width*.5*r,z=Math.sin(a)*o.depth*.5*r;if(i)shape.lineTo(x,z);else shape.moveTo(x,z);}shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth:o.height,bevelEnabled:true,bevelSize:.16,bevelThickness:.12,bevelSegments:2});g.rotateX(-Math.PI/2);g.translate(o.x,o.y-o.height,o.z);boxUV(g,.35);
 const m=new T.MeshStandardMaterial({color:o.color,roughness:.96});if(o.stone)markSurface(m,'limestone','#e2d6ba',.45);
 const mesh=new T.Mesh(g,m);mesh.name=o.name;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.decorative=true;parent.add(mesh);return mesh;
}

/** Eroded, closed column. The upper perimeter stays level to ground scenery. */
export function erodedColumn(parent:T.Object3D,o:{name:string;x:number;y:number;z:number;radius:number;height:number;seed:number;color:string;top?:string;segments?:number;banded?:boolean}){
 const n=o.segments??20,rings=12,g=new T.CylinderGeometry(o.radius*.88,o.radius,o.height,n,rings),p=g.getAttribute('position'),cs:number[]=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=(y+o.height/2)/o.height,a=Math.atan2(z,x),r=1+.075*Math.sin(a*5+o.seed)+.05*Math.sin(a*9-o.seed)+Math.sin(t*13+o.seed)*.04-.07*Math.pow(Math.max(0,Math.sin(a*7+o.seed)),6)*Math.sin(t*Math.PI);p.setXYZ(i,x*r,y,z*r);const c=new T.Color(t>.995?(o.top??o.color):o.color);c.multiplyScalar(o.banded?.87+.15*Math.sin(t*34)+.04*Math.sin(t*83):.87+.13*fbm(x*.5,y*.4,o.seed,3));cs.push(c.r,c.g,c.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(cs,3));g.computeVertexNormals();boxUV(g,.22);const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.97});markSurface(m,'limestone','#ddd4c3',.3);const mesh=new T.Mesh(g,m);mesh.position.set(o.x,o.y+o.height/2,o.z);mesh.name=o.name;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.decorative=true;parent.add(mesh);return mesh;
}

/** Courtyard-scale facade detailing, batched by its caller. */
export function facadeCourses(b:Builder,o:{x:number;y:number;z:number;w:number;h:number;color:string;trim:string;seed:number;windows?:boolean}){
 const r=random(o.seed);for(let row=0;row<Math.floor(o.h/.65);row++)for(let x=-o.w/2+.35+(row%2)*.33;x<o.w/2-.2;x+=.8){if(r()<.17)continue;b.add(new T.BoxGeometry(.7,.025,.025),o.trim,[o.x+x,o.y+.3+row*.65,o.z]);}
 if(o.windows)for(let x=-o.w/2+1;x<o.w/2-.5;x+=1.8){b.add(new T.BoxGeometry(.7,1,.055),'#4c514c',[o.x+x,o.y+o.h*.6,o.z+.025]);b.add(new T.BoxGeometry(.9,.12,.15),o.color,[o.x+x,o.y+o.h*.6+.55,o.z+.04]);}
}
