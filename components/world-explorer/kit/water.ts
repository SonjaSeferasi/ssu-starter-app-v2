import * as T from 'three';
import {mesh,pixelTexture,random} from './common';

/** Tileable wave normals from a sum of periodic ripples. */
function waveNormals(size:number,seed:number){
 const r=random(seed),waves=Array.from({length:6},()=>({kx:Math.round(1+r()*5)*(r()<.5?-1:1),ky:Math.round(1+r()*5),phase:r()*6.28,amp:.4+r()*.6}));
 const height=(u:number,v:number)=>waves.reduce((sum,w)=>sum+Math.sin((u*w.kx+v*w.ky)*Math.PI*2+w.phase)*w.amp,0);
 return pixelTexture(size,(u,v)=>{const e=1/size,dx=(height(u+e,v)-height(u-e,v))*.06,dy=(height(u,v+e)-height(u,v-e))*.06,n=new T.Vector3(-dx*size*.08,-dy*size*.08,1).normalize();return[(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255];},false);
}

export type WaterOptions={x:number;y:number;z:number;width:number;depth:number;shallow:string;deep:string;opacity?:number;roughness?:number;flow?:[number,number];repeat?:number;segments?:number;seed?:number;name?:string;edge?:'near'|'none'};
/** A flat animated water sheet. Colour runs from a shallow tint at the front
 * edge to deep water behind; the normal map scrolls to animate small waves. */
export function createWaterSurface(parent:T.Object3D,options:WaterOptions){
 const segments=options.segments??24,geometry=new T.PlaneGeometry(options.width,options.depth,segments,Math.max(2,Math.round(segments*options.depth/options.width))),position=geometry.getAttribute('position'),colors:number[]=[];
 const shallow=new T.Color(options.shallow),deep=new T.Color(options.deep);
 for(let i=0;i<position.count;i++){const t=(.5-position.getY(i)/options.depth),c=deep.clone().lerp(shallow,options.edge==='none'?.5:Math.pow(t,1.6));colors.push(c.r,c.g,c.b);}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const normalMap=waveNormals(128,options.seed??7);normalMap.repeat.set((options.repeat??.12)*options.width,(options.repeat??.12)*options.depth);
 const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:options.roughness??.16,metalness:.08,normalMap,normalScale:new T.Vector2(.55,.55),transparent:(options.opacity??1)<1,opacity:options.opacity??1,depthWrite:(options.opacity??1)>=1});
 const surface=mesh(parent,geometry,material,options.x,options.y,options.z);surface.rotation.x=-Math.PI/2;surface.name=options.name||'animated-water-surface';surface.castShadow=false;surface.receiveShadow=false;
 const [fx,fy]=options.flow??[.012,.02];
 return{surface,update(time:number){normalMap.offset.set(time*fx,time*fy);}};
}

/** Falling water with scrolling streaks, foam at the pool and rising mist. */
export function createWaterfall(parent:T.Object3D,options:{x:number;top:number;z:number;width:number;height:number;seed:number;low:boolean;tint?:string;glow?:string}){
 const root=new T.Group();root.name='animated-waterfall';root.position.set(options.x,options.top,options.z);root.userData.animated=true;parent.add(root);
 const r=random(options.seed),{width,height,low}=options,w=32,h=64,data=new Uint8Array(w*h*4);
 for(let row=0;row<h;row++)for(let col=0;col<w;col++){const streak=Math.sin(col*1.85+Math.sin(row*.12))*.5+.5,v=Math.round(155+streak*75+r()*22),index=(row*w+col)*4;data[index]=v-26;data[index+1]=v;data[index+2]=Math.min(255,v+10);data[index+3]=Math.round(145+streak*75);}
 const texture=new T.DataTexture(data,w,h,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,height*.24);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
 const material=new T.MeshStandardMaterial({map:texture,color:options.tint||'#cceef4',transparent:true,opacity:.86,side:T.DoubleSide,roughness:.27,depthWrite:false,emissive:options.glow||'#4d8c9e',emissiveIntensity:.12});
 const geometry=new T.PlaneGeometry(width,height,8,18),p=geometry.getAttribute('position');for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*8+p.getY(i)*.5)*.045+Math.pow(Math.max(0,p.getY(i)/height+.5),3)*.6);geometry.computeVertexNormals();
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

/** Gently pulsing foam patches where water meets rock or sand. */
export function createShoreFoam(parent:T.Object3D,points:{x:number;y:number;z:number;size:number}[],low:boolean,color='#f4fbfa'){
 const count=low?Math.ceil(points.length*.5):points.length,foam=new T.InstancedMesh(new T.SphereGeometry(1,10,4),new T.MeshStandardMaterial({color,roughness:1,transparent:true,opacity:.62,depthWrite:false}),Math.max(1,count)),dummy=new T.Object3D();
 foam.name='shore-foam';foam.castShadow=false;parent.add(foam);if(!count)foam.count=0;
 const update=(time:number)=>{for(let i=0;i<count;i++){const p=points[i],pulse=1+Math.sin(time*1.3+i*1.7)*.12;dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.size*pulse,.03,p.size*.45*pulse);dummy.rotation.set(0,i*.7,0);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);}foam.instanceMatrix.needsUpdate=true;};
 update(0);return{foam,update};
}
