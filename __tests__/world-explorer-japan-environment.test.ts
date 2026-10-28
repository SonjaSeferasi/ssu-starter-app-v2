import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {mountJapanEnvironment,addJapanTorii,japanEnvironmentInfo} from '../components/world-explorer/japan-environment';

const platforms=Array.from({length:10},(_,i)=>({x:i*13,y:i%3*.2,width:10,motion:i===5?'horizontal':null}));
function create(quality:'standard'|'low'='standard',reducedMotion=false){const scene=new T.Scene();scene.background=new T.Color('#123456');const environment=mountJapanEnvironment(scene,{platforms,finish:135,quality,reducedMotion});return{scene,environment};}
function vertices(root:T.Object3D){let n=0;root.traverse(object=>{if(object instanceof T.Mesh)n+=object.geometry.getAttribute('position').count*(object instanceof T.InstancedMesh?object.count:1);});return n;}

describe('Japan spring environment vertical slice',()=>{
 it('provides recognizable real 3D spring landmarks and separate scene depth layers',()=>{
  const {environment}=create();
  expect(environment.root.getObjectByName('mount-fuji')?.userData.landmark).toBe('Mount Fuji');expect(environment.root.getObjectByName('spring-pagoda')).toBeDefined();expect(environment.root.getObjectByName('japan-branching-cherry-tree')).toBeDefined();
  expect(environment.root.getObjectByName('japan-animated-waterfall')).toBeDefined();expect(environment.root.userData.layers).toHaveLength(5);expect(environment.root.userData.decorative).toBe(true);
  expect(japanEnvironmentInfo.license).toContain('Original procedural');expect(japanEnvironmentInfo.landmarkSource).toContain('whc.unesco.org');environment.dispose();
 });
 it('keeps decorative geometry behind the traversal lane and foreground flowers below the player',()=>{
  const {environment}=create();environment.root.updateMatrixWorld(true);
  const foreground=environment.root.getObjectByName('japan-low-foreground')!;expect(new T.Box3().setFromObject(foreground).max.y).toBeLessThan(-1.8);
  for(const name of ['japan-static-scenery','japan-sky-atmosphere','japan-floating-petals']){
   const bounds=new T.Box3().setFromObject(environment.root.getObjectByName(name)!);expect(bounds.max.z).toBeLessThan(-3);
  }
  const bridge=environment.root.getObjectByName('background-wooden-crossing')!;expect(bridge.userData.collidable).toBe(false);environment.dispose();
 });
 it('animates real water material, foam and petals, and freezes them for reduced motion',()=>{
  const regular=create(),water=regular.environment.root.getObjectByName('flowing-water-surface') as T.Mesh<T.PlaneGeometry,T.MeshStandardMaterial>,foam=regular.environment.root.getObjectByName('waterfall-foam') as T.InstancedMesh;
  const original=Array.from(foam.instanceMatrix.array);regular.environment.update(2,1/60);expect(water.material.map!.offset.y).toBeCloseTo(-.64);expect(Array.from(foam.instanceMatrix.array)).not.toEqual(original);expect(regular.environment.root.userData.petalCount).toBeGreaterThan(0);regular.environment.dispose();
  const reduced=create('standard',true),still=reduced.environment.root.getObjectByName('flowing-water-surface') as T.Mesh<T.PlaneGeometry,T.MeshStandardMaterial>;reduced.environment.update(20,1/60);expect(still.material.map!.offset.y).toBeCloseTo(0);expect(reduced.environment.root.userData.petalCount).toBe(0);reduced.environment.setReducedMotion(false);reduced.environment.update(2,1/60);expect(still.material.map!.offset.y).toBeCloseTo(-.64);expect(reduced.environment.root.userData.petalCount).toBeGreaterThan(0);reduced.environment.dispose();
 });
 it('uses bounded finite meshes and genuinely reduces scenery work in low graphics mode',()=>{
  const standard=create(),low=create('low'),standardVertices=vertices(standard.environment.root),lowVertices=vertices(low.environment.root);
  expect(standardVertices).toBeGreaterThan(20000);expect(standardVertices).toBeLessThan(400000);expect(lowVertices).toBeLessThan(standardVertices*.8);
  standard.environment.root.traverse(object=>{if(object instanceof T.Mesh)expect(object.geometry.getAttribute('position').array.every(Number.isFinite)).toBe(true);});
  expect(low.environment.root.userData.petalCount).toBeLessThan(standard.environment.root.userData.petalCount);standard.environment.dispose();low.environment.dispose();
 });
 it('releases owned textures and geometry, detaches its scene, and safely tolerates repeat cleanup',()=>{
  const {scene,environment}=create('low'),oldBackground=new T.Color('#123456');let disposed=0,instanceDisposals=0,instances=0;const geometry=new Set<T.BufferGeometry>();environment.root.traverse(object=>{if(object instanceof T.Mesh)geometry.add(object.geometry);if(object instanceof T.InstancedMesh){instances++;object.addEventListener('dispose',()=>instanceDisposals++);}});for(const g of geometry)g.addEventListener('dispose',()=>disposed++);
  environment.dispose();expect(scene.getObjectByName('japan-spring-environment')).toBeUndefined();expect((scene.background as T.Color).equals(oldBackground)).toBe(true);expect(disposed).toBe(geometry.size);expect(instanceDisposals).toBe(instances);environment.dispose();expect(disposed).toBe(geometry.size);expect(instanceDisposals).toBe(instances);
 });
 it('offers a consistent visible torii marker without pretending to define a collider',()=>{
  const root=new T.Group(),gate=addJapanTorii(root,10,1,-.5,3);expect(gate.position.toArray()).toEqual([10,1,-.5]);expect(gate.name).toBe('japan-torii-gate');expect(new T.Box3().setFromObject(gate).max.y).toBeGreaterThan(3.5);expect(gate.userData.collider).toBeUndefined();
 });
});
