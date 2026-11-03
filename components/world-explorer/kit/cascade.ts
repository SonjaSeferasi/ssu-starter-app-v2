import * as T from 'three';
import {random} from './common';
import {createJapanMistTexture,createJapanWaterNoiseTexture} from '../japan-water';

/** Waterfalls with a clear source and destination: a feeder river runs to the
 * lip, a curved ribbon of streaked water falls (optionally breaking up into
 * spray part-way, as a very tall fall does), and foam, mist and ripples rise
 * where it lands. One shader-driven draw each for ribbons, feeders, mist,
 * foam and ripples, however many falls a level has. Decorative only. */
export type CascadeSite={x:number;top:number;bottom:number;z:number;width:number;channel?:number;channelDirection?:-1|1;spray?:number;lean?:number;intensity?:number};

const ribbonVertex=`
attribute float intensity;varying vec2 vUv;varying float vIntensity;
#include <fog_pars_vertex>
void main(){vUv=uv;vIntensity=intensity;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const ribbonFragment=`
uniform float time;uniform sampler2D noiseMap;uniform float spray;uniform vec3 tint;varying vec2 vUv;varying float vIntensity;
#include <fog_pars_fragment>
void main(){
 float slow=texture2D(noiseMap,vec2(vUv.x*1.7,vUv.y*2.2-time*.55)).r,fast=texture2D(noiseMap,vec2(vUv.x*5.3+.3,vUv.y*.9-time*1.45)).g;
 float edge=smoothstep(0.,.16,vUv.x)*smoothstep(1.,.84,vUv.x);
 float breakup=smoothstep(spray,1.,vUv.y);
 float body=edge*(.42+.5*fast+.18*slow)*(1.-breakup*.86)*vIntensity;
 float lip=1.-smoothstep(0.,.05,vUv.y);
 vec3 color=mix(tint,vec3(1.),clamp(fast*.55+slow*.25+lip*.4+breakup*.5,0.,1.));
 gl_FragColor=vec4(color,clamp(body+lip*.25*edge,0.,.95));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

export function createCascade(parent:T.Object3D,options:{sites:CascadeSite[];low:boolean;tint?:string;name?:string}){
 const {sites,low}=options,root=new T.Group();root.name=options.name||'animated-waterfall';root.userData={decorative:true,animated:true,waterfallCount:sites.length};parent.add(root);
 const time={value:0},noise=createJapanWaterNoiseTexture(),mistTexture=createJapanMistTexture();
 const positions:number[]=[],uv:number[]=[],strength:number[]=[],indices:number[]=[],feeder:number[]=[],feederUv:number[]=[],feederIndex:number[]=[];
 const cols=low?6:10,rows=low?18:40;
 sites.forEach((site,index)=>{
  const start=positions.length/3,height=site.top-site.bottom,seed=index*2.37+.4,lean=site.lean??.5;
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
   const t=row/rows,u=col/cols,widen=(site.spray??1)<1?t*.6:0,scallop=1+.08*Math.sin(t*17+seed)+.03*Math.sin(t*41-seed),span=site.width*(.9+t*.25+widen*.2)*scallop;
   // The sheet leaves the lip with some forward speed, then falls nearly vertically.
   positions.push(site.x+(u-.5)*span+Math.sin(t*7+seed)*site.width*.04*t,site.top-height*t,site.z+lean*Math.sqrt(t)*Math.min(3,height*.04)+Math.sin(t*Math.PI)*.15);
   uv.push(u,t);strength.push(site.intensity??1);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=start+row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
  // Feeder river on the plateau, ending exactly at the lip.
  const f=feeder.length/3,length=site.channel??6,dir=site.channelDirection??-1;
  for(let row=0;row<=8;row++)for(let col=0;col<=4;col++){const t=row/8,u=col/4,span=site.width*(.85+.3*Math.sin(t*Math.PI));feeder.push(site.x+(u-.5)*span+.25*Math.sin(t*4+seed)*Math.sin(t*Math.PI),site.top+.03,site.z+dir*length*t);feederUv.push(u,t);}
  for(let row=0;row<8;row++)for(let col=0;col<4;col++){const a=f+row*5+col,b=a+5;feederIndex.push(a,a+1,b,a+1,b+1,b);}
 });
 const ribbonGeometry=new T.BufferGeometry();ribbonGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));ribbonGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ribbonGeometry.setAttribute('intensity',new T.Float32BufferAttribute(strength,1));ribbonGeometry.setIndex(indices);ribbonGeometry.computeVertexNormals();
 const spray=Math.min(...sites.map(site=>site.spray??1));
 const ribbonMaterial=new T.ShaderMaterial({uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),time,noiseMap:{value:noise},spray:{value:spray},tint:{value:new T.Color(options.tint||'#bfe3ea')}},vertexShader:ribbonVertex,fragmentShader:ribbonFragment,transparent:true,depthWrite:false,side:T.DoubleSide,fog:true});
 const ribbons=new T.Mesh(ribbonGeometry,ribbonMaterial);ribbons.name='falling-water';ribbons.castShadow=ribbons.receiveShadow=false;root.add(ribbons);
 const feederGeometry=new T.BufferGeometry();feederGeometry.setAttribute('position',new T.Float32BufferAttribute(feeder,3));feederGeometry.setAttribute('uv',new T.Float32BufferAttribute(feederUv,2));feederGeometry.setIndex(feederIndex);feederGeometry.computeVertexNormals();
 const flowMap=noise.clone();flowMap.wrapS=flowMap.wrapT=T.RepeatWrapping;flowMap.needsUpdate=true;
 const feeders=new T.Mesh(feederGeometry,new T.MeshStandardMaterial({color:options.tint||'#9fd0d8',map:flowMap,roughness:.12,metalness:.05,transparent:true,opacity:.9}));feeders.name='waterfall-source-river';feeders.receiveShadow=true;root.add(feeders);
 // Foam at the lip and the base, mist billowing up from the impact and along
 // any spray section, and ripples spreading on the pool.
 const mistEach=low?8:22,foamEach=low?6:14,ringEach=low?2:3;
 const sprite=(color:string,opacity:number,count:number,name:string)=>{const m=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:mistTexture,color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,fog:true}),count);m.name=name;m.castShadow=m.receiveShadow=false;m.frustumCulled=false;root.add(m);return m;};
 const mist=sprite('#eef8fa',.22,sites.length*mistEach,'waterfall-mist'),foam=sprite('#f6fcfc',.75,sites.length*foamEach,'waterfall-foam');
 const ringGeometry=new T.RingGeometry(.9,1,low?28:44);ringGeometry.rotateX(-Math.PI/2);
 const ripples=new T.InstancedMesh(ringGeometry,new T.MeshBasicMaterial({color:'#cfeef2',transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide,fog:true}),sites.length*ringEach);ripples.name='waterfall-impact-ripples';ripples.frustumCulled=false;root.add(ripples);
 const r=random(9071),phases=Array.from({length:sites.length*Math.max(mistEach,foamEach)},()=>r()*Math.PI*2),dummy=new T.Object3D();
 const update=(elapsed:number)=>{
  time.value=elapsed;flowMap.offset.y=-elapsed*.35;
  sites.forEach((site,s)=>{
   const height=site.top-site.bottom,sprayFrom=site.top-height*(site.spray??1),baseZ=site.z+(site.lean??.5)*Math.min(3,height*.04);
   for(let i=0;i<foamEach;i++){const n=s*foamEach+i,p=phases[n],lip=i<foamEach/3;dummy.position.set(site.x+Math.sin(p+elapsed*.7)*site.width*(lip?.42:.8),lip?site.top+.05:site.bottom+.06+Math.sin(elapsed+p)*.03,(lip?site.z+.05:baseZ)+Math.cos(p)*.4);dummy.rotation.set(-Math.PI/2,0,p);dummy.scale.set((lip?.4:site.width*.35)+Math.sin(p)*.12,lip?.3:site.width*.25,1);dummy.updateMatrix();foam.setMatrixAt(n,dummy.matrix);}
   for(let i=0;i<mistEach;i++){
    const n=s*mistEach+i,p=phases[n],rise=(elapsed*.12+i/mistEach)%1,inSpray=site.spray!==undefined&&i%3===0;
    const y=inSpray?sprayFrom-(sprayFrom-site.bottom)*((i/mistEach+elapsed*.05)%1):site.bottom+rise*Math.min(8,height*.18);
    dummy.position.set(site.x+Math.sin(p+rise*2)*site.width*1.1,y,baseZ+.5+Math.cos(p)*.8);dummy.rotation.set(0,0,p+elapsed*.03);const size=site.width*(1.2+rise*1.6)*(inSpray?1.4:1);dummy.scale.set(size,size*.8,1);dummy.updateMatrix();mist.setMatrixAt(n,dummy.matrix);
   }
   for(let i=0;i<ringEach;i++){const n=s*ringEach+i,age=(elapsed*.2+i/ringEach)%1;dummy.position.set(site.x,site.bottom+.02,baseZ);dummy.rotation.set(0,.2,0);dummy.scale.set(site.width*(.4+age*1.4),1,.7+age*1.5);dummy.updateMatrix();ripples.setMatrixAt(n,dummy.matrix);}
  });
  foam.instanceMatrix.needsUpdate=mist.instanceMatrix.needsUpdate=ripples.instanceMatrix.needsUpdate=true;
 };
 update(0);return{root,update};
}
