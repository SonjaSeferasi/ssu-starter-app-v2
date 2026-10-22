import {scenicDepth} from './scenic-depth';
import * as T from 'three';
import type {Platform} from './levels';
import {surfaceY} from './terrain';
import {cliffGeometry,meadowFringe} from './terrain-model';
import {MUSHROOM_PROFILE} from './landing-geometry';

// Collision-aligned 3D landscape meshes; scenic-depth supplies the distant matte vista.
export const unit=100;
export function seeded(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function mesh(g:T.BufferGeometry,m:T.Material|T.Material[],parent:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export const material=(color:T.ColorRepresentation,roughness=.9)=>new T.MeshStandardMaterial({color,roughness});
export function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:T.ColorRepresentation){return mesh(new T.BoxGeometry(w,h,d),material(color),parent,x,y,z);}
export function cylinder(parent:T.Object3D,x:number,y:number,z:number,r:number,h:number,color:T.ColorRepresentation,top=r){return mesh(new T.CylinderGeometry(top,r,h,12),material(color),parent,x,y,z);}
export function link(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,color:T.ColorRepresentation){const o=cylinder(parent,0,0,0,r,a.distanceTo(b),color);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
function stoneTexture(seed:number,grass=false){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!,r=seeded(seed);c.fillStyle=grass?'#59753c':'#a49376';c.fillRect(0,0,256,256);for(let i=0;i<5000;i++){const a=r();c.fillStyle=grass?`rgba(${40+a*90},${60+a*90},${20+a*45},.25)`:`rgba(${60+a*150},${50+a*130},${35+a*110},.24)`;c.fillRect(r()*256,r()*256,1+r()*10,1+r()*5);}if(!grass)for(let i=0;i<20;i++){c.strokeStyle='rgba(45,36,25,.15)';c.beginPath();const y=r()*256;c.moveTo(0,y);for(let x=0;x<260;x+=16)c.lineTo(x,y+Math.sin(x/40+i)*8+r()*5);c.stroke();}const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;return t;}
const atlasCache=new Map<number|string,T.Texture>();
function atlas(part:number){let texture=atlasCache.get(part);if(!texture){texture=new T.TextureLoader().load('/jumpyland/terrain-materials-v1.png');texture.colorSpace=T.SRGBColorSpace;texture.repeat.set(.495,.495);texture.offset.set(part%2*.5,part<2?.5:0);texture.anisotropy=8;atlasCache.set(part,texture);}return texture;}
function pbr(name:string,srgb=false){const key=name+(srgb?':srgb':':linear');let texture=atlasCache.get(key);if(!texture){texture=new T.TextureLoader().load('/jumpyland/pbr/'+name+'.jpg');texture.wrapS=texture.wrapT=T.RepeatWrapping;if(srgb)texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;atlasCache.set(key,texture);}return texture;}
function scenicTexture(name:string){const key='scenery:'+name;let t=atlasCache.get(key);if(!t){t=new T.TextureLoader().load('/jumpyland/scenery-v2/'+name+'.webp');t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;atlasCache.set(key,t);}return t;}
function foliageTexture(blue:boolean){
 if(!blue)return scenicTexture('foliage');
 const key='blue-leaf-albedo';let t=atlasCache.get(key);if(t)return t;
 t=new T.TextureLoader().load('/jumpyland/scenery-v2/foliage.webp',loaded=>{
  const source=loaded.image as HTMLImageElement,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4){const l=pixels.data[i]*.213+pixels.data[i+1]*.715+pixels.data[i+2]*.072;pixels.data[i]=l*.50;pixels.data[i+1]=l*1.03;pixels.data[i+2]=Math.min(255,l*1.3);}
  ctx.putImageData(pixels,0,0);(loaded as T.Texture).image=canvas;loaded.needsUpdate=true;
 });t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;atlasCache.set(key,t);return t;
}
export function clayMaterial(color:string){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!,r=seeded(514);c.fillStyle='#ccbba2';c.fillRect(0,0,256,256);
 for(let i=0;i<16000;i++){c.fillStyle=i%3?'#593a2720':'#fff0d422';c.fillRect(r()*256,r()*256,.4+r()*2,.4+r()*2);}
 const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;
 const mat=new T.MeshStandardMaterial({color,map:t,bumpMap:t,bumpScale:.016,roughness:.97});return mat;
}
export function terrainMaterials(world:number,compact=false){
 const prefix=world===3?'mossy_rock':'mossy_sandstone';
 const rock=material(world===2?'#e6bf96':'#d0c5aa');rock.vertexColors=true;rock.map=pbr(prefix+'-Diffuse',true);
 if(!compact){rock.normalMap=pbr(prefix+'-nor_gl');rock.roughnessMap=pbr(prefix+'-Rough');}rock.normalScale.set(.85,.85);
 const turf=material(world===2?'#a5b86b':'#8cab56');turf.vertexColors=true;turf.map=pbr('aerial_grass_rock-Diffuse',true);
 if(!compact){turf.normalMap=pbr('aerial_grass_rock-nor_gl');turf.roughnessMap=pbr('aerial_grass_rock-Rough');}turf.normalScale.set(.7,.7);
 return{rock,turf};
}
export function island(parent:T.Object3D,p:Platform,world:number,mats:ReturnType<typeof terrainMaterials>,seed=1,grounded=false,bottom?:number){
 const root=new T.Group();root.position.set(p.x/100,0,0);parent.add(root);
 const shapes=cliffGeometry(p,bottom??(grounded?1600:p.y+150+p.width*.2),seed);
 mesh(shapes.rock,mats.rock,root);mesh(shapes.cap,mats.turf,root);root.add(meadowFringe(p,seed+91));
 return root;
}
export function deck(parent:T.Object3D,p:Platform,bamboo=false){
 const root=new T.Group();root.position.x=p.x/100;parent.add(root);const w=p.width/100,y=-p.y/100,d=p.depth||2.5;
 const wood=material(bamboo?'#a6a16a':'#c8ab80');wood.map=timberTexture();wood.bumpMap=wood.map;wood.bumpScale=.035;
 const n=Math.ceil(w/.18),geo=bamboo?new T.CylinderGeometry(.095,.105,d,14):new T.BoxGeometry(w/n-.006,.12,d),planks=new T.InstancedMesh(geo,wood,n),dummy=new T.Object3D(),r=seeded(p.x+21);
 planks.castShadow=planks.receiveShadow=true;
 for(let i=0;i<n;i++){dummy.position.set((i+.5)*w/n,y-(bamboo?.105:.06),0);dummy.rotation.set(bamboo?Math.PI/2:0,0,0);dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);planks.setColorAt(i,new T.Color().setScalar(.76+r()*.24));}root.add(planks);
 for(const z of [-d*.38,d*.38]){const beam=box(root,w/2,y-.24,z,w,.16,.16,'#807052');(beam.material as T.MeshStandardMaterial).map=atlas(3);}
 if(bamboo){
  const joints=new T.InstancedMesh(new T.TorusGeometry(.101,.009,5,12),material('#667c36'),n*3),holes=new T.InstancedMesh(new T.CircleGeometry(.066,12),material('#3f5126'),n),joint=new T.Object3D();
  for(let i=0;i<n;i++){
   for(let j=0;j<3;j++){joint.position.set((i+.5)*w/n,y-.105,(j-1)*d*.32);joint.rotation.set(0,0,0);joint.updateMatrix();joints.setMatrixAt(i*3+j,joint.matrix);}
   joint.position.set((i+.5)*w/n,y-.105,d/2+.001);joint.updateMatrix();holes.setMatrixAt(i,joint.matrix);
  }root.add(joints,holes);
 }
 // Rope lashings wrap both support beams. Their fibers catch the side light.
 const rope=material('#bbaa7b');
 for(const x of [.16,w-.16])for(let i=0;i<4;i++){
  const wrap=mesh(new T.TorusGeometry(.14,.014,6,24),rope,root,x+i*.025,y-.13,0);wrap.rotation.y=Math.PI/2;wrap.scale.x=d/(.28)+.1;
 }
 if(!bamboo)for(const x of [.08,w-.08])for(const z of [-d*.38,d*.38])cylinder(root,x,y+.002,z,.018,.008,'#34392e');
 return root;
}
function timberTexture(){
 const key='timber-grain';let t=atlasCache.get(key);if(t)return t;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;const c=canvas.getContext('2d')!,r=seeded(731);c.fillStyle='#c8ad7d';c.fillRect(0,0,128,512);
 for(let i=0;i<170;i++){const x=r()*128;c.strokeStyle=i%3?'#6e4e2c30':'#f2d7a84a';c.lineWidth=.4+r()*1.3;c.beginPath();c.moveTo(x,0);for(let y=0;y<=512;y+=16)c.lineTo(x+Math.sin(y*.014+i)*1.6,y);c.stroke();}
 for(let j=0;j<3;j++){c.strokeStyle='#7b593d55';c.lineWidth=.7;c.beginPath();c.ellipse(20+r()*88,r()*512,2+r()*3,9+r()*18,0,0,Math.PI*2);c.stroke();}
 t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;atlasCache.set(key,t);return t;
}
export function tree(parent:T.Object3D,x:number,y:number,z:number,height=6,blue=false){
 const root=new T.Group();root.position.set(x,y,z);parent.add(root);let ancestor:T.Object3D=parent;while(ancestor.parent)ancestor=ancestor.parent;const compact=ancestor.userData.compact===true;const r=seeded(Math.round(x*91+z*41+height*71));
 const bark=material('#c5b8a1');bark.map=pbr('japanese_cedar_bark-Diffuse',true);bark.normalMap=pbr('japanese_cedar_bark-nor_gl');bark.roughnessMap=pbr('japanese_cedar_bark-Rough');bark.normalScale.set(.8,.8);
 const points:T.Vector2[]=[];for(let i=0;i<=14;i++){const t=i/14;points.push(new T.Vector2(height*(.009+(height>10?.072:.039)*Math.pow(1-t,1.6))*(1+Math.sin(t*18)*.07),t*height*.9));}
 const trunk=mesh(new T.LatheGeometry(points,14),bark,root);const positions=trunk.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const yy=positions.getY(i)/height;positions.setX(i,positions.getX(i)+Math.sin(yy*4.5)*height*.018);}trunk.geometry.computeVertexNormals();
 for(let j=0;j<4;j++){const a=j*1.57+height;link(root,new T.Vector3(0,height*.13,0),new T.Vector3(Math.cos(a)*height*.09,0,Math.sin(a)*height*.09),height*.014,'#7d7450');}
 const count=compact?28:height>10?160:90;
 const foliageTex=foliageTexture(blue);
 const foliageMat=new T.MeshStandardMaterial({map:foliageTex,color:blue?'#77bfd3':'#c1d493',side:T.DoubleSide,alphaTest:.48,roughness:1});
 const foliage=new T.InstancedMesh(new T.PlaneGeometry(1,1),foliageMat,count),dummy=new T.Object3D();foliage.receiveShadow=true;foliage.castShadow=!compact;
 const branches:T.Vector3[]=[];
 for(let j=0;j<9;j++){
  const a=j*2.4,large=height>10,end=new T.Vector3(Math.cos(a)*height*(large?.12:.17),height*((large?.90:.73)+r()*(large?.12:.21)),Math.sin(a)*height*(large?.11:.14));branches.push(end);
  const branch=link(root,new T.Vector3(0,height*.63,0),end,height*.004,'#b39b79');branch.material=bark;
 }
 for(let i=0;i<count;i++){
  const b=branches[i%branches.length],a=r()*Math.PI*2,v=r()*2-1,rr=Math.sqrt(1-v*v),radius=height*(height>10?.065:.12);
  dummy.position.set(b.x+Math.cos(a)*rr*radius,b.y+v*radius*.7,b.z+Math.sin(a)*rr*radius);
  dummy.scale.setScalar(height*((height>10?.045:.14)+r()*(height>10?.04:.075)));dummy.rotation.set((r()-.5)*1.8,r()*Math.PI*2,(r()-.5)*1.1);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);
  foliage.setColorAt(i,new T.Color().setScalar(.75+r()*.25));
 }root.add(foliage);
 if(height>10)ivy(root,height,bark,r);return root;
}
export const mushroomCrownHeight=1.47;
function ivy(root:T.Group,height:number,bark:T.Material,r:()=>number){
 const leaf=new T.BufferGeometry();leaf.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.055,.07,.025,0,.15,.05,.055,.07,.025,0,.07,.055],3));leaf.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leaf.computeVertexNormals();
 const leaves=new T.InstancedMesh(leaf,new T.MeshStandardMaterial({color:'#65823a',roughness:.9,side:T.DoubleSide}),Math.floor(height*40)),dummy=new T.Object3D();leaves.castShadow=leaves.receiveShadow=true;
 for(let i=0;i<leaves.count;i++){const t=r()*.7,a=t*20+i%4*1.57,rad=height*(.009+.072*Math.pow(1-t,1.6))+.025;dummy.position.set(Math.cos(a)*rad,t*height,Math.sin(a)*rad);dummy.rotation.set((r()-.5)*.8,-a,Math.sin(i)*.4);dummy.scale.setScalar(.8+r()*1.6);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new T.Color().setHSL(.22+r()*.05,.45,.28+r()*.18));}root.add(leaves);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,end=new T.Vector3(Math.cos(a)*height*.16,.01,Math.sin(a)*height*.16);const rootwood=link(root,new T.Vector3(0,height*.14,0),end,height*.023,'#78664a');rootwood.material=bark;}
}
export function mushroom(parent:T.Object3D,x:number,y:number,z:number,size=1){
 const root=new T.Group();root.position.set(x,y,z);root.scale.setScalar(size);parent.add(root);
 const r=seeded(Math.round(x*71+z*23+321)),canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;
 const red=c.createLinearGradient(0,0,0,512);red.addColorStop(0,'#b94e32');red.addColorStop(.7,'#a83926');red.addColorStop(1,'#d0744a');c.fillStyle=red;c.fillRect(0,0,512,512);
 for(let i=0;i<25;i++){const xx=r()*512,yy=30+r()*450,rr=9+r()*18;c.fillStyle=i%3?'#ece4cd':'#dcd1b8';c.beginPath();for(let j=0;j<=14;j++){const a=j/14*Math.PI*2,rad=rr*(.87+r()*.2);const px=xx+Math.cos(a)*rad,py=yy+Math.sin(a)*rad*.7;j?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fill();}
 for(let i=0;i<14000;i++){c.fillStyle=r()>.5?'#f8deb017':'#491c1a14';c.fillRect(r()*512,r()*512,1+r()*2,1+r()*2);}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const capmat=new T.MeshPhysicalMaterial({map:tex,bumpMap:tex,bumpScale:.012,roughness:.46,clearcoat:.22,clearcoatRoughness:.4});
 const stem=mesh(new T.LatheGeometry([new T.Vector2(.2,0),new T.Vector2(.22,.1),new T.Vector2(.15,.35),new T.Vector2(.12,.7),new T.Vector2(.16,.95),new T.Vector2(.24,1.05)],28),material('#e8dab9'),root);
 const cap=mesh(new T.LatheGeometry([new T.Vector2(.81,1.04),...[...MUSHROOM_PROFILE].reverse().map(([x,y])=>new T.Vector2(x,y))],56),capmat,root);
 const underside=mesh(new T.CircleGeometry(.8,48),material('#c6ae85'),root,0,1.04,0);underside.rotation.x=Math.PI/2;
 const gills=new T.InstancedMesh(new T.BoxGeometry(.58,.012,.008),material('#e6d6af'),64),dummy=new T.Object3D();for(let i=0;i<64;i++){const a=i/64*Math.PI*2;dummy.position.set(Math.cos(a)*.48,1.035,Math.sin(a)*.48);dummy.rotation.y=-a;dummy.updateMatrix();gills.setMatrixAt(i,dummy.matrix);}root.add(gills);root.userData.crownHeight=mushroomCrownHeight;return root;
}
export function pipe(parent:T.Object3D,x:number,y:number,z:number){const root=new T.Group();root.position.set(x,y,z);parent.add(root);const m=new T.MeshStandardMaterial({color:'#288435',metalness:.35,roughness:.24});mesh(new T.CylinderGeometry(.42,.42,.9,32,1,true),m,root,0,.45,0);mesh(new T.CylinderGeometry(.5,.5,.2,32,1,true),m,root,0,.95,0);const rim=mesh(new T.TorusGeometry(.455,.055,10,32),m,root,0,.995,0);rim.rotation.x=Math.PI/2;const hole=mesh(new T.CircleGeometry(.4,32),material('#182f24'),root,0,.86,0);hole.rotation.x=-Math.PI/2;return root;}
export function castle(parent:T.Object3D,x:number,y:number,z:number,world=1){const root=new T.Group();root.position.set(x,y,z);parent.add(root);box(root,0,1.5,0,4,3,2.5,world===1?'#d8d5bf':'#cab28d');for(const xx of [-2,2])for(const zz of [-1,1]){cylinder(root,xx,2,zz,.48,4,'#d5cfb5');mesh(new T.ConeGeometry(.72,1.5,12),material(world===1?'#9c4b3d':'#596d67'),root,xx,4.7,zz);}const arch=new T.Shape();arch.moveTo(-.68,0);arch.lineTo(-.68,1.05);arch.absarc(0,1.05,.68,Math.PI,0,true);arch.lineTo(.68,0);arch.lineTo(.49,0);arch.lineTo(.49,1.05);arch.absarc(0,1.05,.49,0,Math.PI,false);arch.lineTo(-.49,0);arch.closePath();const stone=material('#d9d2bc');stone.map=pbr('mossy_rock-Diffuse',true);stone.normalMap=pbr('mossy_rock-nor_gl');stone.normalScale.set(.3,.3);mesh(new T.ExtrudeGeometry(arch,{depth:.18,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1}),stone,root,0,0,1.25);box(root,0,.7,1.26,1,1.4,.04,'#3d3f37');for(const xx of [-2,2])for(const zz of [-1,1]){for(let j=0;j<4;j++){const band=mesh(new T.TorusGeometry(.48,.018,6,32),stone,root,xx,.65+j*.85,zz);band.rotation.x=Math.PI/2;}for(let j=0;j<4;j++){const a=j*Math.PI/2;box(root,xx+Math.sin(a)*.482,2.7,zz+Math.cos(a)*.482,.12,.45,.06,'#4c5048');}}for(let i=-3;i<=3;i++)box(root,i*.57,3.15,1.12,.25,.4,.3,'#ddd8c5');root.traverse(object=>{if(object instanceof T.Mesh&&object.material instanceof T.MeshStandardMaterial){const mat=object.material,key=mat.color.getHexString();if(['d8d5bf','d5cfb5','ddd8c5','cab28d'].includes(key)){mat.map=stoneTexture(91);mat.color.set('#f1e7ce');mat.bumpMap=mat.map;mat.bumpScale=.025;mat.roughness=.95;}}});return root;}
export function bridge(parent:T.Object3D,x1:number,x2:number,y:number,z=0){
 const root=new T.Group();parent.add(root);const n=Math.ceil((x2-x1)/.18),wood=material('#c3a579');wood.map=timberTexture();wood.bumpMap=wood.map;wood.bumpScale=.035;
 const planks=new T.InstancedMesh(new T.BoxGeometry((x2-x1)/n-.006,.12,2.3),wood,n+1),dummy=new T.Object3D();planks.castShadow=planks.receiveShadow=true;
 for(let i=0;i<=n;i++){const t=i/n,x=x1+(x2-x1)*t,drop=Math.sin(t*Math.PI)*.22;dummy.position.set(x,y-drop-.06,z);dummy.rotation.set(0,0,0);dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);planks.setColorAt(i,new T.Color().setScalar(.82+Math.sin(i*4.1)*.13));}root.add(planks);
 for(const zz of [-1.1,1.1]){let prev=new T.Vector3(x1,y+.8,z+zz);for(let i=0;i<=18;i++){const t=i/18,x=x1+(x2-x1)*t,drop=Math.sin(t*Math.PI)*.22,next=new T.Vector3(x,y+.8-drop,z+zz);if(i)link(root,prev,next,.023,'#c5b18a');if(i%3===0){const post=link(root,new T.Vector3(x,y-drop-.25,z+zz),new T.Vector3(x,y-drop+.84,z+zz),.045,'#978260');(post.material as T.MeshStandardMaterial).map=atlas(3);for(const yy of [.12,.18]){const knot=mesh(new T.TorusGeometry(.054,.012,6,12),material('#c5b18a'),root,x,y-drop+yy+.5,z+zz);knot.rotation.x=Math.PI/2;}}prev=next;}}
 return root;
}
export function createStage(canvas?:HTMLCanvasElement){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.domElement.dataset.renderer='three-webgl';
 const scene=new T.Scene();scene.userData.compact=!!canvas;if(canvas)renderer.shadowMap.enabled=false;scene.background=new T.Color('#9dc9e3');
 const sky=mesh(new T.SphereGeometry(180,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{high:{value:new T.Color('#438cc5')},low:{value:new T.Color('#bedce8')}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 high;uniform vec3 low;void main(){float h=smoothstep(-.1,.6,normalize(v).y);gl_FragColor=vec4(mix(low,high,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}),scene);sky.castShadow=sky.receiveShadow=false;
 scene.fog=new T.Fog('#afcedb',34,145);scene.add(new T.HemisphereLight('#d8eaff','#53613d',.68));
 const sun=new T.DirectionalLight('#fff0d2',2.65);sun.position.set(-8,20,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;sun.shadow.camera.far=90;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=2;scene.add(sun,sun.target);
 const rim=new T.DirectionalLight('#b9d7ed',.48);rim.position.set(4,5,-12);scene.add(rim);return{renderer,scene,sun};
}
export function environment(scene:T.Scene,world:number,width:number){
 if(!scene.userData.compact)return scenicDepth(scene,world,width);
 const root=new T.Group();root.name='authored-biome';scene.add(root);const r=seeded(world*239),mats=terrainMaterials(world,scene.userData.compact===true),flows:T.Texture[]=[],clouds:T.Mesh[]=[];
 const waterMat=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:'varying vec3 world;uniform float time;void main(){vec3 n=normalize(vec3(.07*cos(world.x*3.+time),1.,.05*sin(world.z*4.+time*.7)));vec3 eye=normalize(cameraPosition-world);float f=pow(1.-max(dot(n,eye),0.),3.);float sun=pow(max(dot(reflect(normalize(vec3(.4,-1.,-.3)),n),eye),0.),100.);float ripple=.5+.5*sin(world.x*1.8+world.z*.9+time*.5);vec3 c=mix(vec3(.07,.29,.34),vec3(.32,.63,.67),.2+ripple*.08+f*.7);c+=vec3(1.,.94,.75)*sun*.6;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const water=mesh(new T.PlaneGeometry(width+220,200),waterMat,root,width/2,-16,-45);if(world===3){water.visible=false;const floor=mesh(new T.PlaneGeometry(width+100,100),mats.turf,root,width/2,-15.9,-40);floor.rotation.x=-Math.PI/2;floor.castShadow=false;}water.rotation.x=-Math.PI/2;water.castShadow=water.receiveShadow=false;
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=512;cloudCanvas.height=192;const cc=cloudCanvas.getContext('2d')!;
 for(let j=0;j<34;j++){const x=50+r()*400,y=70+r()*50,rad=25+r()*45,g=cc.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,'#fffdf3ab');g.addColorStop(1,'#fffdf300');cc.fillStyle=g;cc.fillRect(x-rad,y-rad,rad*2,rad*2);}const cloudTex=new T.CanvasTexture(cloudCanvas);cloudTex.colorSpace=T.SRGBColorSpace;
 for(let layer=0;layer<(scene.userData.compact?1:2);layer++){
  const spacing=scene.userData.compact?22:layer?24:12,n=Math.ceil((width+35)/spacing);
  for(let i=0;i<n;i++){
   const x=-18+i*spacing+(r()-.5)*3,z=-(layer?68:33)-r()*12,w=(layer?12:5)+r()*(layer?8:4),h=(layer?18:9)+r()*(layer?8:5),p:Platform={x:x*100,y:1600-h*100,width:w*100,depth:5+r()*6};
   if(world===3&&layer===0)p.y=400+r()*400;
   const land=island(root,p,world,mats,100+i+layer*61,true);land.position.z=z;
   const top=-surfaceY(p,p.x+p.width*.5)/100;
   // Each grove grows from an actual shelf, rather than floating in front of it.
   if(i%2===0||world===3)tree(root,x+w*.45,top,z,world===3?7+r()*5:world===2?2+r()*2:3+r()*3,world===2);
   if(layer===0&&i%4===1&&world!==3){
    const c=document.createElement('canvas');c.width=64;c.height=256;const ctx=c.getContext('2d')!;const gradient=ctx.createLinearGradient(0,0,64,0);gradient.addColorStop(0,'#b6e6ec00');gradient.addColorStop(.25,'#e4faf5c0');gradient.addColorStop(.5,'#efffffea');gradient.addColorStop(.8,'#bce6e3a0');gradient.addColorStop(1,'#a6dae000');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,256);for(let k=0;k<90;k++){ctx.fillStyle='#ffffff55';ctx.fillRect(r()*64,r()*256,.5+r()*2,3+r()*30);}const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.y=h/2;flows.push(tex);
    const fall=mesh(new T.PlaneGeometry(.5+r()*.4,h,5,10),new T.MeshStandardMaterial({map:tex,color:'#e8f5ef',transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false,roughness:.35}),root,x+w*.55,top-h/2,z+(p.depth||5)/2+.1);fall.castShadow=false;
    const mist=mesh(new T.PlaneGeometry(2.5,1.2),new T.MeshBasicMaterial({map:cloudTex,transparent:true,opacity:.55,depthWrite:false}),root,x+w*.55,-15.3,z+(p.depth||5)/2+.2);mist.castShadow=false;
   }
  }
 }
 for(let i=0;i<7;i++){const cloud=mesh(new T.PlaneGeometry(12+r()*7,4+r()*2),new T.MeshBasicMaterial({map:cloudTex,transparent:true,opacity:.5,depthWrite:false}),root,-10+i*(width+25)/7,11+r()*7,-40-r()*28);cloud.castShadow=cloud.receiveShadow=false;clouds.push(cloud);}
 if(world===2){
  const planetMat=material('#8ebdc5',1);planetMat.map=null;planetMat.normalMap=null;planetMat.normalScale.set(.04,.04);const planet=mesh(new T.SphereGeometry(14,48,32),planetMat,root,width*.6,22,-91);planet.castShadow=false;
  mesh(new T.SphereGeometry(4.3,32,24),material('#c1d1d3'),root,width*.6+26,26,-89).castShadow=false;
 }
 if(world===3){
  for(let layer=0;layer<2;layer++)for(let i=0;i<15;i++){const x=-6+i*(width+12)/15+(layer?1.5:0),z=-(layer?30:12)-r()*4;tree(root,x,-16,z,18+r()*7);}
  // A distant roof line gives the forest a destination without blocking jumps.
  for(let i=0;i<7;i++){const x=width*.58+i*3.6,base=-8+r()*2;box(root,x,base+1,-28,2.4,2,2,'#d7bb91');const roof=mesh(new T.ConeGeometry(2.1,1.1,4),material('#9c6449'),root,x,base+2.5,-28);roof.rotation.y=Math.PI/4;}
 }else if(world===1){
  castle(root,width*.27,-2.8,-18);castle(root,width*.78,-1,-29);
  for(const [x,size] of [[5,1.2],[17,1.7],[30,.9],[43,1.5]])mushroom(root,x,-5.5,-9,size);
 }
 return{update(time:number,_camera?:T.Camera){waterMat.uniforms.time.value=time*.001;for(let i=0;i<clouds.length;i++)clouds[i].position.x+=Math.sin(time*.00001+i)*.0003;for(const tex of flows)tex.offset.y=-time*.0003;},dispose(){atlasCache.clear();}};
}
export function disposeStage(renderer:T.WebGLRenderer,scene:T.Scene){const textures=new Set<T.Texture>(),materials=new Set<T.Material>(),geometries=new Set<T.BufferGeometry>();scene.traverse(o=>{const m=o as T.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material]){materials.add(mat);for(const val of Object.values(mat))if(val instanceof T.Texture)textures.add(val);}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());renderer.dispose();renderer.forceContextLoss();}
