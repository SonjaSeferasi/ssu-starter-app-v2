import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {batchStatic,island} from '../components/world-explorer/scenic-kit';
import {createJapanScenicCliff,dressJapanPlatform,japanTerrainInfo} from '../components/world-explorer/japan-terrain';
import {woodenPlatform} from '../components/world-explorer/country-scene';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';

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
 it('keeps dense raycasts across the full walking corridor and landing endpoints before and after batching',()=>{
  const {root,definition}=build(),originalPosition=root.position.clone(),expectedY=definition.y+.015;
  const samples=Array.from({length:65},(_,i)=>definition.x+.002+i*(definition.width-.004)/64);
  const check=()=>{root.updateMatrixWorld(true);for(const z of [-.54,-.27,0,.27,.54])for(const x of samples){const ray=new T.Raycaster(new T.Vector3(x,9,z),new T.Vector3(0,-1,0)),hit=ray.intersectObject(root,true)[0];if(!hit||Math.abs(hit.point.y-expectedY)>.0001)throw new Error(`Terrain changed the walking cap at x=${x}, z=${z}: ${hit?.point.y}`);}};
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
  for(const quality of ['standard','low'] as const){const {root}=build(quality);batchStatic(root);let cost=0,meshes=0;root.traverse(object=>{if(!(object instanceof T.Mesh))return;meshes++;const positions=object.geometry.getAttribute('position');if(!positions.array.every(Number.isFinite))throw new Error('Non-finite terrain geometry');cost+=positions.count*(object instanceof T.InstancedMesh?object.count:1);});costs[quality]=cost;expect(cost).toBeLessThanOrEqual(japanTerrainInfo.maximumEffectiveVertices[quality]);expect(meshes).toBeLessThanOrEqual(japanTerrainInfo.maximumMeshes);dispose(root);}
  expect(costs.standard).toBeGreaterThan(costs.low);expect(costs.low).toBeGreaterThan(2000);
 });

 it('sculpts a compact closed underside with a narrowing, asymmetric silhouette instead of a column',()=>{
  for(const quality of ['standard','low'] as const){
   const {root,details,definition}=build(quality),cliff=root.getObjectByName('country-platform-cliff') as T.Mesh,vertices=cliff.geometry.getAttribute('position'),visualDepth=details.userData.visualDepth as number,top:T.Vector3[]=[],lower:T.Vector3[]=[];
   for(let i=0;i<vertices.count;i++){const p=new T.Vector3().fromBufferAttribute(vertices,i);if(Math.abs(p.y)<.001)top.push(p);if(p.y<-visualDepth*.75&&p.y>-visualDepth*1.08)lower.push(p);}
   const topBounds=new T.Box3().setFromPoints(top),lowerBounds=new T.Box3().setFromPoints(lower),topSize=topBounds.getSize(new T.Vector3()),lowerSize=lowerBounds.getSize(new T.Vector3());
   expect(topSize.x).toBeCloseTo(definition.width,4);expect(lower.length).toBeGreaterThan(10);expect(lowerSize.x/topSize.x).toBeLessThan(.48);expect(lowerSize.z/topSize.z).toBeLessThan(.48);
   // Uneven fracture lobes vary in height and shift the lower centre; a
   // smaller perfectly centred cylinder cannot satisfy these checks.
   expect(lowerSize.y).toBeGreaterThan(visualDepth*.15);expect(lowerBounds.getCenter(new T.Vector3()).distanceTo(new T.Vector3(0,lowerBounds.getCenter(new T.Vector3()).y,0))).toBeGreaterThan(.04);
   cliff.geometry.computeBoundingBox();expect(-cliff.geometry.boundingBox!.min.y).toBeLessThan(4.2);expect(cliff.geometry.index).not.toBeNull();
   // A ray from empty air beneath the island meets its downward-facing rock
   // underside, rather than seeing through an uncapped tube to the grass.
   const ray=new T.Raycaster(new T.Vector3(root.position.x,root.position.y-visualDepth*2,0),new T.Vector3(0,1,0)),hit=ray.intersectObject(cliff)[0];expect(hit).toBeDefined();expect(hit.point.y).toBeLessThan(root.position.y-visualDepth*.5);
   dispose(root);
  }
 });

 it('keeps visible island depth independent from collider thickness while retaining deep scenic cliffs',()=>{
  const scene=new T.Scene(),definition={id:'depth-is-not-physics',x:0,y:0,width:6,depth:3,thickness:2,type:'stone'},roots:T.Group[]=[];
  for(const thickness of [.5,2,24]){
   const current={...definition,thickness},root=island(scene,3,0,6,3,'temperate',4,thickness),details=dressJapanPlatform(root,current);roots.push(root);expect(details.userData.colliderThickness).toBe(thickness);
  }
  const position=(root:T.Group)=>(root.getObjectByName('country-platform-cliff') as T.Mesh).geometry.getAttribute('position').array;
  expect(Array.from(position(roots[0]))).toEqual(Array.from(position(roots[1])));expect(Array.from(position(roots[1]))).toEqual(Array.from(position(roots[2])));
  const scenic=createJapanScenicCliff(scene,{x:0,y:0,z:-12,width:6,depth:3,thickness:12}),scenicCliff=scenic.getObjectByName('country-platform-cliff') as T.Mesh;scenicCliff.geometry.computeBoundingBox();expect(scenicCliff.geometry.boundingBox!.min.y).toBeLessThan(-12);expect(scenic.userData.nonColliding).toBe(true);
  roots.forEach(dispose);dispose(scenic);
 });

 it('keeps the first upper island shell above the lower bridge player head and inside its thin collider',()=>{
  const level=levelDefinitionFor('JPN'),definition=level.platforms.find(platform=>platform.id==='jp-upper-01')!,bridge=level.platforms.find(platform=>platform.id==='jp-lower-bridge')!;
  expect(definition.thickness).toBeLessThan(.5);
  for(const quality of ['standard','low'] as const){
   const root=island(new T.Scene(),definition.x+definition.width/2,definition.y,definition.width,definition.depth,'temperate',17,definition.thickness);dressJapanPlatform(root,definition,{quality});root.updateMatrixWorld(true);
   const cliff=root.getObjectByName('country-platform-cliff') as T.Mesh;cliff.geometry.computeBoundingBox();const underside=definition.y+cliff.geometry.boundingBox!.min.y;
   expect(underside).toBeGreaterThanOrEqual(definition.y-definition.thickness-.000001);
   // Probe the actual lower route across the entire overhead overlap. A
   // player's full height must fit, and upward rays must meet rock only above
   // that head height, including the edges of the readable walking corridor.
   for(let i=0;i<=24;i++){
    const x=definition.x+.015+i*(definition.width-.03)/24,headY=platformSurfaceY(bridge,x)+level.physics.playerHeight+.015;expect(underside-headY).toBeGreaterThan(.08);
    for(const z of [-.54,-level.physics.playerRadius,0,level.physics.playerRadius,.54]){
     const hit=new T.Raycaster(new T.Vector3(x,headY,z),new T.Vector3(0,1,0)).intersectObject(root,true)[0];expect(hit).toBeDefined();expect(hit.point.y).toBeGreaterThan(headY+.04);
    }
   }
   dispose(root);
  }
 });

 it('retains authored cap dimensions for narrow and broad islands without hidden width clamping',()=>{
  for(const width of [1.6,2.4,12,30]){
   const definition={id:`cap-width-${width}`,x:2,y:0,width,depth:2,thickness:8,type:'stone'},root=island(new T.Scene(),2+width/2,0,width,2,'temperate',4,8);dressJapanPlatform(root,definition);root.updateMatrixWorld(true);
   const cap=root.getObjectByName('country-platform-cap') as T.Mesh;
   for(const x of [2.002,2+width/2,2+width-.002])for(const z of [-.54,0,.54]){const hit=new T.Raycaster(new T.Vector3(x,3,z),new T.Vector3(0,-1,0)).intersectObject(cap)[0];expect(hit).toBeDefined();expect(hit.point.y).toBeCloseTo(.015,5);}
   dispose(root);
  }
 });

 it('uses textured stone with sRGB colour and raw matching relief/roughness rather than a solid tint',()=>{
  for(const quality of ['standard','low'] as const){
   const {root}=build(quality),material=surface(root),map=material.map as T.DataTexture,bump=material.bumpMap as T.DataTexture,roughness=material.roughnessMap as T.DataTexture,expected=quality==='standard'?256:128;
   expect(map).toBeInstanceOf(T.DataTexture);expect(map.colorSpace).toBe(T.SRGBColorSpace);expect(bump.colorSpace).toBe(T.NoColorSpace);expect(roughness.colorSpace).toBe(T.NoColorSpace);expect(material.bumpScale).toBeGreaterThan(.1);
   for(const texture of [map,bump,roughness]){expect(texture.image.width).toBe(expected);expect(texture.image.height).toBe(expected);expect(texture.image.data!.length).toBe(expected*expected*4);expect(texture.image.data!.every(Number.isFinite)).toBe(true);}
   let min=255,max=0;for(let i=0;i<map.image.data!.length;i+=4){min=Math.min(min,map.image.data![i]);max=Math.max(max,map.image.data![i]);}expect(max-min).toBeGreaterThan(70);expect(map.offset.equals(bump.offset)).toBe(true);expect(map.offset.equals(roughness.offset)).toBe(true);dispose(root);
  }
 });

 it('reuses immutable pixel data without sharing disposable Texture owners across terrace instances',()=>{
  const a=build('standard','shared-pixel-seed'),b=build('standard','shared-pixel-seed'),mapA=surface(a.root).map as T.DataTexture,mapB=surface(b.root).map as T.DataTexture,before=Array.from(mapB.image.data!.slice(0,256));let otherDisposals=0;
  mapB.addEventListener('dispose',()=>otherDisposals++);expect(mapA).not.toBe(mapB);expect(mapA.image.data).toBe(mapB.image.data);dispose(a.root);expect(otherDisposals).toBe(0);expect(Array.from(mapB.image.data!.slice(0,256))).toEqual(before);dispose(b.root);
 });

 it('preserves an existing wooden bridge deck and never adds an extra stone cap to it',()=>{
  const definition=levelDefinitionFor('JPN').platforms.find(platform=>platform.type==='wooden-bridge')!,root=island(new T.Scene(),0,0,definition.width,definition.depth,'temperate',19,definition.thickness);woodenPlatform(root,definition);
  const plank=root.children.find(object=>object instanceof T.Mesh&&object.geometry.type==='BoxGeometry') as T.Mesh,originalGeometry=plank.geometry,count=Math.ceil(definition.width/.27);
  root.updateMatrixWorld(true);const heights=Array.from({length:count},(_,i)=>{const x=-definition.width/2+(i+.5)*definition.width/count;return new T.Raycaster(new T.Vector3(x,5,0),new T.Vector3(0,-1,0)).intersectObject(root,true)[0]?.point.y;});expect(heights.every(height=>height!==undefined)).toBe(true);
  dressJapanPlatform(root,definition);root.updateMatrixWorld(true);
  expect(plank.parent).toBe(root);expect(plank.geometry).toBe(originalGeometry);expect(root.getObjectByName('country-platform-cap')).toBeUndefined();expect(root.getObjectByName('country-platform-cliff')).toBeUndefined();expect(root.getObjectByName('japan-hanging-vine-leaves')).toBeDefined();
  for(let i=0;i<count;i++){const x=-definition.width/2+(i+.5)*definition.width/count,hit=new T.Raycaster(new T.Vector3(x,5,0),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];if(!hit||Math.abs(hit.point.y-heights[i]!)>.0001)throw new Error('Wooden bridge deck was changed');}dispose(root);
 });
});
