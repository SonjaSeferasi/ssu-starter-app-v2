import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {batchStatic,island} from '../components/world-explorer/scenic-kit';
import {dressJapanPlatform} from '../components/world-explorer/japan-terrain';
import {woodenPlatform} from '../components/world-explorer/country-scene';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';

function build(quality:'standard'|'low'='standard',id='jp-terrain-regression'){
 const definition={id,x:13,y:1.4,width:8,depth:3.4,thickness:3,type:'stone'};
 const root=island(new T.Scene(),definition.x+definition.width/2,definition.y,definition.width,definition.depth,'temperate',17,definition.thickness);
 const details=dressJapanPlatform(root,definition,{quality});root.updateMatrixWorld(true);return{root,details,definition};
}

function dispose(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 root.traverse(object=>{if(!(object instanceof T.Mesh))return;if(object instanceof T.InstancedMesh)object.dispose();geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);}});
 textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());root.removeFromParent();
}

function surface(root:T.Group){const cliff=root.getObjectByName('country-platform-cliff') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;expect(cliff).toBeDefined();return cliff.material;}

describe('Japan terrain keeps rich scenery separate from gameplay collision',()=>{
 it('keeps dense centre-line raycasts on the unchanged walking cap before and after batching',()=>{
  const {root,definition}=build(),originalPosition=root.position.clone(),expectedY=definition.y+.015;
  const samples=Array.from({length:57},(_,i)=>definition.x+.13+i*(definition.width-.26)/56);
  const check=()=>{root.updateMatrixWorld(true);for(const x of samples){const ray=new T.Raycaster(new T.Vector3(x,9,0),new T.Vector3(0,-1,0)),hit=ray.intersectObject(root,true)[0];if(!hit||Math.abs(hit.point.y-expectedY)>.0001)throw new Error(`Terrain changed the walking cap at x=${x}: ${hit?.point.y}`);}};
  check();batchStatic(root);check();expect(root.position.equals(originalPosition)).toBe(true);dispose(root);
 });

 it('keeps every transformed foliage vertex out of the readable walking corridor above the ground',()=>{
  const {root,details}=build(),inverseRoot=root.matrixWorld.clone().invert(),instance=new T.Matrix4(),transform=new T.Matrix4(),position=new T.Vector3();let checked=0;
  details.traverse(object=>{
   if(!(object instanceof T.Mesh))return;const vertices=object.geometry.getAttribute('position'),instances=object instanceof T.InstancedMesh?object.count:1;
   for(let index=0;index<instances;index++){
    transform.copy(inverseRoot).multiply(object.matrixWorld);if(object instanceof T.InstancedMesh){object.getMatrixAt(index,instance);transform.multiply(instance);}
    for(let vertex=0;vertex<vertices.count;vertex++){position.fromBufferAttribute(vertices,vertex).applyMatrix4(transform);if(!Number.isFinite(position.x+position.y+position.z))throw new Error('Non-finite scenery vertex');if(position.y>.026&&Math.abs(position.z)<.55)throw new Error(`${object.name} enters the gameplay corridor`);checked++;}
   }
  });
  expect(checked).toBeGreaterThan(3000);dispose(root);
 });

 it('bounds the actual batched standard and low-quality vertex costs, including all instances',()=>{
  const costs:Record<string,number>={};
  for(const quality of ['standard','low'] as const){const {root}=build(quality);batchStatic(root);let cost=0;root.traverse(object=>{if(!(object instanceof T.Mesh))return;const positions=object.geometry.getAttribute('position');if(!positions.array.every(Number.isFinite))throw new Error('Non-finite terrain geometry');cost+=positions.count*(object instanceof T.InstancedMesh?object.count:1);});costs[quality]=cost;expect(cost).toBeLessThanOrEqual(quality==='standard'?22000:6000);dispose(root);}
  expect(costs.standard).toBeGreaterThan(costs.low);expect(costs.low).toBeGreaterThan(2000);
 });

 it('uses textured stone with sRGB colour and raw matching relief/roughness rather than a solid tint',()=>{
  for(const quality of ['standard','low'] as const){
   const {root}=build(quality),material=surface(root),map=material.map as T.DataTexture,bump=material.bumpMap as T.DataTexture,roughness=material.roughnessMap as T.DataTexture,expected=quality==='standard'?256:128;
   expect(map).toBeInstanceOf(T.DataTexture);expect(map.colorSpace).toBe(T.SRGBColorSpace);expect(bump.colorSpace).toBe(T.NoColorSpace);expect(roughness.colorSpace).toBe(T.NoColorSpace);expect(material.bumpScale).toBeGreaterThan(.1);
   for(const texture of [map,bump,roughness]){expect(texture.image.width).toBe(expected);expect(texture.image.height).toBe(expected);expect(texture.image.data.length).toBe(expected*expected*4);expect(texture.image.data.every(Number.isFinite)).toBe(true);}
   let min=255,max=0;for(let i=0;i<map.image.data.length;i+=4){min=Math.min(min,map.image.data[i]);max=Math.max(max,map.image.data[i]);}expect(max-min).toBeGreaterThan(70);expect(map.offset.equals(bump.offset)).toBe(true);expect(map.offset.equals(roughness.offset)).toBe(true);dispose(root);
  }
 });

 it('reuses immutable pixel data without sharing disposable Texture owners across terrace instances',()=>{
  const a=build('standard','shared-pixel-seed'),b=build('standard','shared-pixel-seed'),mapA=surface(a.root).map as T.DataTexture,mapB=surface(b.root).map as T.DataTexture,before=Array.from(mapB.image.data.slice(0,256));let otherDisposals=0;
  mapB.addEventListener('dispose',()=>otherDisposals++);expect(mapA).not.toBe(mapB);expect(mapA.image.data).toBe(mapB.image.data);dispose(a.root);expect(otherDisposals).toBe(0);expect(Array.from(mapB.image.data.slice(0,256))).toEqual(before);dispose(b.root);
 });

 it('preserves an existing wooden bridge deck and never adds an extra stone cap to it',()=>{
  const definition=levelDefinitionFor('JPN').platforms.find(platform=>platform.type==='wooden-bridge')!,root=island(new T.Scene(),0,0,definition.width,definition.depth,'temperate',19,definition.thickness);woodenPlatform(root,definition);
  const plank=root.children.find(object=>object instanceof T.Mesh&&object.geometry.type==='BoxGeometry') as T.Mesh,originalGeometry=plank.geometry;dressJapanPlatform(root,definition);root.updateMatrixWorld(true);
  expect(plank.parent).toBe(root);expect(plank.geometry).toBe(originalGeometry);expect(root.getObjectByName('country-platform-cap')).toBeUndefined();expect(root.getObjectByName('country-platform-cliff')).toBeUndefined();expect(root.getObjectByName('japan-hanging-vine-leaves')).toBeDefined();
  const count=Math.ceil(definition.width/.27);for(let i=0;i<count;i++){const x=-definition.width/2+(i+.5)*definition.width/count,hit=new T.Raycaster(new T.Vector3(x,5,0),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];if(!hit||Math.abs(hit.point.y-.015)>.0001)throw new Error('Wooden bridge deck was changed');}dispose(root);
 });
});
