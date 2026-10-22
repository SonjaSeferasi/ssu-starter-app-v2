import * as T from 'three';
import type {Course} from './levels';
import {tree,mushroom,island,terrainMaterials,mesh,link,seeded} from './scene-3d';

/** Midground geometry bridges the playable lane and the distant matte vista.
 * Every decorative object stays behind z=-4, outside the collision lane. */
export function biomeDetails(scene:T.Scene,course:Course){
 const root=new T.Group();root.name='layered-biome-geometry';scene.add(root);
 const r=seeded(course.number*614),width=course.width/100,world=course.number,mats=terrainMaterials(world);
 if(world===3){
  // The forest has massive trunks, roots, branching crowns and ivy, rather
  // than a line of identical small trees on otherwise empty platforms.
  for(let i=0;i<Math.ceil(width/9)+1;i++){
   const x=-4+i*9+r()*1.6,z=-11-r()*9,height=25+r()*6;
   tree(root,x,-17,z,height);
   const branch=link(root,new T.Vector3(x,3+r()*3,z),new T.Vector3(x+4,6+r()*2,z+2),.24,'#8e785a');
   (branch.material as T.MeshStandardMaterial).roughness=1;
  }
 }else{
  for(let i=0;i<Math.ceil(width/9)+2;i++){
   const x=-8+i*9+r()*3,z=-15-r()*9,top=-5+r()*5,w=5+r()*4;
   const p={x:x*100,y:-top*100,width:w*100,depth:5+r()*4};
   const shelf=island(root,p,world,mats,140+i,true);shelf.position.z=z;
   tree(root,x+w*.55,top,z,world===2?4+r()*2:5+r()*3,world===2);
   if(world===1&&i%2===0)mushroom(root,x+w*.2,top,z+1,1.6+r());
  }
 }
 // Close foliage along the rear edge lends scale without hiding the hero.
 const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.16,.14,.07,0,.36,.12,.16,.14,.07,0,.17,.15],3));leafGeo.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leafGeo.computeVertexNormals();
 const leaves=new T.InstancedMesh(leafGeo,new T.MeshStandardMaterial({color:'#66883b',roughness:.95,side:T.DoubleSide}),course.platforms.length*32),dummy=new T.Object3D();leaves.receiveShadow=true;
 course.platforms.forEach((p,j)=>{for(let i=0;i<32;i++){dummy.position.set((p.x+r()*p.width)/100,-p.y/100+.02,-(p.depth||3.2)*.5-.18);dummy.rotation.set(-.15,r()*Math.PI*2,(r()-.5)*1.1);dummy.scale.setScalar(.5+r()*.9);dummy.updateMatrix();leaves.setMatrixAt(j*32+i,dummy.matrix);leaves.setColorAt(j*32+i,new T.Color().setHSL(.21+r()*.055,.42,.24+r()*.14));}});root.add(leaves);
 if(world===2){
  // Ruined stepping stones and a complete stone arch mark the destination.
  const last=course.platforms[course.platforms.length-1],arch=new T.Group();arch.position.set(course.finish/100,-last.y/100,-1.1);root.add(arch);
  const stone=mats.rock.clone();stone.color.set('#d8c6a5');
  for(const sign of [-1,1])for(let i=0;i<5;i++)mesh(new T.BoxGeometry(.32,.32,.6),stone,arch,sign*.9,.16+i*.33,0);
  for(let i=0;i<13;i++){const a=i/12*Math.PI,block=mesh(new T.BoxGeometry(.3,.32,.6),stone,arch,Math.cos(a)*.9,1.55+Math.sin(a)*.9,0);block.rotation.z=a-Math.PI/2;}
 }
 return root;
}
