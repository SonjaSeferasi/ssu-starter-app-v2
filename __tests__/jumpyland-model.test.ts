import {describe,expect,it} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import manifest from '../public/jumpyland/models/landing-world-v1.json';
import {createModelCamera,modelAnchors,modelTrails,modelWorldPoints,projectModelPoint,projectedTrail} from '../components/jumpyland/model-map-layout';
import {MAP_WIDTH,MAP_HEIGHT,mapView} from '../components/jumpyland/map-layout';

const root=resolve(__dirname,'..');
const bytes=readFileSync(resolve(root,'public/jumpyland/models/landing-world-v1.glb'));
const chunkLength=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.subarray(20,20+chunkLength).toString('utf8'));

describe('Blender-authored landing map',()=>{
 it('ships an actual self-contained Blender model with modeled geometry and PBR textures',()=>{
  expect(bytes.toString('ascii',0,4)).toBe('glTF');expect(bytes.readUInt32LE(4)).toBe(2);expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(gltf.asset.generator).toContain('Blender');expect(gltf.meshes.length).toBeGreaterThan(15);expect(gltf.meshes.length).toBeLessThan(40);
  const triangles=gltf.meshes.reduce((total:number,mesh:{primitives:{indices:number}[]})=>total+mesh.primitives.reduce((sum,p)=>sum+gltf.accessors[p.indices].count/3,0),0);
  // The fuller biomes and eroded mesas share material batches. Keep the
  // authored scene within an explicit web geometry and download budget.
  expect(triangles).toBeGreaterThan(500000);expect(triangles).toBeLessThan(1600000);
  expect(triangles).toBe(manifest.triangles);expect(bytes.length).toBeLessThan(25*1024*1024);
  expect(gltf.images.length).toBeGreaterThan(3);expect(gltf.images.every((image:{bufferView?:number;uri?:string})=>image.bufferView!==undefined&&!image.uri)).toBe(true);
  expect(JSON.stringify(gltf)).not.toContain('world-map-v');
 });
 it('includes the local Draco decoder required by the compressed model',()=>{
  expect(gltf.extensionsRequired).toContain('KHR_draco_mesh_compression');
  expect(existsSync(resolve(root,'public/jumpyland/models/draco/draco_wasm_wrapper.js'))).toBe(true);
  const wasm=readFileSync(resolve(root,'public/jumpyland/models/draco/draco_decoder.wasm'));
  expect(wasm.toString('ascii',0,4)).toBe('\0asm');
 });
 it('matches the source camera so labels sit on the exported terrain',()=>{
  const camera=gltf.cameras[0].perspective;
  expect(camera.yfov).toBeCloseTo(manifest.camera.verticalFov*Math.PI/180,6);
  expect(camera.aspectRatio).toBeCloseTo(MAP_WIDTH/MAP_HEIGHT,6);
  for(const anchor of manifest.anchors){const node=gltf.nodes.find((node:{name:string})=>node.name===anchor.name);expect(node).toBeDefined();anchor.position.forEach((coordinate,i)=>expect(node.translation[i]).toBeCloseTo(coordinate,5));}
  for(const point of modelWorldPoints){expect(point.x).toBeGreaterThan(80);expect(point.x).toBeLessThan(MAP_WIDTH-80);expect(point.y).toBeGreaterThan(100);expect(point.y).toBeLessThan(MAP_HEIGHT-100);}
 });
 it('connects the world routes exactly to their modeled anchors',()=>{
  const camera=createModelCamera();
  modelTrails().forEach((route,i)=>{expect(route[0].distanceTo(modelAnchors[i])).toBeLessThan(.0001);expect(route[48].distanceTo(modelAnchors[i+1])).toBeLessThan(.0001);expect(projectedTrail(route,camera)).not.toContain('NaN');expect(projectModelPoint(route[0],camera)).toEqual(modelWorldPoints[i]);});
 });
 it('keeps every modeled world reachable when the phone crops the scene',()=>{
  for(const point of modelWorldPoints){const view=mapView(390,844,point);expect(point.x*view.scale+view.x).toBeGreaterThan(50);expect(point.x*view.scale+view.x).toBeLessThan(340);}
 });
 it('includes a substantive editable Blender source file, not just a rendered image',()=>{
  const source=readFileSync(resolve(root,manifest.source));
  expect(source.byteLength).toBeGreaterThan(1000000);
  const header=source.subarray(0,4).toString('hex');
  expect(header==='28b52ffd'||source.subarray(0,7).toString('ascii')==='BLENDER'||header.startsWith('1f8b')).toBe(true);
 });
});
