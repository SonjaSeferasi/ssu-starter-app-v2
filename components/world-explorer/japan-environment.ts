import * as T from 'three';
import {batchStatic,hash,matte,mesh,random,sphere,strut} from './scenic-kit';
import {createCherryGroveTree} from './japan-grove';
import {createFujiVista,createJapanSky,addJapanRidges,addJapanCloudBanks} from './japan-vista';
import {createJapanPagoda,createJapanHouse,createJapanTorii,createJapanLantern} from './japan-architecture';
import {createJapanScenicCliff} from './japan-terrain';

export type JapanEnvironmentOptions={
 platforms:readonly {x:number;y:number;width:number;motion:string|null}[];
 finish:number;
 reducedMotion?:boolean;
 quality?:'standard'|'low';
};

export const japanEnvironmentInfo={
 id:'japan-mountain-spring',
 title:'Cherry Blossom Mountain Path',
 license:'Original procedural geometry and textures created for SocialU, with local CC0 rock surface maps by Rob Tuytel / Poly Haven. No external character or landmark models.',
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
 const root=createJapanTorii({width});root.position.set(x,y,z);parent.add(root);
 return root;
}



function blossomGeometry(){
 const shape=new T.Shape();for(let i=0;i<=30;i++){const a=i/30*Math.PI*2,r=.075*(.77+.23*Math.cos(a*5));if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();return new T.ShapeGeometry(shape);
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
 const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#75b8f5');scene.fog=new T.Fog('#b5d7e5',55,215);
 const atmosphere=createJapanSky(root);
 const staticRoot=new T.Group();staticRoot.name='japan-static-scenery';root.add(staticRoot);
 const far=new T.Group();far.name='japan-distant-landscape';staticRoot.add(far);const vista=createFujiVista(far);addJapanRidges(far,finish,low);
 const near=new T.Group();near.name='japan-near-background';staticRoot.add(near);
 const ledges:{x:number;top:number;z:number;width:number}[]=[];
 for(let i=0;i<(low?9:14);i++){
  const x=-14+i*(finish+30)/(low?8:13),top=-3.5+(i%4)*1.45,z=-19-(i%3)*7,width=10+(i%3)*3;
  const ledge=createJapanScenicCliff(near,{x,y:top,z,width,depth:8,thickness:12+(i%3)*3,seed:620+i,quality:options.quality});ledge.name='japan-mossy-background-cliff';ledges.push({x,top,z,width});
  if(i%2===0){const house=createJapanHouse({width:3.5,low});house.position.set(x-1,top+.04,z);near.add(house);}
 }
 // A prominent temple at the first vista, then a second distinct reveal later.
 for(const [x,y,z,size,tiers] of [[22,.8,-16,1.25,5],[68,1,-23,.92,5],[116,.2,-19,1.1,5]] as const){
  createJapanScenicCliff(near,{x,y,z,width:11,depth:8,thickness:16,seed:Math.floor(x)+710,quality:options.quality});
  const temple=createJapanPagoda({tiers,low});temple.position.set(x,y+.02,z);temple.scale.setScalar(size);near.add(temple);
 }
 // Staggered rear terraces make a valley behind the near course rather than
 // a single continuous green horizon. Their waterfalls are intentionally
 // visible between the playable islands, with no decorative collision.
 const rearFalls:{x:number;top:number;z:number;width:number}[]=[];
 for(let i=0;i<(low?6:10);i++){
  const x=-18+i*(finish+40)/(low?5:9),y=1.5+(i%3)*2.4,z=-45-(i%2)*7,width=9+(i%3)*2;
  createJapanScenicCliff(near,{x,y,z,width,depth:9,thickness:25+(i%3)*3,seed:900+i,quality:'low'});
  createCherryGroveTree(near,x-2,y,z,1.25,1900+i,true);
  if(i%3===1){const temple=createJapanPagoda({tiers:3,low:true});temple.position.set(x+1,y,z);temple.scale.setScalar(.65);near.add(temple);}
  rearFalls.push({x:x+width*.28,top:y,z:z+.2,width:0});
 }
 const grove=new T.Group();grove.name='japan-cherry-groves';staticRoot.add(grove);
 for(let x=-7,index=0;x<finish+12;x+=low?13:8,index++){
  const y=-1+(index%3)*.2,z=-7.8-(index%2)*3.4,size=1.2+(index%3)*.28;createCherryGroveTree(grove,x,y,z,size,200+index,low);
  if(index%3===0){const light=createJapanLantern({low});light.position.set(x+2,-.6,-5.1);near.add(light);addJapanTorii(near,x+3,-.8,-7.4,3.1);}
 }
 // The start is framed by a mature tree, placed behind the path, never over it.
 createCherryGroveTree(grove,-4,-.2,-6.6,2.25,918,low);
 addJapanTorii(near,-2,-.3,-4.8,4.1);
 const crossing=new T.Group();crossing.name='background-wooden-crossing';crossing.userData.collidable=false;crossing.position.set(finish*.33,-.7,-7.1);staticRoot.add(crossing);const wood=matte(colors.wood),rope=matte('#bda479');
 for(let i=0;i<22;i++)box(crossing,(i-10.5)*.32,-Math.sin(i/21*Math.PI)*.28,0,.3,.12,.9,wood);
 for(const side of [-1,1]){const curve=new T.QuadraticBezierCurve3(new T.Vector3(-3.5,.65,side*.53),new T.Vector3(0,-.1,side*.53),new T.Vector3(3.5,.65,side*.53));mesh(crossing,new T.TubeGeometry(curve,20,.026,5,false),rope);for(const x of [-3.5,3.5])beam(crossing,wood,[x,-.1,side*.5],[x,.8,side*.5],.045);}batchStatic(crossing);
 const lake=mesh(staticRoot,new T.PlaneGeometry(finish+160,140),new T.MeshStandardMaterial({color:'#298ca7',metalness:.2,roughness:.24}),finish/2,-15,-80);lake.rotation.x=-Math.PI/2;lake.name='japan-mountain-lake';lake.receiveShadow=false;
 batchStatic(near);batchStatic(grove);
 const waterfallSites=[...ledges.filter((_,i)=>i%3===1),...rearFalls.filter((_,i)=>i%2===0),{x:19,top:.8,z:-16,width:0},{x:65,top:1,z:-23,width:0},{x:113,top:.2,z:-19,width:0}];
 const waterfalls=waterfallSites.map((ledge,i)=>fallingWater(root,ledge.x+ledge.width*.17,ledge.top-.05,ledge.z+4.1,1.1+(i%2)*.4,15+(i%2)*3,500+i,low));
 const sky=addJapanCloudBanks(root,finish,low),dummy=new T.Object3D();
 const foreground=new T.Group();foreground.name='japan-low-foreground';foreground.userData.nonObscuring=true;root.add(foreground);
 for(let x=-10,index=0;x<finish+15;x+=low?42:29,index++)createCherryGroveTree(foreground,x,-6.7,3.5,1.1,340+index,low);
 batchStatic(foreground);
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
 return{root,update,frame(cameraX:number){vista.follow(cameraX);atmosphere.follow(cameraX);},setReducedMotion(value:boolean){reduced=value;petals.visible=!value;root.userData.petalCount=value?0:petals.count;},dispose(){
  if(disposed)return;disposed=true;const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>(),instances=new Set<T.InstancedMesh>();
  root.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Line){if(object instanceof T.InstancedMesh)instances.add(object);geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);}}});
  instances.forEach(instance=>instance.dispose());textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());root.removeFromParent();scene.background=oldBackground;scene.fog=oldFog;
 }};
}
