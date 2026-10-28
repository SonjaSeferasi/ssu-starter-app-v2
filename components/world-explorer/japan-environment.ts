import * as T from 'three';
import {batchStatic,hash,island,matte,mesh,random,sphere,strut} from './scenic-kit';
import {eavesRoof} from './country-platforms';

export type JapanEnvironmentOptions={
 platforms:readonly {x:number;y:number;width:number;motion:string|null}[];
 finish:number;
 reducedMotion?:boolean;
 quality?:'standard'|'low';
};

export const japanEnvironmentInfo={
 id:'japan-mountain-spring',
 title:'Cherry Blossom Mountain Path',
 license:'Original procedural geometry and textures created for SocialU; no external model or texture assets.',
 representation:'A fictional spring platform course inspired by Japanese mountain scenery. Its pagodas, gardens and platforms are not a reconstruction of one historic site.',
 landmarkSource:'https://whc.unesco.org/en/list/1418/',
 assets:['snow-streaked-fuji','curved-eaves-pagoda','red-torii','branching-cherry-grove','mossy-granite-terraces','flowing-waterfall','mist-and-foam','spring-petals'],
};

const colors={sky:'#83c9f5',haze:'#dfedf2',pink:'#f4a8c8',pale:'#f9d7e7',red:'#c94540',green:'#44875f',wood:'#8c593f',snow:'#f0f5fa',rock:'#929ca0',tiles:'#344a57'};
const box=(root:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>mesh(root,new T.BoxGeometry(w,h,d),m,x,y,z);
const beam=(root:T.Object3D,m:T.Material,a:[number,number,number],b:[number,number,number],radius=.06)=>strut(root,m,new T.Vector3(...a),new T.Vector3(...b),radius);

/** Reusable checkpoint/finish geometry. The controller supplies its actual
 * collision/trigger definition; this object is purely the visible marker. */
export function addJapanTorii(parent:T.Object3D,x:number,y:number,z:number,width=3){
 const root=new T.Group();root.name='japan-torii-gate';root.position.set(x,y,z);parent.add(root);
 const red=matte(colors.red),dark=matte(colors.tiles),stone=matte('#a8a896');
 for(const side of [-1,1]){
  const leg=mesh(root,new T.CylinderGeometry(.13,.17,2.6,12),red,side*width*.38,1.3,0);leg.rotation.z=side*-.035;
  box(root,side*width*.38,.12,0,.45,.24,.48,stone);
 }
 box(root,0,2.15,0,width*.92,.16,.21,red);box(root,0,2.62,0,width*1.17,.2,.36,red);
 const curve=new T.QuadraticBezierCurve3(new T.Vector3(-width*.62,2.83,0),new T.Vector3(0,2.61,0),new T.Vector3(width*.62,2.83,0));
 mesh(root,new T.TubeGeometry(curve,18,.095,6,false),dark);box(root,0,2.39,.02,.23,.48,.12,red);
 return root;
}

function fuji(parent:T.Group,x:number){
 const root=new T.Group();root.name='mount-fuji';root.position.set(x,-3,-78);root.userData.landmark='Mount Fuji';root.userData.source=japanEnvironmentInfo.landmarkSource;parent.add(root);
 const segments=64,rings=22,pos:number[]=[],normalColors:number[]=[],uv:number[]=[],indices:number[]=[];
 const rock=new T.Color('#8aa1b4'),snow=new T.Color(colors.snow);
 for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
  const t=row/rings,a=i/segments*Math.PI*2;
  const ridge=(Math.sin(a*9)+Math.sin(a*19)*.35)*.035*Math.sin(t*Math.PI);
  const radius=(27*Math.pow(1-t,.85)+1.8)*(1+ridge),height=t*23;
  pos.push(Math.sin(a)*radius,height,Math.cos(a)*radius*.54);uv.push(i/segments,t);
  const snowLine=.68+Math.sin(a*7)*.045+Math.sin(a*17)*.025;
  const c=(t>snowLine?snow:rock).clone().multiplyScalar(.84+Math.cos(a+.5)*.13+t*.05);normalColors.push(c.r,c.g,c.b);
 }
 for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,c,b,b,c,c+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new T.Float32BufferAttribute(normalColors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mountain=mesh(root,geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));mountain.name='fuji-snow-streaked-volcanic-slope';mountain.castShadow=false;
 const crater=mesh(root,new T.CircleGeometry(1.8,32),matte('#a3aebb'),0,23.01,0);crater.rotation.x=-Math.PI/2;crater.scale.y=.54;crater.castShadow=false;
 return root;
}

function pagoda(parent:T.Group,x:number,y:number,z:number,scale:number,tiers:number){
 const root=new T.Group();root.name='spring-pagoda';root.position.set(x,y,z);root.scale.setScalar(scale);parent.add(root);
 const red=matte(colors.red),plaster=matte('#e8dfca'),tiles=matte(colors.tiles),wood=matte(colors.wood),gold=matte('#d5b66d');tiles.side=T.DoubleSide;
 box(root,0,.2,0,5,.4,4,matte('#b8baaa'));
 for(let i=0;i<tiers;i++){
  const w=4-i*.46,base=.4+i*1.37;
  box(root,0,base+.52,0,w,1.04,w*.72,plaster);
  for(const side of [-1,1])for(const dx of [-.38,0,.38]){
   box(root,dx*w,base+.54,side*w*.375,.09,1.12,.09,red);
   box(root,dx*w,base+.49,side*w*.38,.25,.45,.025,wood);
  }
  for(const side of [-1,1]){box(root,0,base+.25,side*w*.43,w*1.16,.07,.075,red);box(root,0,base+.64,side*w*.43,w*1.16,.055,.06,red);}
  const roof=mesh(root,eavesRoof(w*1.55,w*1.13,.77),tiles,0,base+1.05,0);roof.name='japan-curved-tier-roof';box(root,0,base+1.83,0,w*.25,.07,w*.2,tiles);
  for(const dx of [-w*.39,w*.39])for(const side of [-1,1])beam(root,wood,[dx,base+.88,side*w*.3],[dx,base+1.07,side*w*.57],.035);
 }
 const top=.4+tiers*1.37;beam(root,gold,[0,top,0],[0,top+1.2,0],.035);
 for(let i=0;i<5;i++){const ring=mesh(root,new T.TorusGeometry(.2-i*.025,.018,5,16),gold,0,top+.14+i*.17,0);ring.rotation.x=Math.PI/2;}
 batchStatic(root);return root;
}

function blossomGeometry(){
 const shape=new T.Shape();for(let i=0;i<=30;i++){const a=i/30*Math.PI*2,r=.075*(.77+.23*Math.cos(a*5));if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();return new T.ShapeGeometry(shape);
}

function cherryTree(parent:T.Group,x:number,y:number,z:number,size:number,seed:number,low:boolean){
 const root=new T.Group();root.name='japan-branching-cherry-tree';root.position.set(x,y,z);root.scale.setScalar(size);parent.add(root);
 const r=random(seed),bark=matte('#775e53'),pink=matte(colors.pink),pale=matte(colors.pale);
 const trunk=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.12,.8,0),new T.Vector3(.18,1.55,.03),new T.Vector3(.02,2.3,0)]);
 mesh(root,new T.TubeGeometry(trunk,12,.13,7,false),bark);
 const ends:T.Vector3[]=[];
 for(let i=0;i<(low?5:7);i++){
  const a=i*2.4,point=new T.Vector3(Math.sin(a)*(1.1+r()*.2),2.25+r()*.7,Math.cos(a)*.85);ends.push(point);
  const branch=new T.CatmullRomCurve3([new T.Vector3(.1,1.2,0),new T.Vector3(point.x*.55,1.9,point.z*.45),point]);
  mesh(root,new T.TubeGeometry(branch,8,.055,6,false),bark);
  sphere(root,i%2?pink:pale,point.x,point.y,point.z,.64,.36,.53);
  for(let j=0;j<2;j++){const end=point.clone().add(new T.Vector3((r()-.5)*.8,.22+r()*.2,(r()-.5)*.6));beam(root,bark,point.toArray() as [number,number,number],end.toArray() as [number,number,number],.024);}
 }
 const flowers=new T.InstancedMesh(blossomGeometry(),new T.MeshStandardMaterial({color:'#ffd5e5',side:T.DoubleSide,roughness:1}),low?42:84);flowers.name='instanced-cherry-blossoms';flowers.castShadow=false;
 const dummy=new T.Object3D();for(let i=0;i<flowers.count;i++){const end=ends[i%ends.length],a=r()*Math.PI*2,rr=.38+r()*.34;dummy.position.set(end.x+Math.sin(a)*rr,end.y+(r()-.5)*.65,end.z+Math.cos(a)*rr*.75);dummy.rotation.set((r()-.5)*.8,(r()-.5)*.8,r()*Math.PI);dummy.scale.setScalar(.8+r()*.7);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);}root.add(flowers);
 // Batch only the wood and blossom masses; instanced flowers remain instanced.
 batchStatic(root);return root;
}

function lantern(parent:T.Group,x:number,y:number,z:number){
 const root=new T.Group();root.name='japan-stone-lantern';root.position.set(x,y,z);parent.add(root);const stone=matte('#aaa990'),dark=matte(colors.tiles);
 box(root,0,.1,0,.5,.2,.5,stone);box(root,0,.45,0,.18,.7,.18,stone);box(root,0,.86,0,.47,.32,.44,stone);
 box(root,0,.88,.225,.22,.2,.015,new T.MeshStandardMaterial({color:'#f3d596',emissive:'#d5a04f',emissiveIntensity:.35}));
 const roof=mesh(root,new T.ConeGeometry(.43,.2,4),dark,0,1.16,0);roof.rotation.y=Math.PI/4;sphere(root,stone,0,1.31,0,.07);
 batchStatic(root);return root;
}

function fallingWater(parent:T.Group,x:number,top:number,z:number,width:number,height:number,seed:number,low:boolean){
 const root=new T.Group();root.name='japan-animated-waterfall';root.position.set(x,top,z);root.userData.animated=true;parent.add(root);
 const r=random(seed),w=32,h=64,data=new Uint8Array(w*h*4);
 for(let row=0;row<h;row++)for(let col=0;col<w;col++){const streak=Math.sin(col*1.85+Math.sin(row*.12))*.5+.5,v=Math.round(155+streak*75+r()*22),index=(row*w+col)*4;data[index]=v-26;data[index+1]=v;data[index+2]=Math.min(255,v+10);data[index+3]=Math.round(145+streak*75);}
 const texture=new T.DataTexture(data,w,h,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,height*.24);texture.needsUpdate=true;texture.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshStandardMaterial({map:texture,color:'#cceef4',transparent:true,opacity:.86,side:T.DoubleSide,roughness:.27,depthWrite:false,emissive:'#4d8c9e',emissiveIntensity:.12});
 const geometry=new T.PlaneGeometry(width,height,8,18),position=geometry.getAttribute('position');for(let i=0;i<position.count;i++)position.setZ(i,Math.sin(position.getX(i)*8+position.getY(i)*.5)*.045);geometry.computeVertexNormals();
 const sheet=mesh(root,geometry,material,0,-height/2,0);sheet.name='flowing-water-surface';sheet.castShadow=false;
 const foam=new T.InstancedMesh(new T.SphereGeometry(1,8,5),new T.MeshStandardMaterial({color:'#effaf9',roughness:1,transparent:true,opacity:.72,depthWrite:false}),low?8:20);foam.name='waterfall-foam';foam.castShadow=false;root.add(foam);
 const mist=new T.InstancedMesh(new T.SphereGeometry(1,7,4),new T.MeshStandardMaterial({color:'#e7f6f7',roughness:1,transparent:true,opacity:.17,depthWrite:false}),low?5:15);mist.name='waterfall-mist';mist.castShadow=false;root.add(mist);
 const phase=Array.from({length:Math.max(foam.count,mist.count)},()=>r()*Math.PI*2),dummy=new T.Object3D();
 const update=(time:number)=>{
  texture.offset.y=-time*.32;
  for(let i=0;i<foam.count;i++){dummy.position.set(Math.sin(phase[i]+time*.9)*width*.6,-height+.08+Math.sin(time*1.4+phase[i])*.055,.15+Math.cos(phase[i])*.32);dummy.scale.set(.18+Math.sin(phase[i])*.04,.05,.14);dummy.rotation.set(0,0,0);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);}foam.instanceMatrix.needsUpdate=true;
  for(let i=0;i<mist.count;i++){const rise=((time*.22+i/mist.count)%1);dummy.position.set(Math.sin(phase[i]+rise)*width*.8,-height+.3+rise*1.1,.1+Math.cos(phase[i])*.5);dummy.scale.setScalar(.23+rise*.24);dummy.rotation.set(0,0,0);dummy.updateMatrix();mist.setMatrixAt(i,dummy.matrix);}mist.instanceMatrix.needsUpdate=true;
 };
 update(0);return{root,texture,update};
}

/** The five-layer Japan slice is real geometry. It never provides collision
 * surfaces: only the validated level configuration defines playable ground. */
export function mountJapanEnvironment(scene:T.Scene,options:JapanEnvironmentOptions){
 const finish=Math.max(30,Number.isFinite(options.finish)?options.finish:120),low=options.quality==='low',r=random(hash('japan-spring-slice'));let reduced=options.reducedMotion===true;
 const root=new T.Group();root.name='japan-spring-environment';root.userData.environmentId=japanEnvironmentInfo.id;root.userData.license=japanEnvironmentInfo.license;root.userData.decorative=true;root.userData.quality=low?'low':'standard';root.userData.layers=['immediate-foreground','playable-context','near-background','distant-landscape','sky-atmosphere'];scene.add(root);
 const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color(colors.sky);scene.fog=new T.Fog(colors.haze,40,165);
 const staticRoot=new T.Group();staticRoot.name='japan-static-scenery';root.add(staticRoot);
 const far=new T.Group();far.name='japan-distant-landscape';staticRoot.add(far);fuji(far,finish*.43);
 const mountainMaterial=matte('#b0c1c9');for(let i=0;i<(low?8:13);i++){const x=-25+i*(finish+50)/(low?7:12),height=9+r()*8;const hill=mesh(far,new T.ConeGeometry(8+r()*5,height,7),mountainMaterial,x,height/2-8,-58-r()*13);hill.rotation.y=r()*5;hill.castShadow=false;}
 const near=new T.Group();near.name='japan-near-background';staticRoot.add(near);
 const ledges:{x:number;top:number;z:number;width:number}[]=[];
 for(let i=0;i<(low?7:11);i++){
  const x=-10+i*(finish+22)/(low?6:10),top=-2+(i%4)*.9,z=-15-(i%3)*5,width=10+(i%3)*2;
  const ledge=island(near,x,top,width,7.5,'temperate',620+i,9+(i%3)*2);ledge.position.z=z;ledge.name='japan-mossy-background-cliff';
  let pebbles=0;for(const child of [...ledge.children]){if(!(child instanceof T.Mesh)||child.name==='country-platform-cap'||child.name==='country-platform-cliff')continue;if(++pebbles<=(low?3:7))continue;child.geometry.dispose();for(const material of Array.isArray(child.material)?child.material:[child.material])material.dispose();child.removeFromParent();}
  const cap=ledge.getObjectByName('country-platform-cap') as T.Mesh<T.CircleGeometry,T.MeshStandardMaterial>;cap.material.color.set('#7aa15d');
  const cliff=ledge.getObjectByName('country-platform-cliff') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;cliff.material.color.set('#b5b9aa');ledges.push({x,top,z,width});
  for(const side of [-1,1]){const rock=sphere(ledge,matte('#84967b'),side*width*.32,-2.8,3.5,.5,1.5,.14);rock.rotation.z=side*.13;}
  batchStatic(ledge);
 }
 const templeShelf=ledges[Math.min(3,ledges.length-1)];pagoda(near,templeShelf.x,templeShelf.top+.03,templeShelf.z-1.3,.9,5);
 const laterShelf=ledges[Math.max(0,ledges.length-3)];pagoda(near,laterShelf.x+1,laterShelf.top+.03,laterShelf.z-1.5,.58,3);
 const grove=new T.Group();grove.name='japan-cherry-groves';staticRoot.add(grove);
 for(let x=-5,index=0;x<finish+8;x+=low?16:11,index++){
  const y=-.5+(index%3)*.15,z=-7.8-(index%2)*2.4,size=.9+(index%3)*.12;cherryTree(grove,x,y,z,size,200+index,low);
  if(index%3===0){lantern(near,x+2,-.8,-5.1);addJapanTorii(near,x+3,-.8,-7.4,2.6);}
 }
 const crossing=new T.Group();crossing.name='background-wooden-crossing';crossing.userData.collidable=false;crossing.position.set(finish*.33,-.7,-7.1);staticRoot.add(crossing);const wood=matte(colors.wood),rope=matte('#bda479');
 for(let i=0;i<22;i++)box(crossing,(i-10.5)*.32,-Math.sin(i/21*Math.PI)*.28,0,.3,.12,.9,wood);
 for(const side of [-1,1]){const curve=new T.QuadraticBezierCurve3(new T.Vector3(-3.5,.65,side*.53),new T.Vector3(0,-.1,side*.53),new T.Vector3(3.5,.65,side*.53));mesh(crossing,new T.TubeGeometry(curve,20,.026,5,false),rope);for(const x of [-3.5,3.5])beam(crossing,wood,[x,-.1,side*.5],[x,.8,side*.5],.045);}batchStatic(crossing);
 const lake=mesh(staticRoot,new T.PlaneGeometry(finish+100,90),new T.MeshStandardMaterial({color:'#5aaab3',metalness:.14,roughness:.21}),finish/2,-9,-52);lake.rotation.x=-Math.PI/2;lake.name='japan-mountain-lake';lake.receiveShadow=false;
 batchStatic(staticRoot);
 const waterfalls=ledges.filter((_,i)=>i%3===1).map((ledge,i)=>fallingWater(root,ledge.x+ledge.width*.17,ledge.top-.05,ledge.z+3.8,.85+(i%2)*.35,10+(i%2)*2,500+i,low));
 const sky=new T.Group();sky.name='japan-sky-atmosphere';root.add(sky);const cloudMaterial=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,transparent:true,opacity:.67,depthWrite:false});
 const clouds=new T.InstancedMesh(new T.SphereGeometry(1,10,6),cloudMaterial,low?25:55);clouds.name='japan-instanced-clouds';clouds.castShadow=false;const dummy=new T.Object3D();
 for(let i=0;i<clouds.count;i++){dummy.position.set(-30+r()*(finish+60),8+r()*15,-55-r()*45);dummy.scale.set(2+r()*3,.65+r()*.55,1.1+r()*1.2);dummy.rotation.set(0,0,0);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}sky.add(clouds);
 const sun=mesh(sky,new T.CircleGeometry(3.6,32),new T.MeshBasicMaterial({color:'#fff1c1',transparent:true,opacity:.7,toneMapped:false}),-9,29,-105);sun.name='japan-soft-spring-sun';sun.castShadow=false;
 const foreground=new T.Group();foreground.name='japan-low-foreground';foreground.userData.nonObscuring=true;root.add(foreground);const green=matte('#467345'),flower=matte('#e8a8bc');
 for(let x=-12;x<finish+15;x+=13){for(let i=0;i<(low?3:5);i++){const xx=x+(i-2)*.24,yy=-2.5;beam(foreground,green,[xx,yy,4],[xx+.08,yy+.42,4],.018);sphere(foreground,green,xx,.16+yy,4,.2,.11,.12);sphere(foreground,flower,xx+.08,yy+.46,4,.07,.04,.05);}}batchStatic(foreground);
 const petals=new T.InstancedMesh(blossomGeometry(),new T.MeshStandardMaterial({color:'#f5b9d1',roughness:1,side:T.DoubleSide}),low?28:88);petals.visible=!reduced;petals.name='japan-floating-petals';petals.castShadow=false;root.add(petals);
 const petalSeeds=Array.from({length:petals.count},()=>({x:r()*(finish+12)-6,y:2+r()*5,z:-4.6-r()*7,phase:r()*Math.PI*2,speed:.25+r()*.3}));
 let disposed=false;
 const update=(time:number,_dt:number)=>{
  if(disposed)return;const motion=reduced?0:time;
  for(const waterfall of waterfalls)waterfall.update(motion);
  for(let i=0;i<petals.count;i++){const seed=petalSeeds[i];dummy.position.set(seed.x+Math.sin(motion*.3+seed.phase)*.55,1.3+((seed.y-motion*seed.speed)%6+6)%6,seed.z+Math.cos(motion*.25+seed.phase)*.3);dummy.rotation.set(Math.sin(motion+seed.phase)*.8,Math.cos(motion*.6+seed.phase)*.7,seed.phase+motion*.4);dummy.scale.setScalar(.8+(i%4)*.17);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);}if(petals.count)petals.instanceMatrix.needsUpdate=true;
  root.userData.animationTime=motion;
 };
 root.userData.petalCount=reduced?0:petals.count;root.userData.waterfallCount=waterfalls.length;root.userData.platformCount=options.platforms.length;update(0,0);
 return{root,update,setReducedMotion(value:boolean){reduced=value;petals.visible=!value;root.userData.petalCount=value?0:petals.count;},dispose(){
  if(disposed)return;disposed=true;const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>(),instances=new Set<T.InstancedMesh>();
  root.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Line){if(object instanceof T.InstancedMesh)instances.add(object);geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);}}});
  instances.forEach(instance=>instance.dispose());textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());root.removeFromParent();scene.background=oldBackground;scene.fog=oldFog;
 }};
}
