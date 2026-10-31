import * as T from 'three';
import {mesh,random} from './common';

export type SkyOptions={zenith:string;horizon:string;glow:string;sun:[number,number,number];glowPower?:number;band?:string};

/** A shaded sky volume: pale horizon, deeper zenith and a soft sun glow. An
 * optional band colours the lowest sky (sunset or desert haze). */
export function createSkyDome(parent:T.Object3D,options:SkyOptions){
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
  uniforms:{zenith:{value:new T.Color(options.zenith)},horizon:{value:new T.Color(options.horizon)},band:{value:new T.Color(options.band||options.horizon)},glow:{value:new T.Color(options.glow)},sun:{value:new T.Vector3(...options.sun).normalize()},power:{value:options.glowPower??42}},
  vertexShader:'varying vec3 worldPoint; void main(){vec4 p=modelMatrix*vec4(position,1.0);worldPoint=p.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform vec3 zenith;uniform vec3 horizon;uniform vec3 band;uniform vec3 glow;uniform vec3 sun;uniform float power;varying vec3 worldPoint;
   void main(){vec3 direction=normalize(worldPoint-cameraPosition);float t=smoothstep(-.6,.42,direction.y);
    vec3 color=mix(horizon,zenith,t);color=mix(band,color,smoothstep(-.32,.08,direction.y));float g=max(0.0,dot(direction,sun));
    color+=glow*(pow(g,power)*.9+pow(g,6.0)*.16);gl_FragColor=vec4(color,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const dome=mesh(parent,new T.SphereGeometry(150,24,16),material,0,0,-12);dome.name='gradient-sky-volume';dome.castShadow=dome.receiveShadow=false;dome.renderOrder=-100;dome.frustumCulled=false;
 return{dome,follow(cameraX:number){dome.position.x=cameraX;}};
}

export type CloudOptions={finish:number;low:boolean;seed:number;color?:string;shade?:string;opacity?:number;high?:[number,number];lowBand?:[number,number];depth?:[number,number];groups?:number;flat?:number};
/** Billowing banks of round puffs in one instanced draw. */
export function createCloudBanks(parent:T.Object3D,options:CloudOptions){
 const root=new T.Group();root.name='sky-cloud-banks';parent.add(root);
 const r=random(options.seed),groups=Math.round((options.groups??22)*(options.low?.55:1)),puffs=options.low?5:8,[highMin,highMax]=options.high??[17,36],[lowMin,lowMax]=options.lowBand??[-7,-3],[nearZ,farZ]=options.depth??[-68,-104];
 const geometry=new T.SphereGeometry(1,options.low?8:10,options.low?5:7),position=geometry.getAttribute('position'),colors:number[]=[],shade=new T.Color(options.shade||'#c5d9ee'),light=new T.Color(options.color||'#ffffff');
 for(let i=0;i<position.count;i++){const c=shade.clone().lerp(light,T.MathUtils.smoothstep(position.getY(i),-.8,.5));colors.push(c.r,c.g,c.b);}geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const clouds=new T.InstancedMesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:options.opacity??.9,depthWrite:false,fog:false}),groups*puffs),dummy=new T.Object3D();clouds.name='instanced-clouds';clouds.castShadow=clouds.receiveShadow=false;
 for(let i=0;i<groups;i++){
  const x=-45+r()*(options.finish+95),y=i%3===0?lowMin+r()*(lowMax-lowMin):highMin+r()*(highMax-highMin),z=nearZ+r()*(farZ-nearZ),scale=1.2+r()*1.3;
  for(let j=0;j<puffs;j++){dummy.position.set(x+(j-puffs/2)*scale*1.2,y+Math.sin(j/(puffs-1)*Math.PI)*scale*.7,z+(r()-.5)*3);dummy.rotation.set(0,r()*2,0);dummy.scale.set(scale*(.8+r()*.6),scale*(.55+r()*.45)*(options.flat??1),scale*.8);dummy.updateMatrix();clouds.setMatrixAt(i*puffs+j,dummy.matrix);}
 }
 root.add(clouds);return root;
}

/** Prefiltered sky light for physically based materials (water, metal, glazed
 * tiles). It is generated from the same gradient, so no image is downloaded. */
export function skyEnvironment(renderer:T.WebGLRenderer,options:{zenith:string;horizon:string;ground:string}){
 const scene=new T.Scene(),geometry=new T.SphereGeometry(10,32,16),position=geometry.getAttribute('position'),colors:number[]=[];
 const zenith=new T.Color(options.zenith),horizon=new T.Color(options.horizon),ground=new T.Color(options.ground);
 for(let i=0;i<position.count;i++){const y=position.getY(i)/10,c=y>=0?horizon.clone().lerp(zenith,Math.pow(y,.6)):horizon.clone().lerp(ground,Math.min(1,-y*3));colors.push(c.r,c.g,c.b);}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));scene.add(new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));
 const generator=new T.PMREMGenerator(renderer),target=generator.fromScene(scene,.04);generator.dispose();geometry.dispose();(scene.children[0] as T.Mesh).material instanceof T.Material&&((scene.children[0] as T.Mesh).material as T.Material).dispose();
 return target;
}
