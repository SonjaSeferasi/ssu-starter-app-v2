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
 const root=new T.Group();root.name='mount-fuji';root.position.set(22,-10,-105);
 root.userData.landmark='Mount Fuji';root.userData.source='https://whc.unesco.org/en/list/1418/';parent.add(root);
 const segments=128,rings=48,positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const blue=new T.Color('#5275ad'),deep=new T.Color('#354f81'),snow=new T.Color('#f2f6ff');
 for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
  const t=row/rings,a=i/segments*Math.PI*2;
  const folds=Math.sin(a*19+t*2)*.52+Math.sin(a*37-t*3)*.24+Math.sin(a*67+t*6)*.12;
  const radius=2.15+48*Math.pow(1-t,1.1)+folds*Math.sin(t*Math.PI)*2.1;
  positions.push(Math.sin(a)*radius,t*46+Math.sin(a*5)*Math.pow(t,9)*.5,Math.cos(a)*radius*.57);
  const snowEdge=.56+Math.sin(a*19)*.07+Math.sin(a*37)*.04;
  const streak=Math.max(0,Math.sin(a*19+t*2)*.75+Math.sin(a*37-t*3)*.23);
  const cover=T.MathUtils.smoothstep(t,snowEdge-streak*.12,snowEdge+.025);
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
 return{root,follow(cameraX:number){root.position.x=6+cameraX*.78;}};
}

/** Layered rounded foothill ridgelines. Their varied crest shapes leave Fuji's
 * summit unobscured; warm near foliage and cool far rock establish depth. */
export function addJapanRidges(parent:T.Object3D,finish:number,low:boolean){
 const root=new T.Group();root.name='japan-forested-valley';parent.add(root);const r=random(68231);
 for(let layer=0;layer<3;layer++){
  const n=low?55:100,width=finish+150,z=-78+layer*17,positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const color=new T.Color(['#7598ae','#597f88','#3b706a'][layer]);
  for(let i=0;i<=n;i++){
   const x=-65+width*i/n,height=-5.5+Math.sin(i*.37+layer)*2.2+Math.sin(i*.88+1)*1.4+Math.cos(i*.17)*1.7;
   positions.push(x,-20,z+9,x,height,z);
   for(const shade of [.52,.8+r()*.18]){const c=color.clone().multiplyScalar(shade);colors.push(c.r,c.g,c.b);}
   if(i<n){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const ridge=mesh(root,g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));ridge.castShadow=false;
 }
 // Tiered conifers, not the triangular mountain primitives of the graybox.
 const trunk=matte('#685342'),leaves=matte('#356e55');
 for(let i=0;i<(low?30:65);i++){
  const x=-22+r()*(finish+50),z=-22-r()*20,y=-1+r()*2,height=1.6+r()*2.6;
  strut(root,trunk,new T.Vector3(x,y,z),new T.Vector3(x+.07,y+height,z),.065);
  for(let tier=0;tier<3;tier++){const crown=mesh(root,new T.ConeGeometry((height*.27)*(1-tier*.19),height*.56,7),leaves,x,y+height*(.44+tier*.19),z);crown.rotation.y=r()*3;}
 }
 batchStatic(root);return root;
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
