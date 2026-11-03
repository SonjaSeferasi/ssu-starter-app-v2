import {describe,expect,it,vi} from 'vitest';
import * as T from 'three';
import {changeMaterialsPrepared,type PrepareMaterials} from '../components/world-explorer/kit/surface-maps';

/** Late material changes (surface maps arriving after the start) must not
 * link a shader during play: the stage prepares copies first, and the live
 * materials change only after that preparation has finished. */
function scene(){
 const root=new T.Scene(),rock=new T.MeshStandardMaterial({color:'#888888'}),other=new T.MeshStandardMaterial();
 rock.onBeforeCompile=()=>{};rock.customProgramCacheKey=()=> 'rock-v1';
 const body=new T.Mesh(new T.BoxGeometry(),rock),cliff=new T.InstancedMesh(new T.BoxGeometry(),rock,4),untouched=new T.Mesh(new T.BoxGeometry(),other);
 root.add(body,cliff,untouched);return{root,rock,other,body,cliff};
}
const roughen=(target:T.MeshStandardMaterial)=>{target.roughness=.31;target.bumpMap=null;};

describe('changeMaterialsPrepared',()=>{
 it('applies at once when no stage hook is present (tools and tests)',async()=>{
  const {root,rock}=scene();
  expect(await changeMaterialsPrepared(root,[rock],roughen)).toBe(true);
  expect(rock.roughness).toBe(.31);
 });
 it('prepares changed copies on stand-ins for every mesh first, then changes the live material',async()=>{
  const {root,rock,body,cliff}=scene();let release=()=>{};
  const prepare=vi.fn<PrepareMaterials>(()=>new Promise<void>(resolve=>{release=resolve;}));root.userData.prepareMaterials=prepare;
  const done=changeMaterialsPrepared(root,[rock],roughen);await Promise.resolve();
  const changes=prepare.mock.calls[0][0];
  expect(changes.map(change=>change.object)).toEqual([body,cliff]);
  const copy=changes[0].material as T.MeshStandardMaterial;
  expect(copy).not.toBe(rock);expect(copy.roughness).toBe(.31);
  // The copy must produce the same program key as the changed live material.
  expect(copy.onBeforeCompile).toBe(rock.onBeforeCompile);expect(copy.customProgramCacheKey()).toBe('rock-v1');
  expect(rock.roughness).not.toBe(.31);
  release();expect(await done).toBe(true);
  expect(rock.roughness).toBe(.31);expect(rock.version).toBeGreaterThan(0);
 });
 it('leaves the live material unchanged when preparation fails (stage closed)',async()=>{
  const {root,rock}=scene();root.userData.prepareMaterials=(()=>Promise.reject(new Error('closed'))) as PrepareMaterials;
  expect(await changeMaterialsPrepared(root,[rock],roughen)).toBe(false);
  expect(rock.roughness).not.toBe(.31);
 });
});
