import * as T from 'three';
import type {Course} from './levels';
import {landingHeight} from './landing-geometry';
import {rng,styleFor,stoneTextures} from './toon-textures';

/** Small-scale geometry is confined to the edges of stationary platforms.
 * It never hides a moving collider or puts decoration in the walking corridor. */
export function referenceNature(parent:T.Object3D,course:Course){
 const root=new T.Group();root.name='reference-nature';parent.add(root);
 const world=course.number,r=rng(world*17831),style=styleFor(world),dummy=new T.Object3D();
 const rocks:T.Matrix4[]=[],plants:{matrix:T.Matrix4;color:T.Color}[]=[],moss:{matrix:T.Matrix4;color:T.Color}[]=[];
 const transform=(x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,ry=0,rz=0)=>{
  dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();return dummy.matrix.clone();
 };
 for(const p of [...course.platforms,...course.ledges]){
  if(p.motion||p.kind==='brick'||p.kind==='mushroom'||p.kind==='bamboo'||p.kind==='bridge')continue;
  const width=p.width/100,depth=p.depth||3.2;
  for(let x=.12;x<width-.1;x+=.22+r()*.22){
   const px=p.x/100+x,py=-landingHeight(p,p.x+x*100)/100;
   // Moss cushions and embedded stones break the straight turf seam.
   for(const side of [-1,1]){
    const z=side*depth*(.35+r()*.07),s=.1+r()*.18;
    moss.push({matrix:transform(px,py-.015,z,s*1.6,s*.55,s),color:new T.Color(style.blades[Math.floor(r()*4)]).multiplyScalar(.68+r()*.24)});
    if(p.kind==='rock'&&r()<.65)rocks.push(transform(px,py-.12-r()*.28,z,.17+r()*.26,.12+r()*.19,.18+r()*.26,r()*.5,r()*6,r()*.4));
   }
   if(r()>.64)continue;
   // A rosette of individually bent fronds, rather than a flat green card.
   const z=-depth*(.22+r()*.19),size=(world===3?.34:.21)+r()*.27;
   for(let k=0;k<7;k++){
    const angle=k*Math.PI*2/7+r()*.35;
    plants.push({matrix:transform(px,py,z,size,size*(.9+r()*.5),size,.22+r()*.36,angle,0),color:new T.Color().setHSL(.22+r()*.065,.58,.23+r()*.13)});
   }
  }
 }
 const stone=stoneTextures(world),rock=new T.IcosahedronGeometry(1,1),positions=rock.getAttribute('position');
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),n=1+Math.sin(x*17+y*9+z*11)*.14;
  positions.setXYZ(i,x*n,y*n,z*n);
 }rock.computeVertexNormals();
 const rockMat=new T.MeshStandardMaterial({map:stone.map,bumpMap:stone.bump,bumpScale:.025,color:'#e4ccaa',roughness:.98});
 const makeInstances=(geometry:T.BufferGeometry,material:T.Material,list:T.Matrix4[],colors?:T.Color[])=>{
  if(!list.length){geometry.dispose();material.dispose();return;}
  const mesh=new T.InstancedMesh(geometry,material,list.length);list.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(colors)mesh.setColorAt(i,colors[i]);});
  mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);
 };
 makeInstances(rock,rockMat,rocks);
 makeInstances(new T.SphereGeometry(1,8,5),new T.MeshStandardMaterial({roughness:1}),moss.map(p=>p.matrix),moss.map(p=>p.color));
 const frond=new T.BufferGeometry(),v:number[]=[],indices:number[]=[];
 // Paired leaflets run along a curved fern spine; one geometry is instanced.
 for(let j=0;j<9;j++){
  const t=j/9,y=t*.8,z=t*t*.8,span=Math.sin((t+.1)*Math.PI)*.32;
  for(const side of [-1,1]){const start=v.length/3;v.push(0,y,z,side*span,y+.1,z+.13,side*span*.65,y+.16,z+.18,0,y+.07,z+.06);indices.push(start,start+1,start+2,start,start+2,start+3);}
 }
 frond.setAttribute('position',new T.Float32BufferAttribute(v,3));frond.setIndex(indices);frond.computeVertexNormals();
 makeInstances(frond,new T.MeshStandardMaterial({roughness:.9,side:T.DoubleSide}),plants.map(p=>p.matrix),plants.map(p=>p.color));
 return root;
}

/** Soft shafts sit behind the route, with feathered edges and no depth writes. */
export function forestSunlight(parent:T.Object3D,width:number){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=256;
 const c=canvas.getContext('2d')!,across=c.createLinearGradient(0,0,64,0);
 across.addColorStop(0,'#ffebbb00');across.addColorStop(.35,'#ffebbb66');across.addColorStop(.5,'#fff0ccaa');across.addColorStop(.7,'#ffebbb44');across.addColorStop(1,'#ffebbb00');
 c.fillStyle=across;c.fillRect(0,0,64,256);c.globalCompositeOperation='destination-in';
 const fade=c.createLinearGradient(0,0,0,256);fade.addColorStop(0,'#fff0');fade.addColorStop(.2,'#fff');fade.addColorStop(.7,'#fff8');fade.addColorStop(1,'#fff0');c.fillStyle=fade;c.fillRect(0,0,64,256);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.16,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 for(let x=-9;x<width+12;x+=7.7){const shaft=new T.Mesh(new T.PlaneGeometry(2.6,27),material);shaft.position.set(x,2,-7.5);shaft.rotation.z=-.3;shaft.renderOrder=4;parent.add(shaft);}
}
