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

/** Small layered fern/ivy fans: actual leaf triangles and cupped ridges give
 * cliff greenery a broken silhouette instead of opaque green spheres. */
function leafyPatchGeometry(low:boolean){
 const positions:number[]=[],colors:number[]=[],steps=low?4:7;
 const triangle=(a:T.Vector3,b:T.Vector3,c:T.Vector3,shade:number)=>{positions.push(...a.toArray(),...b.toArray(),...c.toArray());for(let i=0;i<3;i++)colors.push(shade,shade,shade);};
 for(const angle of [-.52,0,.52]){
  const point=(t:number)=>new T.Vector3(Math.sin(angle)*t*1.2,.45-Math.cos(angle)*t*1.6,Math.sin(t*Math.PI)*.065),across=new T.Vector3(Math.cos(angle),Math.sin(angle),0);
  for(let i=0;i<steps;i++){
   const t=(i+.15)/steps,a=point(t),b=point(Math.min(1,t+.12)),stem=.009;
   triangle(a.clone().addScaledVector(across,-stem),a.clone().addScaledVector(across,stem),b,.66);
   for(const side of [-1,1]){
    const width=.22*(1-t)+.065,tip=a.clone().addScaledVector(across,width*side).add(new T.Vector3(0,-.075,.035)),crease=a.clone().lerp(tip,.55).add(new T.Vector3(0,0,.075));
    triangle(a,tip,crease,.88);triangle(tip,b,crease,1);
   }
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
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
 const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#75b8f5');scene.fog=new T.Fog('#b5d7e5',58,220);
 const atmosphere=createJapanSky(root);
 const staticRoot=new T.Group();staticRoot.name='japan-static-scenery';root.add(staticRoot);
 const far=new T.Group();far.name='japan-distant-landscape';staticRoot.add(far);const vista=createFujiVista(far);addJapanRidges(far,finish,low);
 const near=new T.Group();near.name='japan-near-background';staticRoot.add(near);
 const grove=new T.Group();grove.name='japan-cherry-groves';staticRoot.add(grove);
 const first=options.platforms[0]||{x:0,y:0,width:14,motion:null};
 // Deliberately composed, overlapping valley shoulders replace the repeated
 // procession of equal-height cylinders. Their tops support every grove.
 const cliffSites=[
  {id:'starting-forest-bank',x:first.x+3,y:first.y,z:-5.5,width:16,depth:9,thickness:8},
  {id:'left-woodland-shoulder',x:-8,y:-.5,z:-15,width:20,depth:13,thickness:29},
  {id:'upper-centre-forest',x:6.5,y:4.5,z:-54,width:15,depth:12,thickness:34},
  {id:'central-waterfall-massif',x:15.5,y:2.8,z:-36,width:19,depth:12,thickness:32},
  {id:'main-pagoda-terrace',x:37.5,y:1,z:-21,width:15,depth:14,thickness:31},
  {id:'right-forested-escarpment',x:48,y:6.4,z:-43,width:22,depth:17,thickness:40},
  {id:'later-valley-bank',x:65,y:-1.3,z:-20,width:18,depth:12,thickness:28},
  {id:'distant-shrine-terrace',x:82,y:5.3,z:-51,width:17,depth:13,thickness:36},
  {id:'finish-woodland-bank',x:Math.max(92,finish-7),y:-1.8,z:-25,width:22,depth:15,thickness:32},
 ].filter(site=>site.x<finish+24);
 const woodland:{x:number;y:number;z:number;height:number}[]=[],facePatches:{point:T.Vector3;normal:T.Vector3;sx:number;sy:number;angle:number}[]=[];
 for(let i=0;i<cliffSites.length;i++){
  const site=cliffSites[i],cliff=createJapanScenicCliff(near,{...site,seed:670+i,quality:options.quality});cliff.name='japan-mossy-background-cliff';cliff.userData.compositionSite=site.id;
  const face=cliff.getObjectByName('country-platform-cliff') as T.Mesh;cliff.updateMatrixWorld(true);const normalMatrix=new T.Matrix3().getNormalMatrix(face.matrixWorld),patchRandom=random(9200+i),patchCount=Math.min(low?28:62,Math.ceil(site.width*site.thickness*(low?.033:.071)));
  for(let patch=0;patch<patchCount;patch++){
   const x=site.x+(patchRandom()-.5)*site.width*.8,y=site.y-.25-patchRandom()*site.thickness*.64,ray=new T.Raycaster(new T.Vector3(x,y,site.z+site.depth+3),new T.Vector3(0,0,-1)),hit=ray.intersectObject(face,false)[0];
   if(!hit||!hit.face)continue;const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize(),point=hit.point.clone().addScaledVector(normal,.055);facePatches.push({point,normal,sx:1.25+patchRandom()*.65,sy:patch%5===0?2.6:1.1+patchRandom()*.55,angle:(patchRandom()-.5)*.9});
  }
  const count=low?3:6;
  for(let j=0;j<count;j++){
   const angle=j/count*Math.PI*2+.37,xx=site.x+Math.cos(angle)*site.width*.3,zz=site.z+Math.sin(angle)*site.depth*.26;
   // Keep the central water channels and the temple courtyard readable.
   if(site.id==='main-pagoda-terrace'&&Math.abs(xx-37.5)<5&&zz>-24)continue;
   if(site.id==='central-waterfall-massif'&&zz>-38&&Math.abs(xx-15.5)<5)continue;
   woodland.push({x:xx,y:site.y+.025,z:zz,height:1.3+(j%3)*.45});
  }
 }
 const crownCount=low?3:5,canopyGeometry=leafyPatchGeometry(low),canopies=new T.InstancedMesh(canopyGeometry,new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,roughness:.92}),woodland.length*crownCount),trunks=new T.InstancedMesh(new T.CylinderGeometry(.045,.09,1,6),matte('#73563e'),woodland.length),woodDummy=new T.Object3D();
 canopies.name='terrace-anchored-woodland-crowns';trunks.name='terrace-anchored-woodland-trunks';canopies.castShadow=false;trunks.castShadow=false;
 woodland.forEach((tree,i)=>{
  woodDummy.position.set(tree.x,tree.y+tree.height*.5,tree.z);woodDummy.scale.set(1,tree.height,1);woodDummy.rotation.set(0,0,0);woodDummy.updateMatrix();trunks.setMatrixAt(i,woodDummy.matrix);
  for(let crown=0;crown<crownCount;crown++){woodDummy.position.set(tree.x+Math.sin(i*2.4+crown)*.25,tree.y+tree.height*(.68+crown*.13),tree.z+Math.cos(i*2.4+crown)*.2);woodDummy.scale.set(tree.height*(.58-crown*.05),tree.height*.47,tree.height*.47);woodDummy.rotation.set((crown%2?1:-1)*.28,i*.7+crown*1.2,(r()-.5)*.4);woodDummy.updateMatrix();canopies.setMatrixAt(i*crownCount+crown,woodDummy.matrix);canopies.setColorAt(i*crownCount+crown,new T.Color(crown%2?'#5e9c3a':'#7fb553').multiplyScalar(.9+r()*.12));}
 });near.add(canopies,trunks);
 const cliffGreens=new T.InstancedMesh(leafyPatchGeometry(low),new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,roughness:.96}),facePatches.length),patchDummy=new T.Object3D(),front=new T.Vector3(0,0,1);cliffGreens.name='surface-anchored-cliff-ivy-and-fern-patches';cliffGreens.castShadow=false;
 facePatches.forEach((patch,i)=>{patchDummy.position.copy(patch.point);patchDummy.quaternion.setFromUnitVectors(front,patch.normal);patchDummy.rotateZ(patch.angle);patchDummy.scale.set(patch.sx,patch.sy,1);patchDummy.updateMatrix();cliffGreens.setMatrixAt(i,patchDummy.matrix);cliffGreens.setColorAt(i,new T.Color(i%3?'#5d9838':'#3f7f30').multiplyScalar(.9+(i%4)*.06));});cliffGreens.userData.anchoredBy='raycast on visible granite face';cliffGreens.userData.patchCount=facePatches.length;near.add(cliffGreens);
 // The main red pagoda is the large RIGHT-hand landmark in the first frame.
 // Its front facade is around z=-14; the deeper origin keeps its complete
 // stone podium supported on the terrace instead of hanging over the void.
 const mainTemple=createJapanPagoda({tiers:5,low});mainTemple.position.set(37.5,1.02,-17);mainTemple.scale.setScalar(1.4);mainTemple.userData.compositionRole='dominant-right-pagoda';near.add(mainTemple);
 const smallTemple=createJapanPagoda({tiers:3,low:true});smallTemple.position.set(82,5.33,-52);smallTemple.scale.setScalar(.65);near.add(smallTemple);
 for(const [x,y,z,width] of [[5,4.54,-55,3.3],[47,6.44,-45,3.5]] as const){const house=createJapanHouse({width,low:true});house.position.set(x,y,z);house.scale.setScalar(.82);near.add(house);}
 // Pink groves are attached to real terrace caps, not scattered at one height
 // through empty space. The two mature left trees attach to the start island.
 const treeSites=[
  {x:first.x+1.3,y:first.y+.025,z:-3,size:3.3,seed:918,anchor:'starting-forest-bank',detail:low},
  {x:first.x+6.5,y:first.y+.025,z:-3.2,size:2.35,seed:921,anchor:'starting-forest-bank',detail:low},
  {x:-10.5,y:-.47,z:-15.6,size:1.75,seed:300,anchor:'left-woodland-shoulder',detail:true},
  {x:32.9,y:1.035,z:-21.7,size:1.65,seed:302,anchor:'main-pagoda-terrace',detail:true},
  {x:42.6,y:1.035,z:-20.4,size:1.5,seed:305,anchor:'main-pagoda-terrace',detail:true},
  {x:78.2,y:5.335,z:-51.4,size:1.1,seed:310,anchor:'distant-shrine-terrace',detail:true},
 ];
 for(const site of treeSites){const tree=createCherryGroveTree(grove,site.x,site.y,site.z,site.size,site.seed,site.detail);tree.userData.anchoredTo=site.anchor;}
 const startGate=createJapanTorii({width:4,low});startGate.position.set(first.x+2,first.y,-1.8);startGate.scale.setScalar(1.3);startGate.userData.compositionRole='left-starting-torii';near.add(startGate);
 const startLantern=createJapanLantern({low});startLantern.position.set(first.x+4.7,first.y+.025,-1.6);near.add(startLantern);
 for(const x of [33,42.3]){const lamp=createJapanLantern({low});lamp.position.set(x,1.03,-15.3);near.add(lamp);}
 // A small, clearly distant crossing connects the upper forest and waterfall
 // terraces. The playable LOWER suspension bridge is owned by the level data.
 const crossing=new T.Group();crossing.name='background-wooden-crossing';crossing.userData.collidable=false;staticRoot.add(crossing);
 const start=new T.Vector3(9,4.15,-49),end=new T.Vector3(13.5,2.9,-41.4),forward=end.clone().sub(start).normalize(),side=new T.Vector3().crossVectors(new T.Vector3(0,1,0),forward).normalize(),wood=matte(colors.wood),rope=matte('#bda479'),parts=24,length=start.distanceTo(end)/parts;
 for(let i=0;i<parts;i++){const t=(i+.5)/parts,point=start.clone().lerp(end,t);point.y-=Math.sin(t*Math.PI)*.48;const plank=box(crossing,point.x,point.y,point.z,.86,.11,length*.96,wood);plank.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),forward);}
 for(const direction of [-1,1]){const a=start.clone().addScaledVector(side,direction*.48),b=end.clone().addScaledVector(side,direction*.48),middle=a.clone().lerp(b,.5);a.y+=.7;b.y+=.7;middle.y+=.12;mesh(crossing,new T.TubeGeometry(new T.CatmullRomCurve3([a,middle,b]),24,.023,5,false),rope);for(const point of [a,b])beam(crossing,wood,[point.x,point.y-.8,point.z],[point.x,point.y+.12,point.z],.04);}batchStatic(crossing);
 const lake=mesh(staticRoot,new T.PlaneGeometry(finish+160,150),new T.MeshStandardMaterial({color:'#298ca7',metalness:.2,roughness:.24}),finish/2,-23,-65);lake.rotation.x=-Math.PI/2;lake.name='japan-mountain-lake';lake.receiveShadow=false;
 const channelMaterial=new T.MeshStandardMaterial({color:'#78c2ca',roughness:.22,metalness:.13});
 for(const [x,width] of [[12.6,2.3],[18.9,2.8]]){const channel=mesh(near,new T.PlaneGeometry(width,10.4),channelMaterial,x,2.835,-35);channel.rotation.x=-Math.PI/2;channel.name='waterfall-feeding-river-channel';}
 batchStatic(near);batchStatic(grove);
 const waterfallSites=[
  {x:12.6,top:2.8,z:-29.8,width:2.4},
  {x:18.9,top:2.8,z:-29.8,width:3.0},
  {x:35.5,top:1,z:-13.8,width:2.4},
  {x:43.7,top:6.4,z:-34.3,width:1.9},
  {x:80.5,top:5.3,z:-44.3,width:1.5},
 ];
 const waterfalls=waterfallSites.map((site,i)=>fallingWater(root,site.x,site.top-.03,site.z,site.width,site.top+23,500+i,low));
 const sky=addJapanCloudBanks(root,finish,low),dummy=new T.Object3D();
 // Foreground rock lips sit below the walkable course at the frame corners;
 // their vegetation is planted on those rocks, never floating in the void.
 const foreground=new T.Group();foreground.name='japan-low-foreground';foreground.userData.nonObscuring=true;root.add(foreground);
 for(const [x,y,z,width,depth] of [[-4,-4.6,4.5,8,5],[45,-6.5,4,8,5]] as const){const bank=createJapanScenicCliff(foreground,{x,y,z,width,depth,thickness:10,seed:Math.floor(x)+3000,quality:'low'});bank.userData.compositionRole='safe-foreground-corner';}
 batchStatic(foreground);
 root.userData.composition={startingTorii:[first.x+2,first.y,-1.8],mainPagoda:[37.5,1.02,-17],centralWaterfalls:[12.6,18.9],cliffCount:cliffSites.length,anchoredTrees:treeSites.length,cliffGreenPatches:facePatches.length};
 const petals=new T.InstancedMesh(blossomGeometry(),new T.MeshStandardMaterial({color:'#f5b9d1',roughness:1,side:T.DoubleSide}),low?28:88);petals.visible=!reduced;petals.name='japan-floating-petals';petals.castShadow=false;root.add(petals);
 const petalSeeds=Array.from({length:petals.count},(_,i)=>({x:r()*(finish+12)-6,y:2+r()*5,z:i%5===0?1.3+r()*1.2:-4.6-r()*7,phase:r()*Math.PI*2,speed:.25+r()*.3}));
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
