import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {createJapanWater,createJapanMistTexture,createJapanWaterNoiseTexture} from '../components/world-explorer/japan-water';

const sites=[{x:4,top:1.2,z:-12,width:1},{x:15,top:2.8,z:-30,width:2.7,intensity:.7}];

describe('Japan flowing valley water',()=>{
 it('bakes bounded seamless fBm pixels once while giving scenes independent GPU textures',()=>{
  const texture=createJapanWaterNoiseTexture(),other=createJapanWaterNoiseTexture(),{width,height}=texture.image,data=texture.image.data as Uint8Array;
  expect([width,height]).toEqual([256,256]);expect(data.byteLength).toBe(256*256*4);expect(data.byteLength*4/3).toBeLessThan(350000);expect(data.every(Number.isFinite)).toBe(true);
  expect(texture.wrapS).toBe(T.RepeatWrapping);expect(texture.wrapT).toBe(T.RepeatWrapping);expect(texture.colorSpace).toBe(T.NoColorSpace);expect(texture.generateMipmaps).toBe(true);
  for(let p=0;p<width;p++)for(let channel=0;channel<4;channel++){expect(data[p*4+channel]).toBe(data[((height-1)*width+p)*4+channel]);expect(data[(p*width)*4+channel]).toBe(data[(p*width+width-1)*4+channel]);}
  let min=255,max=0;for(let i=0;i<data.length;i+=4){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}expect(max-min).toBeGreaterThan(100);
  expect(other).not.toBe(texture);expect(other.image.data).toBe(data);let otherDisposals=0;other.addEventListener('dispose',()=>otherDisposals++);texture.dispose();expect(otherDisposals).toBe(0);other.dispose();
 });
 it('starts on each feeder lip, bows into the valley and ends on its water surface',()=>{
  const water=createJapanWater(new T.Group(),{finish:60,sites}),fall=water.root.getObjectByName('flowing-water-surface') as T.Mesh<T.BufferGeometry,T.ShaderMaterial>,positions=fall.geometry.getAttribute('position');
  const uv=fall.geometry.getAttribute('uv'),perSite=positions.count/sites.length;
  for(let s=0;s<sites.length;s++){
   const site=sites[s],top:number[]=[],bottom:number[]=[];
   for(let i=s*perSite;i<(s+1)*perSite;i++){if(uv.getY(i)===0)top.push(i);if(uv.getY(i)===1)bottom.push(i);}
   expect(top.length).toBeGreaterThan(4);for(const i of top){expect(positions.getY(i)).toBeCloseTo(site.top);expect(positions.getZ(i)).toBeCloseTo(site.z);}for(const i of bottom){expect(positions.getY(i)).toBeCloseTo(-23);expect(positions.getZ(i)).toBeGreaterThan(site.z+.5);}
  }
  expect(positions.array.every(Number.isFinite)).toBe(true);expect(fall.material.fog).toBe(true);expect(fall.material.uniforms.fogColor.value).toBeInstanceOf(T.Color);expect(fall.material.uniforms.fogNear).toBeDefined();expect(fall.material.uniforms.fogFar).toBeDefined();expect(fall.material.depthWrite).toBe(false);expect(fall.material.transparent).toBe(true);
 });
 it('shares six draws across all waterfalls and animates water, foam, mist and impact ripples',()=>{
  const water=createJapanWater(new T.Group(),{finish:60,sites}),foam=water.root.getObjectByName('waterfall-foam') as T.InstancedMesh,mist=water.root.getObjectByName('waterfall-mist') as T.InstancedMesh,rings=water.root.getObjectByName('waterfall-impact-ripples') as T.InstancedMesh;
  let draws=0;water.root.traverse(o=>{if(o instanceof T.Mesh)draws++;});expect(draws).toBe(6);
  const old=[foam,mist,rings].map(o=>Array.from(o.instanceMatrix.array));water.update(3);
  [foam,mist,rings].forEach((o,i)=>expect(Array.from(o.instanceMatrix.array)).not.toEqual(old[i]));
  let shared:T.Texture|undefined;
  for(const name of ['flowing-water-surface','japan-mountain-lake','waterfall-feeding-river-channel']){const mesh=water.root.getObjectByName(name) as T.Mesh<T.BufferGeometry,T.ShaderMaterial>;expect(mesh.material.uniforms.time.value).toBe(3);const texture=mesh.material.uniforms.waterNoiseMap.value as T.Texture;expect(texture).toBeInstanceOf(T.DataTexture);if(shared)expect(texture).toBe(shared);shared=texture;}
  for(const name of ['flowing-water-surface','waterfall-mist','waterfall-foam','waterfall-impact-ripples']){const object=water.root.getObjectByName(name) as T.Mesh<T.BufferGeometry,T.Material>;expect(object.material.forceSinglePass).toBe(true);}
 });
 it('removes actual geometry and particles in low graphics and keeps mist edges transparent',()=>{
  const normal=createJapanWater(new T.Group(),{finish:60,sites}),low=createJapanWater(new T.Group(),{finish:60,sites,low:true});
  const count=(root:T.Object3D)=>{let total=0;root.traverse(o=>{if(o instanceof T.Mesh)total+=o.geometry.getAttribute('position').count*(o instanceof T.InstancedMesh?o.count:1);});return total;};expect(count(low.root)).toBeLessThan(count(normal.root)*.55);
  const texture=createJapanMistTexture(),{width,height}=texture.image,data=texture.image.data as Uint8Array;expect(data[3]).toBe(0);expect(data[((height/2)*width+width/2)*4+3]).toBeGreaterThan(220);texture.dispose();
 });
});
