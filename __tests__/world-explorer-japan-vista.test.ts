import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {createFujiVista,addJapanCloudBanks,createJapanCloudTexture,addJapanRidges} from '../components/world-explorer/japan-vista';
import {createJapanPagoda,createJapanHouse} from '../components/world-explorer/japan-architecture';
import {mountJapanEnvironment} from '../components/world-explorer/japan-environment';
import {cameraFrame} from '../lib/world-explorer/simulation';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';

function cameraAt(x:number,y=0){
 const level=levelDefinitionFor('JPN',1),frame=cameraFrame(level,x,y,16/9),camera=new T.PerspectiveCamera(44,16/9,.1,190);
 camera.position.set(frame.x,frame.y,frame.z);camera.lookAt(frame.x,frame.lookY,-1);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();return camera;
}

describe('Japan landmark visibility and outward surfaces',()=>{
 it('gives Fuji outward normals so its real exterior snow is visible with FrontSide culling',()=>{
  const vista=createFujiVista(new T.Group()),slope=vista.root.getObjectByName('fuji-snow-streaked-volcanic-slope') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
  const p=slope.geometry.getAttribute('position'),n=slope.geometry.getAttribute('normal'),c=slope.geometry.getAttribute('color');let exterior=0,snow=0;
  for(let i=0;i<p.count;i++){
   const radial=p.getX(i)**2+p.getZ(i)**2;
   if(radial<10||p.getY(i)<2||p.getY(i)>44)continue;
   expect(p.getX(i)*n.getX(i)+p.getZ(i)*n.getZ(i)).toBeGreaterThan(0);exterior++;
   if(p.getZ(i)>0&&c.getX(i)>.5&&c.getY(i)>.5&&c.getZ(i)>.5)snow++;
  }
  expect(exterior).toBeGreaterThan(4000);expect(snow).toBeGreaterThan(500);expect(slope.material.side).toBe(T.FrontSide);
 });
 it('keeps the summit and visible snow inside the actual side-view camera through the course',()=>{
  const vista=createFujiVista(new T.Group()),slope=vista.root.getObjectByName('fuji-snow-streaked-volcanic-slope') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
  const p=slope.geometry.getAttribute('position'),c=slope.geometry.getAttribute('color');
  for(const playerX of [1.2,35,75,125]){
   const camera=cameraAt(playerX);vista.follow(camera.position.x);vista.root.updateMatrixWorld(true);
   const summit=new T.Vector3(0,46,0).applyMatrix4(vista.root.matrixWorld).project(camera);expect(Math.abs(summit.x)).toBeLessThan(.6);expect(summit.y).toBeGreaterThan(.3);expect(summit.y).toBeLessThan(.99);expect(summit.z).toBeLessThan(1);
   if(playerX<10){expect(summit.y).toBeGreaterThan(.65);expect(summit.y).toBeLessThan(.85);}
   let visibleSnow=0;
   for(let i=0;i<p.count;i++)if(p.getZ(i)>0&&c.getX(i)>.6&&c.getY(i)>.6&&c.getZ(i)>.6){const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(vista.root.matrixWorld).project(camera);if(Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z<1&&point.z> -1)visibleSnow++;}
   expect(visibleSnow).toBeGreaterThan(150);
  }
 });
 it('keeps a real pagoda silhouette in the initial player-camera composition',()=>{
  const level=levelDefinitionFor('JPN',1),scene=new T.Scene(),environment=mountJapanEnvironment(scene,{platforms:level.platforms,finish:137.8,quality:'low'});
  environment.root.updateMatrixWorld(true);const placed=environment.root.getObjectByName('spring-pagoda')!;expect(placed).toBeDefined();
  const fresh=createJapanPagoda({tiers:5,low:true}),bounds=new T.Box3().setFromObject(fresh).applyMatrix4(placed.matrixWorld),camera=cameraAt(1.2),frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  expect(frustum.intersectsBox(bounds)).toBe(true);expect(bounds.max.y-bounds.min.y).toBeGreaterThan(8);expect(bounds.max.y-bounds.min.y).toBeLessThan(10);expect(placed.position.z).toBeLessThan(-40);
  const centre=bounds.getCenter(new T.Vector3()).project(camera);expect(centre.x).toBeGreaterThan(.15);expect(centre.x).toBeLessThan(.95);expect(Math.abs(centre.y)).toBeLessThan(.9);
  // Frustum inclusion alone missed a foreground escarpment hiding the facade.
  // Compare three actual tier sightlines with the same unoccluded model.
  fresh.applyMatrix4(placed.matrixWorld);fresh.updateMatrixWorld(true);
  for(const tier of [1,2,3]){const width=3.9-tier*.48,target=new T.Vector3(0,.42+tier*1.55+.65,width*.74*.5+.08).applyMatrix4(placed.matrixWorld),ray=new T.Raycaster(camera.position,target.clone().sub(camera.position).normalize()),expected=ray.intersectObject(fresh,true)[0],actual=ray.intersectObject(environment.root.getObjectByName('japan-near-background')!,true)[0];expect(expected).toBeDefined();expect(actual).toBeDefined();expect(actual.distance).toBeCloseTo(expected.distance,2);}
  environment.dispose();
 });
 it('uses feathered organic clouds with bounded geometry and transparent outer texels',()=>{
  const root=addJapanCloudBanks(new T.Group(),60,false),cloud=root.getObjectByName('japan-instanced-clouds') as T.InstancedMesh<T.PlaneGeometry,T.MeshBasicMaterial>,texture=createJapanCloudTexture(),{width,height}=texture.image,data=texture.image.data as Uint8Array;
  expect(cloud.geometry.type).toBe('PlaneGeometry');expect(cloud.count).toBe(24);expect(cloud.material.depthWrite).toBe(false);expect(cloud.material.forceSinglePass).toBe(true);expect(cloud.material.map).toBeDefined();
  for(let x=0;x<width;x++){expect(data[x*4+3]).toBe(0);expect(data[((height-1)*width+x)*4+3]).toBe(0);}
  let soft=0,opaque=0;for(let i=3;i<data.length;i+=4){if(data[i]>0&&data[i]<200)soft++;if(data[i]>=200)opaque++;}expect(soft).toBeGreaterThan(400);expect(opaque).toBeGreaterThan(200);texture.dispose();
 });
 it('builds three distinct landscape depths with surface-anchored forests',()=>{
  const root=addJapanRidges(new T.Group(),60,true),forest=root.getObjectByName('surface-anchored-ridge-canopies') as T.InstancedMesh;expect(root.userData.depthBands).toBe(3);expect(forest.count).toBeGreaterThan(60);const bounds=new T.Box3().setFromObject(root);expect(bounds.min.z).toBeLessThan(-165);expect(bounds.max.z).toBeGreaterThan(-65);
 });
 it('keeps the upper tiled roof shells facing upward on both pagodas and village houses',()=>{
  for(const root of [createJapanPagoda(),createJapanHouse()]){
   let normals=0;
   root.traverse(object=>{if(!(object instanceof T.Mesh)||!(object.material instanceof T.MeshStandardMaterial)||object.material.color.getHexString()!=='35475c')return;const normal=object.geometry.getAttribute('normal');for(let i=0;i<normal.count;i++){expect(normal.getY(i)).toBeGreaterThan(0);normals++;}});
   expect(normals).toBeGreaterThan(300);
  }
 });
});
