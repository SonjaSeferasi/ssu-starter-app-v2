import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type Biome='alpine'|'forest'|'desert'|'tropical'|'coastal'|'grassland'|'temperate';
export const palettes:Record<Biome,{sky:string;fog:string;rock:string;grass:string;leaf:string;water:string}>={
 alpine:{sky:'#9accef',fog:'#d7eaf6',rock:'#91a7b8',grass:'#edf6f7',leaf:'#447c67',water:'#3689b9'},
 forest:{sky:'#a4cee7',fog:'#d6e8d9',rock:'#a59678',grass:'#78a83d',leaf:'#35692e',water:'#3b9a9e'},
 desert:{sky:'#83c9ee',fog:'#ead4a9',rock:'#ce935a',grass:'#b9a04d',leaf:'#718d42',water:'#299aa6'},
 tropical:{sky:'#68bceb',fog:'#c4e7df',rock:'#b6a075',grass:'#7abf3e',leaf:'#287d3a',water:'#17acb5'},
 coastal:{sky:'#80c9ef',fog:'#d7f0ea',rock:'#d0bc8c',grass:'#83ba51',leaf:'#3d9851',water:'#1aadb8'},
 grassland:{sky:'#85c8ed',fog:'#e6d6aa',rock:'#c8a774',grass:'#a3b75b',leaf:'#6a8c39',water:'#389caa'},
 temperate:{sky:'#95c9ec',fog:'#d5e8dd',rock:'#b8a58a',grass:'#82b64d',leaf:'#4b863d',water:'#329cb5'},
};
export const random=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export const hash=(text:string)=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
export const matte=(color:string,roughness=.86)=>new T.MeshStandardMaterial({color,roughness});
export function mesh(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
export function sphere(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){const o=mesh(parent,new T.SphereGeometry(1,12,8),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
export function strut(parent:T.Object3D,m:T.Material,a:T.Vector3,b:T.Vector3,r:number){const o=mesh(parent,new T.CylinderGeometry(r*.84,r,a.distanceTo(b),8),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}

// three r186 draws PCFSoftShadowMap as PCFShadowMap and switches the type on
// the first shadow pass, which changes every lit shader's program key and
// recompiles them all mid-play. Asking for PCFShadowMap keeps the look and the keys.
export function stage(parent:HTMLElement,sky:string){
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;outline:none';parent.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(sky);scene.add(new T.HemisphereLight('#e7f3ff','#837246',1.6));
 const sun=new T.DirectionalLight('#fff1ce',3.2);sun.position.set(-8,18,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.camera.far=70;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
 const rim=new T.DirectionalLight('#c7e8ff',.75);rim.position.set(10,10,-8);scene.add(rim);
 return{renderer,scene,sun};
}
export function dispose(renderer:T.WebGLRenderer,scene:T.Scene){
 const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),ts=new Set<T.Texture>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)ts.add(v);}}});
 ts.forEach(t=>t.dispose());ms.forEach(m=>m.dispose());gs.forEach(g=>g.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
}
/** Collapse scenery inside one root; that root can still move as a platform. */
export function batchStatic(root:T.Object3D){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map<string,{material:T.Material;geometries:T.BufferGeometry[]}>(),originals:T.Mesh[]=[],materials=new Set<T.Material>();
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material)||o instanceof T.InstancedMesh)return;
  // UV-free sculpted roofs cannot merge with UV-mapped walls. Keep their
  // attribute layouts separate so batching cannot silently erase a whole set.
  const geometryAttributes=(o.geometry as T.BufferGeometry).attributes;
  const layout=Object.keys(geometryAttributes).sort().map(name=>{const a=geometryAttributes[name];return `${name}/${a.itemSize}/${a.normalized}`;}).join(',');
  const m=o.material as T.MeshStandardMaterial,key=[m.type,m.color?.getHexString(),m.roughness,m.metalness,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.side,m.transparent,m.opacity,m.vertexColors,m.emissive?.getHexString(),m.emissiveIntensity,layout].join(':');
  let group=groups.get(key);if(!group){group={material:m,geometries:[]};groups.set(key,group);}
  const geometry=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld));group.geometries.push(geometry);originals.push(o);materials.add(m);
 });
 for(const o of originals){o.geometry.dispose();o.removeFromParent();}
 const kept=new Set<T.Material>();for(const {material,geometries} of groups.values()){
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!geometry)continue;const m=new T.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;root.add(m);kept.add(material);
 }for(const m of materials)if(!kept.has(m))m.dispose();
}
export function sign(parent:T.Object3D,text:string,x:number,y:number,z:number,width=3.8){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const c=canvas.getContext('2d')!;
 c.fillStyle='#173e46';c.fillRect(0,0,768,160);c.strokeStyle='#e7ca70';c.lineWidth=9;c.strokeRect(7,7,754,146);c.fillStyle='#fff8d7';c.textAlign='center';c.textBaseline='middle';c.font='bold 48px Arial';
 while(c.measureText(text).width>720){const size=Number(/(\d+)px/.exec(c.font)?.[1])||48;c.font=`bold ${size-2}px Arial`;if(size<16)break;}c.fillText(text,384,80);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const o=mesh(parent,new T.PlaneGeometry(width,width*160/768),new T.MeshBasicMaterial({map:texture}),x,y,z);o.castShadow=false;return o;
}

/** Rounded, fractured real geometry, with a solid cap on the collision plane. */
export function island(parent:T.Object3D,x:number,y:number,width:number,depth:number,biome:Biome,seed:number,thickness=2.3){
 const root=new T.Group();root.position.set(x,y,0);parent.add(root);const p=palettes[biome],r=random(seed),n=24,rings=7,positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let row=0;row<=rings;row++)for(let i=0;i<=n;i++){
  const a=i/n*Math.PI*2,t=row/rings,scale=1-Math.pow(t,1.8)*.72,crease=(Math.sin(a*7+seed)+Math.sin(a*13+row*.8))*.035*Math.sin(t*Math.PI),xx=Math.cos(a)*(width/2)*scale,zz=Math.sin(a)*(depth/2)*scale;
  positions.push(xx+crease,-thickness*t,zz+crease);uvs.push(i/n*width*.65,t*thickness*.7);const c=new T.Color(p.rock).multiplyScalar(.7+(1-t)*.25+Math.sin(i*2.8+row)*.05);colors.push(c.r,c.g,c.b);
 }
 for(let row=0;row<rings;row++)for(let i=0;i<n;i++){const a=row*(n+1)+i,b=a+1,c=a+n+1;indices.push(a,b,c,b,c+1,c);}
 const rock=new T.BufferGeometry();rock.setAttribute('position',new T.Float32BufferAttribute(positions,3));rock.setAttribute('color',new T.Float32BufferAttribute(colors,3));rock.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));rock.setIndex(indices);rock.computeVertexNormals();const cliff=mesh(root,rock,new T.MeshStandardMaterial({vertexColors:true,roughness:.98}));cliff.name='country-platform-cliff';
 const cap=mesh(root,new T.CircleGeometry(1,48),matte(p.grass),0,.015,0);cap.name='country-platform-cap';cap.rotation.x=-Math.PI/2;cap.scale.set(width/2,depth/2,1);
 for(let i=0;i<Math.ceil(width*3.4);i++){
  const px=(r()-.5)*width*.86,z=(r()>.5?1:-1)*depth*(.29+r()*.12),s=.055+r()*.08;
  sphere(root,matte(p.grass),px,.025,z,s*1.8,s,s);
 }
 return root;
}

export function nature(parent:T.Object3D,biome:Biome,x:number,y:number,z:number,size:number,seed:number){
 const p=palettes[biome],r=random(seed),root=new T.Group();root.position.set(x,y,z);root.scale.setScalar(size);parent.add(root);const bark=matte('#806146'),leaf=matte(p.leaf);
 if(biome==='desert'){
  // Sparse drought shrubs are geographically neutral. A saguaro silhouette
  // would incorrectly imply that every desert country is in the Americas.
  const dry=matte('#8d8a52');sphere(root,matte(p.rock),.14,.12,0,.3,.2,.24);
  for(let i=0;i<7;i++){const a=i*2.4,end=new T.Vector3(Math.sin(a)*.34,.3+r()*.32,Math.cos(a)*.27);strut(root,bark,new T.Vector3(0,.05,0),end,.024);sphere(root,dry,end.x,end.y,end.z,.12,.07,.1);}return root;
 }
 if(biome==='alpine'||biome==='forest'){
  mesh(root,new T.CylinderGeometry(.07,.14,1.8,8),bark,0,.9,0);
  for(let i=0;i<4;i++)mesh(root,new T.ConeGeometry(.63-i*.11,.85,9),biome==='alpine'&&i<2?matte('#dcecf0'):leaf,0,.65+i*.43,0);return root;
 }
 if(biome==='tropical'||biome==='coastal'){
  strut(root,bark,new T.Vector3(0,0,0),new T.Vector3(.18,2.1,0),.1);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.18,.62,0,1.45);shape.quadraticCurveTo(-.18,.6,0,0);
   const frond=mesh(root,new T.ShapeGeometry(shape,7),new T.MeshStandardMaterial({color:p.leaf,side:T.DoubleSide,roughness:.92}),.18,2.1,0);frond.rotation.set(-1.05,a,.15);
  }return root;
 }
 const trunk=biome==='grassland'?1.55:1.2;mesh(root,new T.CylinderGeometry(.08,.16,trunk,8),bark,0,trunk/2,0);
 for(let i=0;i<7;i++){
  const a=i*2.4,flat=biome==='grassland',s=.42+r()*.14,px=Math.cos(a)*.44,pz=Math.sin(a)*.4,py=trunk+(flat?.15:r()*.45);
  strut(root,bark,new T.Vector3(0,trunk*.6,0),new T.Vector3(px,py,pz),.035);sphere(root,leaf,px,py,pz,s*(flat?1.2:1),s*(flat?.45:.85),s);
 }return root;
}

export function skyMountains(parent:T.Object3D,biome:Biome,span:number,seed:number){
 const r=random(seed),p=palettes[biome];
 for(let x=-40;x<span+45;x+=6+r()*8){
  const h=8+r()*16,z=-35-r()*30,base=matte(new T.Color(p.rock).lerp(new T.Color(p.fog),.4).getStyle());
  const g=new T.ConeGeometry(4+r()*5,h,5);const o=mesh(parent,g,base,x,h/2-12,z);o.rotation.y=r()*6;
  if(biome==='alpine'){const snow=mesh(parent,new T.ConeGeometry(2.2,h*.4,5),matte('#edf7fc'),x,h*.8-12,z);snow.rotation.y=o.rotation.y;}
 }
}
