import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Course,Platform} from './levels';
import {landingHeight,landingBottom} from './landing-geometry';
import {seeded} from './scene-3d';

// Scanned rock geometry is attached beneath each lip. Even shallow moving
// ledges keep their stones inside the shared collision underside.
export function rockDetail(parent:T.Object3D,platforms:{base:Platform;at:Platform;object:T.Group}[],course:Course){
 let disposed=false;const own:T.Object3D[]=[],resources:T.Object3D[]=[];
 void new GLTFLoader().loadAsync('/jumpyland/pbr/rocks/rocks-low.gltf').then(gltf=>{
  if(disposed){dispose([gltf.scene]);return;}
  resources.push(gltf.scene);const source:T.Mesh[]=[];gltf.scene.traverse(o=>{if(o instanceof T.Mesh)source.push(o);});
  for(const object of source){const original=object.geometry;object.geometry=original.clone();object.geometry.computeBoundingBox();const bounds=object.geometry.boundingBox!,center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),scale=Math.max(size.x,size.z);object.geometry.translate(-center.x,-bounds.max.y,-center.z);object.geometry.scale(1/scale,1/scale,1/scale);original.dispose();object.geometry.computeBoundingBox();}
  for(let i=0;i<platforms.length;i++){
   const p=platforms[i],w=p.base.width/100,depth=p.base.depth||3.2,r=seeded(i+94),count=Math.max(8,Math.floor(w*5)),bottom=landingBottom(course,p.base);
   for(let variant=0;variant<source.length;variant++){
    const n=Math.ceil(count/source.length),stones=new T.InstancedMesh(source[variant].geometry,source[variant].material,n),dummy=new T.Object3D();stones.castShadow=stones.receiveShadow=true;
    const sourceHeight=-source[variant].geometry.boundingBox!.min.y;
    for(let j=0;j<n;j++){
     const a=(j*source.length+variant)/count*Math.PI*2,x=w/2+Math.cos(a)*w*.43,z=Math.sin(a)*depth*.43,lip=landingHeight(p.base,p.base.x+x*100),available=Math.max(.05,(bottom-lip)/100-.045),scale=.45+r()*.45;
     dummy.position.set(x,-lip/100-.035,z);dummy.scale.set(scale,Math.min(.65+r()*.4,available/sourceHeight),scale);dummy.rotation.y=a+r();dummy.updateMatrix();stones.setMatrixAt(j,dummy.matrix);
    }
    p.object.add(stones);own.push(stones);
   }
  }
 }).catch(()=>{/* The complete procedural terrain remains available offline. */});
 return()=>{disposed=true;dispose([...own,...resources]);for(const object of own)object.removeFromParent();};
}
function dispose(roots:T.Object3D[]){
 const geometry=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 for(const root of roots)root.traverse(object=>{if(object instanceof T.Mesh){geometry.add(object.geometry);for(const mat of Array.isArray(object.material)?object.material:[object.material]){materials.add(mat);for(const value of Object.values(mat))if(value instanceof T.Texture)textures.add(value);}}});
 geometry.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());
}
