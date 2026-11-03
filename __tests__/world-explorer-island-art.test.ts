import {it,expect} from 'vitest';
import * as T from 'three';
import {remainingNorthAmericaEnvironment} from '../components/world-explorer/countries/north-america-remaining';
import {islandArt,type IslandArtCode} from '../components/world-explorer/countries/north-america-island-art';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {island} from '../components/world-explorer/scenic-kit';
it.each(['LCA','NIC'] as const)('%s contains exactly two actual peak meshes across the entire scene',code=>{
 const level=levelDefinitionFor(code),scene=new T.Scene(),env=remainingNorthAmericaEnvironment(code),mounted=env.mount({scene,level,finish:240,low:false,reducedMotion:true}),peaks:T.Mesh[]=[];
 mounted.root.traverse(o=>{if(o instanceof T.Mesh&&o.userData.landmarkPeak)peaks.push(o);});
 expect(peaks).toHaveLength(2);for(const peak of peaks){expect(peak.geometry.getAttribute('position').count).toBeGreaterThan(1000);expect(peak.userData.erodedRidges).toBe(true);}
 mounted.dispose();
});
it('gives the five island routes different lighting, rock and cap materials',()=>{
 expect(new Set(Object.values(islandArt).map(a=>a.background)).size).toBe(5);
 expect(new Set(Object.values(islandArt).map(a=>a.top)).size).toBe(5);
 for(const code of Object.keys(islandArt) as IslandArtCode[]){const env=remainingNorthAmericaEnvironment(code);expect(env.lighting.background).toBe(islandArt[code].background);}
});
it('leaves Dominica lake water visible within a forest clearing',()=>{
 const level=levelDefinitionFor('DMA'),scene=new T.Scene(),env=remainingNorthAmericaEnvironment('DMA'),mounted=env.mount({scene,level,finish:240,low:false,reducedMotion:true});
 const lake=mounted.root.getObjectByName('boiling-lake-visible-water');expect(lake).toBeTruthy();
 mounted.root.updateMatrixWorld(true);
 // The lake's central surface must be visible from an elevated play-side view.
 const origin=new T.Vector3(240*.43,4,12),target=new T.Vector3(240*.43,-5.55,-18),ray=new T.Raycaster(origin,target.clone().sub(origin).normalize());
 const hit=ray.intersectObject(mounted.root,true).find(h=>h.object instanceof T.Mesh&&!(h.object.material as T.Material).transparent);
 expect(hit).toBeTruthy();expect(hit!.point.distanceTo(target)).toBeLessThan(4);
 mounted.dispose();
});
it('keeps Panama quays shallow without changing authored collider dimensions',()=>{
 const level=levelDefinitionFor('PAN'),p=level.platforms.find(p=>!p.motion&&p.terrain==='terrace')!,before=JSON.stringify(p),scene=new T.Scene(),env=remainingNorthAmericaEnvironment('PAN'),root=island(scene,p.x+p.width/2,p.y,p.width,p.depth,'coastal',3,p.thickness);
 env.dressPlatform(root,p,{scene,level,finish:240,low:false,reducedMotion:true});
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);expect(bounds.min.y).toBeGreaterThan(p.y-2.2);expect(JSON.stringify(p)).toBe(before);
});
