import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {japanAtmosphere} from '../components/world-explorer/japan-atmosphere';
import {mountJapanEnvironment} from '../components/world-explorer/japan-environment';
import {environment} from '../components/world-explorer/countries/japan';
import {createJapanSky} from '../components/world-explorer/japan-vista';

// SRS-631.2: Japan is presented in warm golden-hour light with layered haze.
describe('Japan golden-hour atmosphere',()=>{
 it('uses a warm horizon under a cooler zenith, warm sunlight and warm haze',()=>{
  const horizon=new T.Color(japanAtmosphere.sky.horizon),zenith=new T.Color(japanAtmosphere.sky.zenith),sun=new T.Color(japanAtmosphere.light.sun),haze=new T.Color(japanAtmosphere.fog.color);
  expect(horizon.r).toBeGreaterThan(horizon.b);expect(zenith.b).toBeGreaterThan(zenith.r);
  expect(sun.r).toBeGreaterThan(sun.b);expect(haze.r).toBeGreaterThan(haze.b);
 });
 it('hazes the far valley in gameplay while keeping the route itself clear',()=>{
  const {near,far,overviewNear,overviewFar}=japanAtmosphere.fog;
  expect(near).toBeGreaterThan(20);expect(far).toBeGreaterThan(near+100);
  // Fuji stands about 130 units from the camera: clearly hazed, never erased.
  const fuji=(130-near)/(far-near);expect(fuji).toBeGreaterThan(.45);expect(fuji).toBeLessThan(.8);
  expect(overviewNear).toBeGreaterThan(far*.6);expect(overviewFar).toBeGreaterThan(far);
 });
 it('applies the palette to the mounted scene, its sky and the level lighting, and restores the scene on cleanup',()=>{
  const scene=new T.Scene();scene.background=new T.Color('#123456');
  const mounted=mountJapanEnvironment(scene,{platforms:[{x:0,y:0,width:14,motion:null}],finish:60,quality:'low'});
  const fog=scene.fog as T.Fog;expect(fog).toBeInstanceOf(T.Fog);expect('#'+fog.color.getHexString()).toBe(japanAtmosphere.fog.color);expect(fog.near).toBe(japanAtmosphere.fog.near);expect(fog.far).toBe(japanAtmosphere.fog.far);
  mounted.dispose();expect('#'+(scene.background as T.Color).getHexString()).toBe('#123456');expect(scene.fog).toBeNull();
  const sky=new T.Group();createJapanSky(sky);const dome=sky.getObjectByName('japan-gradient-sky-volume') as T.Mesh,material=dome.material as T.ShaderMaterial;
  expect('#'+material.uniforms.horizon.value.getHexString()).toBe(japanAtmosphere.sky.horizon);expect('#'+material.uniforms.zenith.value.getHexString()).toBe(japanAtmosphere.sky.zenith);
  expect(environment.lighting.sun).toBe(japanAtmosphere.light.sun);expect(environment.lighting.exposure).toBe(japanAtmosphere.light.exposure);
  expect(environment.lighting.fog).toEqual([japanAtmosphere.fog.color,japanAtmosphere.fog.near,japanAtmosphere.fog.far]);
 });
});
