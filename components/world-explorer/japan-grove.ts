import * as T from 'three';
import {batchStatic, mesh, random} from './scenic-kit';

type Crown={point:T.Vector3;radius:number;flatten:number};

/** A small, cupped five-petal flower. The canopy consists of actual blossoms,
 * with gaps revealing the branch structure, rather than opaque pink spheres. */
function cherryBlossomGeometry(){
 const positions:number[]=[0,0,.012],colors:number[]=[1,.88,.51],indices:number[]=[];
 // Five samples across each petal produce a broad rounded outer arc, rather
 // than the triangular points that made the previous blossoms read as stars.
 const angles=[-.5,-.24,0,.24,.5],radii=[.46,.91,1,.91,.46];
 for(let petal=0;petal<5;petal++)for(let edge=0;edge<5;edge++){
  const a=petal*Math.PI*2/5+angles[edge],r=radii[edge],outer=edge>0&&edge<4;
  positions.push(Math.sin(a)*r,Math.cos(a)*r,outer?.13+.065*(edge===2?1:0):0);
  colors.push(1,outer?.94:.8,outer?.98:.9);
 }
 for(let i=1;i<=25;i++)indices.push(0,i,i===25?1:i+1);
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Tapering, slightly furrowed limbs avoid the uniform hose-like branches of
 * the earlier tree. Small longitudinal ridges also catch the spring sunlight. */
function limb(parent:T.Object3D,material:T.MeshStandardMaterial,points:T.Vector3[],radius:number,seed:number,low:boolean){
 const r=random(seed),curve=new T.CatmullRomCurve3(points),steps=low?5:8,radial=low?5:7;
 const geometry=new T.TubeGeometry(curve,steps,radius,radial,false),p=geometry.getAttribute('position'),colors:number[]=[];
 const dark=new T.Color('#3b302c'),light=new T.Color('#9a7970');
 for(let row=0;row<=steps;row++){
  const t=row/steps,center=curve.getPointAt(t),taper=1-t*.78;
  for(let i=0;i<=radial;i++){
   const index=row*(radial+1)+i,v=new T.Vector3().fromBufferAttribute(p,index);
   v.sub(center).multiplyScalar(taper*(1+Math.sin(i*2.6+seed)*.085)).add(center);
   p.setXYZ(index,v.x,v.y,v.z);
   const c=dark.clone().lerp(light,.28+Math.sin(i*1.9+seed)*.14+r()*.17);colors.push(c.r,c.g,c.b);
  }
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const branch=mesh(parent,geometry,material);branch.name='tapered-cherry-limb';return branch;
}

/** Original, seed-stable spring cherry tree. Keep its base behind the gameplay
 * lane (normally z <= -3). Scale is world-space and the unscaled crown is about
 * 4 units wide by 3.6 high. Static wood merges to one draw and the dense cupped
 * blossom canopy is a second instanced draw, with no external texture assets. */
export function createCherryGroveTree(parent:T.Object3D,x:number,y:number,z:number,size:number,seed:number,low:boolean){
 const root=new T.Group();root.name='japan-branching-cherry-tree';
 root.position.set(x,y,z);root.scale.setScalar(size);parent.add(root);
 root.userData.botanicalStyle='irregular-branching-five-petal-sakura';
 root.userData.decorative=true;
 const r=random(seed),wood=new T.MeshStandardMaterial({vertexColors:true,roughness:.98});
 const woodRoot=new T.Group();woodRoot.name='cherry-visible-branch-structure';root.add(woodRoot);
 limb(woodRoot,wood,[new T.Vector3(0,0,0),new T.Vector3(-.13,.72,.06),new T.Vector3(.05,1.45,.02),new T.Vector3(-.12,2.37,-.08)],.19,seed,low);
 // Broad low forks and higher secondary limbs form an asymmetric mature tree.
 const crowns:Crown[]=[],count=low?7:11;
 for(let i=0;i<count;i++){
  const a=i*2.399963+seed*.13,extent=.77+r()*.77;
  const start=new T.Vector3(-.02,1.04+(i%4)*.23,.02);
  const end=new T.Vector3(Math.cos(a)*extent,2.12+r()*.96,Math.sin(a)*extent*.64);
  const elbow=new T.Vector3(end.x*.4,start.y+.59,end.z*.46);
  limb(woodRoot,wood,[start,elbow,end],.059+(i%3)*.012,seed+i*17,low);
  crowns.push({point:end.clone().add(new T.Vector3(0,.06,0)),radius:.53+r()*.21,flatten:.67+r()*.12});
  const split=end.clone().add(new T.Vector3(Math.cos(a+.9)*.43,.12+r()*.16,Math.sin(a+.9)*.29));
  limb(woodRoot,wood,[elbow.clone().lerp(end,.63),end.clone().add(new T.Vector3(0,.02,0)),split],.024,seed+i*23+4,true);
  crowns.push({point:split,radius:.38+r()*.15,flatten:.7});
 }
 for(let i=0;i<(low?3:5);i++){
  const a=i*Math.PI*2/5+.2;
  limb(woodRoot,wood,[new T.Vector3(Math.cos(a)*.46,.018,Math.sin(a)*.29),new T.Vector3(Math.cos(a)*.18,.075,Math.sin(a)*.13),new T.Vector3(0,.31,0)],.055,seed+i*7,true);
 }
 batchStatic(woodRoot);
 const flowerCount=low?440:1280;
 const flowers=new T.InstancedMesh(cherryBlossomGeometry(),new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,roughness:.88}),flowerCount);
 flowers.name='instanced-cherry-blossoms';flowers.castShadow=false;flowers.receiveShadow=true;
 const dummy=new T.Object3D(),normal=new T.Vector3(),axis=new T.Vector3(0,0,1),pink=new T.Color();
 const palette=['#ec78aa','#ef97bd','#f6b5d0','#ffd1e2','#df6d9e'];
 for(let i=0;i<flowerCount;i++){
  const crown=crowns[i%crowns.length],a=r()*Math.PI*2,v=r()*2-1,horizontal=Math.sqrt(1-v*v);
  // Most blossoms sit on the twig tips; others fill the inner depth in darker
  // tones, creating volume without a solid blob behind the flowers.
  const inner=i%3===0,radius=crown.radius*(inner?.12+r()*.64:.7+r()*.3);
  normal.set(Math.cos(a)*horizontal,v*crown.flatten,Math.sin(a)*horizontal*.82).normalize();
  dummy.position.copy(crown.point).add(new T.Vector3(Math.cos(a)*horizontal*radius,v*radius*crown.flatten,Math.sin(a)*horizontal*radius*.82));
  normal.lerp(axis,.23).normalize();dummy.quaternion.setFromUnitVectors(axis,normal);
  dummy.rotateZ(r()*Math.PI*2);dummy.scale.setScalar((low?.105:.077)+r()*.061);dummy.updateMatrix();
  flowers.setMatrixAt(i,dummy.matrix);
  pink.set(palette[Math.floor(r()*palette.length)]).multiplyScalar(inner?.77:.95+r()*.05);flowers.setColorAt(i,pink);
 }
 flowers.instanceMatrix.needsUpdate=true;if(flowers.instanceColor)flowers.instanceColor.needsUpdate=true;root.add(flowers);
 root.userData.blossomCount=flowerCount;
 return root;
}
