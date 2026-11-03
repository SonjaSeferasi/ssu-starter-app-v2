import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {createJapanEnemy,createJapanDiscoveryBlock,createCollectibleBurst} from '../components/world-explorer/japan-interactives';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';

describe('Japan visible interactive objects match their gameplay roles',()=>{
 it('keeps the original patrol enemy within its physical silhouette while animating and turning',()=>{
  const scene=new T.Scene(),enemy=createJapanEnemy(scene);
  for(const facing of [-1,1] as const)for(const state of ['IDLE','PATROL_LEFT','PATROL_RIGHT','ALERT'] as const){
   enemy.update(.42,facing,state);const size=new T.Box3().setFromObject(enemy.root,true).getSize(new T.Vector3());
   expect(size.y).toBeGreaterThan(.95);expect(size.y).toBeLessThan(1.12);expect(size.x).toBeLessThan(.65);expect(enemy.root.visible).toBe(true);
  }
  enemy.update(1,1,'DISABLED');expect(enemy.root.visible).toBe(false);
 });
 it('aligns the visible wooden block with the authored underside-hit collider',()=>{
  const definition=levelDefinitionFor('JPN').discoveryBlocks![0],root=createJapanDiscoveryBlock(new T.Scene(),definition.width,definition.height);
  root.position.set(definition.x,definition.y-definition.height/2,0);const bounds=new T.Box3().setFromObject(root,true);
  expect(bounds.min.y).toBeCloseTo(definition.y-definition.height/2,1);expect(bounds.max.y).toBeCloseTo(definition.y+definition.height/2,1);
  expect(bounds.min.x).toBeCloseTo(definition.x-definition.width/2,1);expect(bounds.max.z-bounds.min.z).toBeGreaterThan(.6);
  expect(root.getObjectByName('raised-discovery-question-mark')).toBeDefined();
 });
 it('expires collected-object sparkles and releases their GPU resources once',()=>{
  const scene=new T.Scene(),burst=createCollectibleBurst(scene,1,2,.2);let disposals=0;
  burst.root.traverse(object=>{if(object instanceof T.InstancedMesh)object.addEventListener('dispose',()=>disposals++);});
  expect(burst.update(.3)).toBe(true);expect(burst.update(.71)).toBe(false);burst.dispose();burst.dispose();expect(disposals).toBe(1);expect(burst.root.parent).toBeNull();
 });
});
