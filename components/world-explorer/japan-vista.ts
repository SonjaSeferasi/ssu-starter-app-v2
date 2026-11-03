import * as T from 'three';
import {batchStatic,matte,mesh,random} from './scenic-kit';

/** A shaded sky volume with a pale horizon and a deeper blue zenith. */
export function createJapanSky(parent:T.Object3D){
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
  uniforms:{zenith:{value:new T.Color('#3887e4')},horizon:{value:new T.Color('#d1e8f7')}},
  vertexShader:'varying vec3 worldPoint; void main(){vec4 p=modelMatrix*vec4(position,1.0);worldPoint=p.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform vec3 zenith;uniform vec3 horizon;varying vec3 worldPoint;
   void main(){vec3 direction=normalize(worldPoint-cameraPosition);float t=smoothstep(-.65,.4,direction.y);
    vec3 color=mix(horizon,zenith,t);float glow=pow(max(0.0,dot(direction,normalize(vec3(-.7,.65,-.8)))),48.0);
    color+=vec3(.19,.12,.035)*glow;gl_FragColor=vec4(color,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const dome=mesh(parent,new T.SphereGeometry(150,24,16),material,0,0,-12);dome.name='japan-gradient-sky-volume';dome.castShadow=false;dome.receiveShadow=false;dome.renderOrder=-100;dome.frustumCulled=false;
 return{follow(cameraX:number){dome.position.x=cameraX;}};
}

/** Sculpted, snow-streaked volcanic silhouette, rather than a cone primitive.
 * The distant massif uses slow parallax so it remains a navigational landmark. */
export function createFujiVista(parent:T.Object3D){
 const root=new T.Group();root.name='mount-fuji';root.position.set(15,-10,-116);root.scale.y=.82;
 root.userData.landmark='Mount Fuji';root.userData.source='https://whc.unesco.org/en/list/1418/';root.userData.atmosphere='cool distant volcanic ridges and wind-scoured snow';parent.add(root);
 const segments=128,rings=48,positions:number[]=[],colors:number[]=[],uv:number[]=[],indices:number[]=[];
 const blue=new T.Color('#8097b5'),deep=new T.Color('#607b9e'),snow=new T.Color('#e6eef6');
 for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
  const t=row/rings,a=i/segments*Math.PI*2;
  const folds=Math.sin(a*19+t*2)*.52+Math.sin(a*37-t*3)*.24+Math.sin(a*67+t*6)*.12;
  const radius=2.15+48*Math.pow(1-t,1.1)+folds*Math.sin(t*Math.PI)*2.1;
  const gullies=Math.sin(a*53+t*8)*.12+Math.sin(a*83-t*13)*.055;
  positions.push(Math.sin(a)*(radius+gullies*Math.sin(t*Math.PI)),t*46+Math.sin(a*5)*Math.pow(t,9)*.5,Math.cos(a)*(radius+gullies)*.57);uv.push(i/segments,t);
  const snowEdge=.66+Math.sin(a*19)*.06+Math.sin(a*37)*.035;
  const streak=Math.max(0,Math.sin(a*19+t*2)*.75+Math.sin(a*37-t*3)*.23);
  const cover=T.MathUtils.smoothstep(t,snowEdge-streak*.16,snowEdge+.025);
  const color=deep.clone().lerp(blue,.45+folds*.28).lerp(snow,cover);
  color.multiplyScalar(.91+Math.sin(a+1.1)*.075+Math.max(0,folds)*.06);
  colors.push(color.r,color.g,color.b);
 }
 for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){
  const a=row*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const size=128,pixels=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size*Math.PI*2,t=y/size,ravine=Math.sin(u*37+t*8)*.45+Math.sin(u*73-t*17)*.2+Math.sin(u*117+t*13)*.13,value=Math.round(126+ravine*67),k=(y*size+x)*4;pixels[k]=pixels[k+1]=pixels[k+2]=value;pixels[k+3]=255;}
 const relief=new T.DataTexture(pixels,size,size,T.RGBAFormat);relief.wrapS=T.RepeatWrapping;relief.needsUpdate=true;
 const mountain=mesh(root,geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,bumpMap:relief,bumpScale:.19}));mountain.name='fuji-snow-streaked-volcanic-slope';mountain.castShadow=false;
 const crater=mesh(root,new T.CircleGeometry(2.1,48),matte('#b0bfda'),0,46.04,0);crater.rotation.x=-Math.PI/2;crater.scale.y=.57;crater.castShadow=false;
 return{root,follow(cameraX:number){root.position.x=15+(cameraX-16.4)*.78;}};
}

/** Overlapping mountains make three real depth bands. Far lavender slopes,
 * blue-green middle ridges and darker wooded shoulders leave an open valley. */
export function addJapanRidges(parent:T.Object3D,finish:number,low:boolean){
 const root=new T.Group();root.name='japan-forested-valley';root.userData.terrainProfile='sculpted-rounded-forested-massifs';root.userData.depthBands=3;parent.add(root);const r=random(68231);
 const placements=[
  {x:-32,z:-150,width:100,depth:41,height:33,base:-29,band:0},
  {x:88,z:-156,width:117,depth:44,height:39,base:-29,band:0},
  {x:Math.max(155,finish+30),z:-151,width:100,depth:40,height:35,base:-30,band:0},
  {x:-31,z:-110,width:65,depth:35,height:29,base:-27,band:1},
  {x:78,z:-119,width:76,depth:40,height:36,base:-28,band:1},
  {x:Math.max(132,finish*.92),z:-113,width:81,depth:43,height:33,base:-28,band:1},
  {x:-23,z:-76,width:51,depth:33,height:29,base:-27,band:2},
  {x:66,z:-83,width:63,depth:37,height:34,base:-28,band:2},
  {x:Math.max(119,finish*.88),z:-83,width:69,depth:39,height:30,base:-28,band:2},
 ];
 const samples:{x:number;y:number;z:number;height:number;band:number}[]=[],segments=low?22:36,rings=low?8:12;
 const shades=[['#8c9bad','#8099a6'],['#698d91','#608b7d'],['#507c6f','#4d805d']];
 for(let mass=0;mass<placements.length;mass++){
  const p=placements[mass],positions:number[]=[],colors:number[]=[],indices:number[]=[],rock=new T.Color(shades[p.band][0]),green=new T.Color(shades[p.band][1]);
  const surface=(angle:number,t:number)=>{
   const edge=1+Math.sin(angle*3+mass)*.13+Math.sin(angle*7+mass)*.055;
   const ridge=Math.sin(angle*4+t*5+mass)*1.5+Math.cos(angle*9-t*3)*.6;
   return new T.Vector3(p.x+Math.cos(angle)*p.width*.5*t*edge,p.base+p.height*Math.pow(Math.max(0,1-t*t),1.25)+ridge*Math.sin(t*Math.PI),p.z+Math.sin(angle)*p.depth*.5*t*edge);
  };
  for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
   const t=row/rings,a=i/segments*Math.PI*2,point=surface(a,t);positions.push(point.x,point.y,point.z);
   const color=rock.clone().lerp(green,.3+Math.max(0,1-t)*.52).multiplyScalar(.89+.07*Math.cos(a+.8)+.035*Math.sin(t*27+a*13));colors.push(color.r,color.g,color.b);
  }
  for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,b,c,b,c+1,c);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const hill=mesh(root,geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));hill.castShadow=false;hill.name='rounded-forested-mountain-mass';hill.userData.depthBand=p.band;
  if(p.band>0)for(let i=0;i<(low?12:30);i++){const point=surface(r()*Math.PI*2,.15+r()*.7);samples.push({x:point.x,y:point.y,z:point.z,height:1+r()*1.5,band:p.band});}
 }
 // A single irregular crown per tree avoids three overlapping sphere meshes.
 const crownGeometry=new T.SphereGeometry(1,7,5),crownPosition=crownGeometry.getAttribute('position');
 for(let i=0;i<crownPosition.count;i++){const x=crownPosition.getX(i),y=crownPosition.getY(i),z=crownPosition.getZ(i),a=Math.atan2(z,x),edge=1+.13*Math.sin(a*3+y*7)+.075*Math.cos(a*5-y*4);crownPosition.setXYZ(i,x*edge,y,z*edge);}crownGeometry.computeVertexNormals();
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.045,.065,1,5),matte('#685b4c'),samples.length),crowns=new T.InstancedMesh(crownGeometry,matte('#68896c'),samples.length),dummy=new T.Object3D();trunks.name='surface-anchored-ridge-trunks';crowns.name='surface-anchored-ridge-canopies';trunks.castShadow=crowns.castShadow=false;
 samples.forEach((sample,i)=>{
  dummy.position.set(sample.x,sample.y+sample.height*.4,sample.z);dummy.rotation.set(0,i*.4,.035*Math.sin(i));dummy.scale.set(1,sample.height*.8,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.set(sample.x,sample.y+sample.height*.85,sample.z);dummy.scale.set(sample.height*.55,sample.height*.63,sample.height*.46);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);crowns.setColorAt(i,new T.Color(sample.band===1?'#72968c':'#528362').multiplyScalar(.89+r()*.19));
 });root.add(trunks,crowns);batchStatic(root);return root;
}

/** A soft organic cloud alpha asset. It describes a local atmospheric puff,
 * never an image of the mountain, architecture or complete backdrop. */
export function createJapanCloudTexture(){
 const width=128,height=64,data=new Uint8Array(width*height*4),r=random(29184);
 const lumps=Array.from({length:9},(_,i)=>({x:-.81+i*.2+(r()-.5)*.1,y:-.06+Math.sin(i/8*Math.PI)*.26+(r()-.5)*.13,sx:.18+r()*.13,sy:.2+r()*.23}));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x+.5)/width*2-1,v=(y+.5)/height*2-1,warp=Math.sin(u*17+Math.sin(v*11))*Math.cos(v*16-u*7)*.05,xx=u+warp,yy=v+Math.sin(u*29+v*14)*.035;
  let density=0;for(const puff of lumps){const d=((xx-puff.x)/puff.sx)**2+((yy-puff.y)/puff.sy)**2;density+=Math.exp(-d*2.2);}
  const noise=Math.sin(u*71+v*43)*Math.cos(u*39-v*61)*.032+Math.sin(u*23+v*19)*.05;
  const alpha=T.MathUtils.smoothstep(density+noise,.13,.79)*T.MathUtils.smoothstep(1-Math.abs(u),0,.09),shade=T.MathUtils.smoothstep(v,-.5,.5),k=(y*width+x)*4;
  data[k]=Math.round(198+shade*55);data[k+1]=Math.round(218+shade*36);data[k+2]=Math.round(235+shade*20);data[k+3]=Math.round(alpha*235);
 }
 const texture=new T.DataTexture(data,width,height,T.RGBAFormat);texture.needsUpdate=true;texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;return texture;
}

/** One instanced draw for translucent, feathered wisps replaces hundreds of
 * rounded opaque balls. Their different world depths retain natural parallax. */
export function addJapanCloudBanks(parent:T.Object3D,finish:number,low:boolean){
 const root=new T.Group();root.name='japan-sky-atmosphere';parent.add(root);
 const r=random(9281),count=low?14:24,texture=createJapanCloudTexture();
 const clouds=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,fog:true}),count);clouds.name='japan-instanced-clouds';clouds.castShadow=clouds.receiveShadow=false;clouds.userData.style='soft organic alpha wisps';const dummy=new T.Object3D();
 for(let i=0;i<count;i++){
  const valley=i%4===0,x=-48+r()*(finish+105),y=valley?-14+r()*5:17+r()*20,z=valley?-52-r()*36:-84-r()*52,width=(valley?18:12)+r()*16;
  dummy.position.set(x,y,z);dummy.rotation.set(0,(r()-.5)*.18,(r()-.5)*.07);dummy.scale.set(width,(valley?.13:.23)*width,1);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);clouds.setColorAt(i,new T.Color(valley?'#c7dee2':'#f5f9ff'));
 }root.add(clouds);return root;
}
