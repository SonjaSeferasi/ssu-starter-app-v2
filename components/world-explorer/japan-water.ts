import * as T from 'three';
import {mesh,random} from './scenic-kit';

export type JapanWaterfallSite={x:number;top:number;z:number;width:number;intensity?:number;channelLength?:number};

const noiseGLSL=`
 uniform sampler2D waterNoiseMap;
 float waterNoise(vec2 p){return texture2D(waterNoiseMap,p*(1./16.)).r;}
`;

// Only immutable CPU pixels are cached. Each mounted valley owns its GPU
// texture, so disposing one scene cannot invalidate another scene's water.
let waterNoisePixels:Uint8Array|undefined;
export function createJapanWaterNoiseTexture(){
 const size=256,period=16;
 if(!waterNoisePixels){
  const data=new Uint8Array(size*size*4);
  const corner=(x:number,y:number,cells:number)=>{
   const xx=(x%cells+cells)%cells,yy=(y%cells+cells)%cells;
   let h=(Math.imul(xx,374761393)+Math.imul(yy,668265263)+7193)|0;
   h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;
  };
  const noise=(x:number,y:number,cells:number)=>{
   const ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy,u=dx*dx*(3-2*dx),v=dy*dy*(3-2*dy);
   const a=corner(ix,iy,cells),b=corner(ix+1,iy,cells),c=corner(ix,iy+1,cells),d=corner(ix+1,iy+1,cells);
   return(a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const u=x/(size-1)*period,v=y/(size-1)*period;
   const value=Math.round(255*(noise(u,v,period)*.57+noise(u*2,v*2,period*2)*.28+noise(u*4,v*4,period*4)*.15)),i=(y*size+x)*4;
   data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  waterNoisePixels=data;
 }
 const texture=new T.DataTexture(waterNoisePixels,size,size,T.RGBAFormat);
 texture.name='japan-periodic-water-fbm';texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}

/** A small, original procedural alpha asset, only used on decorative spray.
 * The soft edge has no opaque rectangular pixels and needs no DOM/canvas. */
export function createJapanMistTexture(){
 const size=48,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,d=Math.sqrt(u*u+v*v),edge=Math.max(0,1-d),alpha=Math.pow(edge,1.8)*(1+.14*Math.sin(u*13+v*9));
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.min(1,alpha)*255);
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.needsUpdate=true;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;return texture;
}

const waterVertex=`
 uniform float time;attribute float flowSeed;attribute float flowIntensity;
 varying vec2 waterUv;varying vec3 waterPoint;varying float waterSeed;varying float waterIntensity;
 #include <fog_pars_vertex>
 void main(){waterUv=uv;waterSeed=flowSeed;waterIntensity=flowIntensity;vec3 p=position;
  p.x+=sin(uv.y*21.+time*3.1+flowSeed)*.035*uv.y;
  p.z+=sin(uv.y*32.-time*4.+flowSeed)*.032*uv.y;
  waterPoint=(modelMatrix*vec4(p,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
 }`;

/** A continuous falling ribbon is scalloped and bowed in geometry, then split
 * into moving filaments, eddies and transparent edge holes in the shader. */
const fallFragment=`
 uniform float time;varying vec2 waterUv;varying vec3 waterPoint;varying float waterSeed;varying float waterIntensity;
 #include <fog_pars_fragment>
 ${noiseGLSL}
 void main(){vec2 uv=waterUv;float speed=time*(.48+waterIntensity*.22),travel=uv.y-speed;
  float eddy=waterNoise(vec2(uv.x*8.+sin(uv.y*15.-time*2.+waterSeed)*.45,travel*8.+waterSeed));
  float filament=pow(.5+.5*sin(uv.x*73.+eddy*7.+sin(travel*24.)*.4),2.);
  float broad=waterNoise(vec2(uv.x*18.,travel*30.+waterSeed));
  float border=.035+.13*waterNoise(vec2(uv.y*19.-time*1.4,waterSeed));
  float edge=smoothstep(border,border+.12,uv.x)*smoothstep(border,border+.12,1.-uv.x);
  float breakup=mix(1.,smoothstep(.13,.37,broad),smoothstep(.12,.85,uv.y));
  float foam=smoothstep(.64,.9,eddy+filament*.22)+pow(1.-uv.y,9.)*.6;
  vec3 color=mix(vec3(.26,.61,.68),vec3(.88,.97,.98),.36+filament*.28+foam*.38);
  float alpha=edge*breakup*(.36+filament*.26+foam*.23)*waterIntensity;
  if(alpha<.018)discard;gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`;

const surfaceVertex=`
 uniform float time;varying vec2 waterUv;varying vec3 waterPoint;
 #include <fog_pars_vertex>
 void main(){waterUv=uv;waterPoint=(modelMatrix*vec4(position,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
 }`;

const surfaceFragment=`
 uniform float time;uniform float opacity;varying vec2 waterUv;varying vec3 waterPoint;
 #include <fog_pars_fragment>
 ${noiseGLSL}
 void main(){vec2 p=waterPoint.xz;
  vec2 drift=vec2(time*.018,-time*.031);
  float large=waterNoise(p*.065+drift);
  vec2 warp=vec2(waterNoise(p*.11+vec2(7.1,2.4)),waterNoise(p*.09+vec2(1.3,9.2)))-.5;
  float ripples=waterNoise(p*vec2(.18,.65)+warp*2.4+drift*2.);
  float brokenLight=smoothstep(.57,.79,ripples)*smoothstep(.31,.72,large);
  vec3 deep=vec3(.055,.23,.29),pale=vec3(.17,.39,.43);
  vec3 color=mix(deep,pale,large*.66+.16)+brokenLight*vec3(.055,.075,.072);
  gl_FragColor=vec4(color,opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`;

function geometry(positions:number[],uv:number[],indices:number[],seeds?:number[],intensities?:number[]){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);
 if(seeds)g.setAttribute('flowSeed',new T.Float32BufferAttribute(seeds,1));if(intensities)g.setAttribute('flowIntensity',new T.Float32BufferAttribute(intensities,1));g.computeVertexNormals();return g;
}

/** Six draws cover the entire valley water, irrespective of waterfall count.
 * All resources belong to the returned root and are disposed by its owner. */
export function createJapanWater(parent:T.Object3D,{finish,sites,low=false}:{finish:number;sites:readonly JapanWaterfallSite[];low?:boolean}){
 const root=new T.Group();root.name='japan-valley-water';root.userData.decorative=true;root.userData.waterfallCount=sites.length;root.userData.drawBudget=6;parent.add(root);
 const time={value:0},waterNoiseMap={value:createJapanWaterNoiseTexture()},surfaceMaterial=new T.ShaderMaterial({uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),time,waterNoiseMap,opacity:{value:1}},vertexShader:surfaceVertex,fragmentShader:surfaceFragment,fog:true,side:T.DoubleSide});
 const lake=mesh(root,new T.PlaneGeometry(finish+190,175),surfaceMaterial,finish*.5,-23,-59);lake.rotation.x=-Math.PI/2;lake.name='japan-mountain-lake';lake.castShadow=lake.receiveShadow=false;
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],seeds:number[]=[],intensities:number[]=[],sourceP:number[]=[],sourceUv:number[]=[],sourceI:number[]=[],cols=low?6:10,rows=low?20:36;
 sites.forEach((site,index)=>{
  const start=positions.length/3,height=site.top+23,seed=index*2.39+.7;
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
   const t=row/rows,u=col/cols,scallop=1+.09*Math.sin(t*19+seed)+.035*Math.sin(t*43-seed),span=site.width*(.86+t*.17)*scallop;
   positions.push(site.x+(u-.5)*span+Math.sin(t*8+seed)*site.width*.035*t,site.top-height*t,site.z+t*t*.65+Math.sin(t*Math.PI)*.2);uv.push(u,t);seeds.push(seed);intensities.push(site.intensity??.9);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=start+row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
  // A visible shallow feeder ends exactly on the cliff lip. The wider source
  // narrows into the falling ribbon, rather than appearing from empty sky.
  const offset=sourceP.length/3,length=site.channelLength??5.1;
  for(let row=0;row<=8;row++)for(let col=0;col<=4;col++){
   const t=row/8,u=col/4,span=site.width*(.83+.2*Math.sin(t*Math.PI));sourceP.push(site.x+(u-.5)*span+.12*Math.sin(t*4+seed)*Math.sin(t*Math.PI),site.top+.026,site.z-length*t);sourceUv.push(u,t);
  }
  for(let row=0;row<8;row++)for(let col=0;col<4;col++){const a=offset+row*5+col,b=a+5;sourceI.push(a,a+1,b,a+1,b+1,b);}
 });
 const falling=mesh(root,geometry(positions,uv,indices,seeds,intensities),new T.ShaderMaterial({uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),time,waterNoiseMap},vertexShader:waterVertex,fragmentShader:fallFragment,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,fog:true}));falling.name='flowing-water-surface';falling.castShadow=falling.receiveShadow=false;falling.userData.profile='bowed scalloped ribbons with animated transparent filaments';
 const markers=new T.Group();markers.name='japan-animated-waterfall';markers.userData.animated=true;root.add(markers);
 const channels=mesh(root,geometry(sourceP,sourceUv,sourceI),surfaceMaterial);channels.name='waterfall-feeding-river-channel';channels.castShadow=channels.receiveShadow=false;
 const mistTexture=createJapanMistTexture(),mistEach=low?7:15,foamEach=low?8:16,ringEach=low?2:4;
 const mist=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:mistTexture,color:'#edf8fa',transparent:true,opacity:.21,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,fog:true}),sites.length*mistEach);mist.name='waterfall-mist';mist.castShadow=mist.receiveShadow=false;root.add(mist);
 const foam=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:mistTexture,color:'#f0fcfc',transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,fog:true}),sites.length*foamEach);foam.name='waterfall-foam';foam.castShadow=foam.receiveShadow=false;root.add(foam);
 const ringGeometry=new T.RingGeometry(.9,1,low?32:48);ringGeometry.rotateX(-Math.PI/2);
 const rings=new T.InstancedMesh(ringGeometry,new T.MeshBasicMaterial({color:'#aadbe0',transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,fog:true}),sites.length*ringEach);rings.name='waterfall-impact-ripples';rings.castShadow=rings.receiveShadow=false;root.add(rings);
 const r=random(18298),phases=Array.from({length:Math.max(mist.count,foam.count)},()=>r()*Math.PI*2),dummy=new T.Object3D();
 const update=(elapsed:number)=>{
  time.value=elapsed;
  sites.forEach((site,s)=>{
   for(let i=0;i<foamEach;i++){
    const n=s*foamEach+i,phase=phases[n],lip=i<foamEach/3;
    dummy.position.set(site.x+Math.sin(phase+elapsed*.7)*site.width*(lip?.4:.65),lip?site.top+.045:-22.93+Math.sin(elapsed+phase)*.025,site.z+(lip?.06:.7)+Math.cos(phase)*.36);
    dummy.rotation.set(-Math.PI/2,0,phase);dummy.scale.set((lip?.35:.65)+Math.sin(phase)*.12,lip?.25:.5,1);dummy.updateMatrix();foam.setMatrixAt(n,dummy.matrix);
   }
   for(let i=0;i<mistEach;i++){
    const n=s*mistEach+i,phase=phases[n],rise=(elapsed*.15+i/mistEach)%1;
    dummy.position.set(site.x+Math.sin(phase+rise*1.8)*site.width*.9,-22.7+rise*2.3,site.z+.7+Math.cos(phase)*.7);dummy.rotation.set(0,0,phase+elapsed*.03);dummy.scale.set(1.8+rise*1.6,1.2+rise*1.7,1);dummy.updateMatrix();mist.setMatrixAt(n,dummy.matrix);
   }
   for(let i=0;i<ringEach;i++){
    const n=s*ringEach+i,age=(elapsed*.21+i/ringEach)%1;dummy.position.set(site.x,-22.97,site.z+.65);dummy.rotation.set(0,.2,0);dummy.scale.set(site.width*(.25+age),1,.6+age*1.3);dummy.updateMatrix();rings.setMatrixAt(n,dummy.matrix);
   }
  });
  foam.instanceMatrix.needsUpdate=mist.instanceMatrix.needsUpdate=rings.instanceMatrix.needsUpdate=true;
 };
 update(0);return{root,update};
}
