import * as T from 'three';
import {batchStatic,matte,mesh,random,strut} from './scenic-kit';

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
 const root=new T.Group();root.name='mount-fuji';root.position.set(15,-10,-100);root.scale.y=.82;
 root.userData.landmark='Mount Fuji';root.userData.source='https://whc.unesco.org/en/list/1418/';parent.add(root);
 const segments=128,rings=48,positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const blue=new T.Color('#5275ad'),deep=new T.Color('#354f81'),snow=new T.Color('#f2f6ff');
 for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
  const t=row/rings,a=i/segments*Math.PI*2;
  const folds=Math.sin(a*19+t*2)*.52+Math.sin(a*37-t*3)*.24+Math.sin(a*67+t*6)*.12;
  const radius=2.15+48*Math.pow(1-t,1.1)+folds*Math.sin(t*Math.PI)*2.1;
  positions.push(Math.sin(a)*radius,t*46+Math.sin(a*5)*Math.pow(t,9)*.5,Math.cos(a)*radius*.57);
  const snowEdge=.66+Math.sin(a*19)*.06+Math.sin(a*37)*.035;
  const streak=Math.max(0,Math.sin(a*19+t*2)*.75+Math.sin(a*37-t*3)*.23);
  const cover=T.MathUtils.smoothstep(t,snowEdge-streak*.16,snowEdge+.025);
  const color=deep.clone().lerp(blue,.45+folds*.28).lerp(snow,cover);
  color.multiplyScalar(.77+Math.sin(a+1.1)*.17+Math.max(0,folds)*.13);
  colors.push(color.r,color.g,color.b);
 }
 for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){
  const a=row*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mountain=mesh(root,geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));mountain.name='fuji-snow-streaked-volcanic-slope';mountain.castShadow=false;
 const crater=mesh(root,new T.CircleGeometry(2.1,48),matte('#b0bfda'),0,46.04,0);crater.rotation.x=-Math.PI/2;crater.scale.y=.57;crater.castShadow=false;
 return{root,follow(cameraX:number){root.position.x=15+(cameraX-16.4)*.78;}};
}

/** Layered rounded foothill ridgelines. Their varied crest shapes leave Fuji's
 * summit unobscured; warm near foliage and cool far rock establish depth. */
export function addJapanRidges(parent:T.Object3D,finish:number,low:boolean){
 const root=new T.Group();root.name='japan-forested-valley';root.userData.terrainProfile='sculpted-rounded-forested-massifs';parent.add(root);const r=random(68231);
 const placements=[{x:-24,z:-76,width:54,depth:36,height:24},{x:65,z:-81,width:72,depth:42,height:27},{x:Math.max(98,finish*.88),z:-101,width:68,depth:45,height:29}];
 const samples:{x:number;y:number;z:number;height:number}[]=[],segments=low?28:44,rings=low?8:13;
 const rock=new T.Color('#78918d'),green=new T.Color('#40735f'),light=new T.Color('#759e72');
 for(let mass=0;mass<placements.length;mass++){
  const p=placements[mass],positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const surface=(angle:number,t:number)=>{
   const edge=1+Math.sin(angle*3+mass)*.13+Math.sin(angle*7+mass)*.055;
   const ridge=Math.sin(angle*4+t*5+mass)*1.5+Math.cos(angle*9-t*3)*.6;
   return new T.Vector3(p.x+Math.cos(angle)*p.width*.5*t*edge,-19+p.height*Math.pow(Math.max(0,1-t*t),1.25)+ridge*Math.sin(t*Math.PI),p.z+Math.sin(angle)*p.depth*.5*t*edge);
  };
  for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
   const t=row/rings,a=i/segments*Math.PI*2,point=surface(a,t);positions.push(point.x,point.y,point.z);
   const color=rock.clone().lerp(green,Math.max(0,1-t)*.72).lerp(light,Math.max(0,Math.sin(a*3+mass))*.17).multiplyScalar(.78+.14*Math.cos(a+.8));colors.push(color.r,color.g,color.b);
  }
  for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,b,c,b,c+1,c);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const hill=mesh(root,geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));hill.castShadow=false;hill.name='rounded-forested-mountain-mass';
  for(let i=0;i<(low?18:40);i++){const point=surface(r()*Math.PI*2,.18+r()*.66);samples.push({x:point.x,y:point.y,z:point.z,height:1+r()*1.6});}
 }
 // Three-dimensional crowns grow from the sampled mountain surface. There
 // are no flat green wall strips and no floating rows of cone primitives.
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.045,.065,1,5),matte('#685342'),samples.length),crowns=new T.InstancedMesh(new T.SphereGeometry(1,low?6:7,low?3:4),matte('#52785b'),samples.length*3),dummy=new T.Object3D();trunks.name='surface-anchored-ridge-trunks';crowns.name='surface-anchored-ridge-canopies';trunks.castShadow=crowns.castShadow=false;
 samples.forEach((sample,i)=>{
  dummy.position.set(sample.x,sample.y+sample.height*.5,sample.z);dummy.rotation.set(0,0,.035*Math.sin(i));dummy.scale.set(1,sample.height,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(let tier=0;tier<3;tier++){const size=.5-tier*.09;dummy.position.set(sample.x+Math.sin(i*2.4+tier)*.18,sample.y+sample.height*(.58+tier*.2),sample.z+Math.cos(i*2.4+tier)*.16);dummy.rotation.set(0,i*.4,0);dummy.scale.set(sample.height*size,sample.height*.24,sample.height*size*.8);dummy.updateMatrix();crowns.setMatrixAt(i*3+tier,dummy.matrix);crowns.setColorAt(i*3+tier,new T.Color(tier%2?'#3e6c54':'#5c8663').multiplyScalar(.8+r()*.25));}
 });root.add(trunks,crowns);batchStatic(root);return root;
}

/** Billowing groups of round puffs, with a broken silhouette instead of flat
 * flying-saucer ellipses. One instanced draw serves the entire cloud layer. */
export function addJapanCloudBanks(parent:T.Object3D,finish:number,low:boolean){
 const root=new T.Group();root.name='japan-sky-atmosphere';parent.add(root);
 const r=random(9281),groups=low?13:24,puffs=low?5:8;
 const puffGeometry=new T.SphereGeometry(1,low?8:10,low?5:7),position=puffGeometry.getAttribute('position'),colors:number[]=[];
 const shade=new T.Color('#c5d9ee'),light=new T.Color('#ffffff');for(let i=0;i<position.count;i++){const color=shade.clone().lerp(light,T.MathUtils.smoothstep(position.getY(i),-.8,.5));colors.push(color.r,color.g,color.b);}
 puffGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const clouds=new T.InstancedMesh(puffGeometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9,depthWrite:false}),groups*puffs);
 clouds.name='japan-instanced-clouds';clouds.castShadow=false;clouds.receiveShadow=false;const dummy=new T.Object3D();
 for(let i=0;i<groups;i++){
  const x=-45+r()*(finish+95),y=i%3===0?-7+r()*4:17+r()*19,z=-68-r()*36,scale=1.2+r()*1.2;
  for(let j=0;j<puffs;j++){
   dummy.position.set(x+(j-puffs/2)*scale*1.2,y+Math.sin(j/(puffs-1)*Math.PI)*scale*.7,z+(r()-.5)*3);
   dummy.rotation.set(0,r()*2,0);dummy.scale.set(scale*(.8+r()*.6),scale*(.55+r()*.45),scale*.8);dummy.updateMatrix();clouds.setMatrixAt(i*puffs+j,dummy.matrix);
  }
 }root.add(clouds);return root;
}
