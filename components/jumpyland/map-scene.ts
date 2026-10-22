import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {Sky} from 'three/examples/jsm/objects/Sky.js';
import {MAP_HEIGHT,MAP_WIDTH,type MapPoint} from './map-layout';
import {createModelCamera,modelAnchors,modelTrails,modelWorldPoints,projectModelPoint,projectedTrail} from './model-map-layout';

export type MapProjection={worlds:MapPoint[];trails:string[];cloud:MapPoint};
export type MapSceneOptions={selected:()=>number;cloud:()=>MapPoint;onProject:(projection:MapProjection)=>void;onReady:()=>void;onError:()=>void};

// The map is a real Blender-authored GLB with PBR terrain, modeled buildings,
// vegetation and props. The source panorama is never used by this renderer.
export function mountMap(canvas:HTMLCanvasElement,options:MapSceneOptions){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setSize(MAP_WIDTH,MAP_HEIGHT,false);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 canvas.dataset.renderer='blender-gltf-webgl';
 const scene=new T.Scene(),camera=createModelCamera();scene.background=new T.Color('#98c5dc');scene.fog=new T.FogExp2('#a8c6d3',.0018);
 scene.add(new T.HemisphereLight('#d6e8f5','#52683c',.45));
 const sun=new T.DirectionalLight('#fff1d1',2.4);sun.position.set(-35,65,35);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-53,right:53,top:53,bottom:-53,near:1,far:180});sun.shadow.normalBias=.045;sun.shadow.bias=-.00015;sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target);
 const sky=new Sky();sky.scale.setScalar(1200);
 sky.material.uniforms.turbidity.value=3;sky.material.uniforms.rayleigh.value=1.6;sky.material.uniforms.mieCoefficient.value=.004;sky.material.uniforms.mieDirectionalG.value=.8;sky.material.uniforms.sunPosition.value.copy(sun.position);scene.add(sky);
 // Sky emits HDR radiance, including a very bright solar disc. Its appearance
 // and the model's indirect illumination need separate exposure budgets.
 const skyOutput='gl_FragColor = vec4( texColor, 1.0 );';
 sky.material.fragmentShader=sky.material.fragmentShader.replace(skyOutput,'gl_FragColor = vec4( texColor * 0.16, 1.0 );');
 const environmentScene=new T.Scene(),environmentSky=sky.clone();environmentScene.add(environmentSky);
 environmentSky.material=sky.material.clone();
 environmentSky.material.uniforms.showSunDisc.value=0;
 // Bound the captured radiance before convolution, so HDR clouds and the sun
 // cannot bleach the entire scene. The directional sun supplies direct light.
 environmentSky.material.fragmentShader=environmentSky.material.fragmentShader.replace('gl_FragColor = vec4( texColor * 0.16, 1.0 );','gl_FragColor = vec4( clamp( texColor * 0.16, 0.0, 1.0 ), 1.0 );');
 const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.025,1,1500);scene.environment=environment.texture;pmrem.dispose();environmentScene.remove(environmentSky);environmentSky.material.dispose();
 const rippleData=new Uint8Array(128*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,a=Math.sin(x*.33+y*.19)*.18,b=Math.cos(y*.41-x*.12)*.15;rippleData[i]=128+a*127;rippleData[i+1]=128+b*127;rippleData[i+2]=250;rippleData[i+3]=255;}
 const ripple=new T.DataTexture(rippleData,128,128);ripple.wrapS=ripple.wrapT=T.RepeatWrapping;ripple.repeat.set(38,38);ripple.needsUpdate=true;
 const waterMaterial=new T.MeshPhysicalMaterial({color:'#568e99',roughness:.21,metalness:.15,normalMap:ripple,normalScale:new T.Vector2(.28,.28),envMapIntensity:.8});
 const water=new T.Mesh(new T.PlaneGeometry(300,300,1,1),waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(0,-.10,-30);water.receiveShadow=true;scene.add(water);
 const flowNormal=ripple.clone();flowNormal.repeat.set(1,5);flowNormal.needsUpdate=true;
 const draco=new DRACOLoader().setDecoderPath('/jumpyland/models/draco/');draco.setWorkerLimit(2);
 const loader=new GLTFLoader().setDRACOLoader(draco);
 let disposed=false,ready=false,frame=0,lastDraw=-Infinity;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const trails=modelTrails();
 const materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 function collectMaterial(material:T.Material){materials.add(material);Object.values(material).forEach(value=>{if(value instanceof T.Texture)textures.add(value);});}
 function freeModel(root:T.Object3D){root.traverse(object=>{if(object instanceof T.Mesh){object.geometry.dispose();(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>{Object.values(m).forEach(value=>{if(value instanceof T.Texture)value.dispose();});m.dispose();});}});}
 void loader.loadAsync('/jumpyland/models/landing-world-v1.glb').then(async gltf=>{
  if(disposed){freeModel(gltf.scene);return;}
  gltf.scene.traverse(object=>{
   if(!(object instanceof T.Mesh))return;
   const list=Array.isArray(object.material)?object.material:[object.material];
   object.castShadow=true;object.receiveShadow=true;
   list.forEach(material=>{
    collectMaterial(material);
    if(!(material instanceof T.MeshStandardMaterial))return;
    material.envMapIntensity=.55;
    if(material.name==='Valley water'){object.visible=false;object.castShadow=false;}
    if(material.name==='Falling water'){object.castShadow=false;material.transparent=true;material.opacity=.58;material.depthWrite=false;material.normalMap=flowNormal;material.normalScale.set(.20,.12);material.roughness=.2;material.emissive.set('#b7dfe4');material.emissiveIntensity=.16;}
    if(material.name.includes('mountains')||material.name.includes('moon'))object.castShadow=false;
    if(material.name.includes('needles'))material.side=T.DoubleSide;
   });
  });
  scene.add(gltf.scene);scene.updateMatrixWorld(true);
  await renderer.compileAsync(scene,camera);
  if(disposed)return;
  ready=true;renderer.render(scene,camera);project();options.onReady();
 }).catch(()=>{if(!disposed){options.onError();cleanup();}});
 function project(){
  const index=Math.min(modelAnchors.length-1,Math.max(0,options.selected())),cloud=options.cloud(),base=modelWorldPoints[index];
  const position=modelAnchors[index].clone().add(new T.Vector3(-4+(cloud.x-(base.x-125))*.04,1.2,-(cloud.y-(base.y-45))*.05));
  const avatar=projectModelPoint(position,camera);
  options.onProject({worlds:modelAnchors.map(p=>projectModelPoint(p,camera)),trails:trails.map(trail=>projectedTrail(trail,camera)),cloud:{x:avatar.x-38,y:avatar.y-105}});
 }
 function draw(time:number){
  if(disposed)return;
  if(ready&&!document.hidden&&time-lastDraw>=(reduced.matches?150:33)){
   lastDraw=time;const seconds=reduced.matches?0:time*.001;
   ripple.offset.set(seconds*.0018,seconds*.0009);flowNormal.offset.y=-seconds*.18;
   renderer.render(scene,camera);canvas.dataset.ready='true';project();
  }
  frame=requestAnimationFrame(draw);
 }
 frame=requestAnimationFrame(draw);
 function cleanup(){
  if(disposed)return;disposed=true;cancelAnimationFrame(frame);draco.dispose();
  const geometries=new Set<T.BufferGeometry>();scene.traverse(object=>{if(object instanceof T.Mesh){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(collectMaterial);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());ripple.dispose();flowNormal.dispose();environment.dispose();renderer.dispose();
 }
 return cleanup;
}
