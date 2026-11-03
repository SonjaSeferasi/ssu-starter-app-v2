import * as T from 'three';
import {dispose,mesh,stage} from './scenic-kit';

type GeoFeature={properties:{continent:string;name:string};geometry:{type:'Polygon'|'MultiPolygon';coordinates:number[][][]|number[][][][]}};
const ids:Record<string,string>={'Africa':'africa','Europe':'europe','Asia':'asia','North America':'north-america','South America':'south-america','Oceania':'oceania','Antarctica':'antarctica'};
const colors:Record<string,string>={africa:'#c7ab5a',europe:'#88bb69',asia:'#6ba87b','north-america':'#6fa986','south-america':'#56a76e',oceania:'#82c3a0',antarctica:'#d3eff6'};
const centers:Record<string,[number,number]>={africa:[22,5],europe:[18,51],asia:[92,39],'north-america':[-105,43],'south-america':[-60,-17],oceania:[139,-27],antarctica:[0,-76]};
const point=(lng:number,lat:number,z=0)=>new T.Vector3(lng/10,lat/10,z);

/** Actual generalized Natural Earth silhouettes, extruded above a modeled sea.
 * 110m geometry is for a world overview; country inclusion uses the separate UN catalog. */
export function mountAtlas(parent:HTMLElement,onSelect:(id:string)=>void){
 const {renderer,scene,sun}=stage(parent,'#082f4d'),canvas=renderer.domElement;
 canvas.setAttribute('aria-label','Three dimensional geographic world map. Choose a continent using the adjacent continent buttons.');
 scene.fog=new T.Fog('#163d55',180,360);sun.position.set(-15,16,25);sun.target.position.set(0,0,0);
 const camera=new T.PerspectiveCamera(38,1,.1,500);camera.position.set(0,-7.4,34);camera.lookAt(0,-.8,0);
 const group=new T.Group();group.position.y=.15;scene.add(group);
 const tops=new Map<string,T.MeshStandardMaterial>(),sides=new Map<string,T.MeshStandardMaterial>(),lands:T.Mesh[]=[],rings=new Map<string,T.Mesh>();
 let selected:string|null=null,hovered:string|null=null,dead=false,frame=0,loadWarning:HTMLParagraphElement|undefined;
 for(const [id,color] of Object.entries(colors)){
  tops.set(id,new T.MeshStandardMaterial({color,roughness:.9}));sides.set(id,new T.MeshStandardMaterial({color:new T.Color(color).multiplyScalar(.5),roughness:.96}));
 }
 const sea=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 uvv;uniform float time;
 void main(){float bands=sin(uvv.x*95.+uvv.y*63.+time*.35)*.5+.5;float ripple=pow(max(0.,sin(uvv.y*180.+sin(uvv.x*80.)+time*.6)),18.);vec3 c=mix(vec3(.012,.09,.16),vec3(.025,.23,.29),smoothstep(.0,1.,uvv.y));c+=vec3(.025,.065,.065)*bands+c*.18*ripple;gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`,toneMapped:false});
 mesh(scene,new T.PlaneGeometry(130,85),sea,0,0,-.55);
 // Subtle latitude/longitude graticule gives scale without inventing paths or borders.
 const gridMaterial=new T.LineBasicMaterial({color:'#81c3d3',transparent:true,opacity:.12});
 for(let lng=-180;lng<=180;lng+=30){const g=new T.BufferGeometry().setFromPoints([point(lng,-85,-.48),point(lng,85,-.48)]);scene.add(new T.Line(g,gridMaterial));}
 for(let lat=-60;lat<=60;lat+=30){const g=new T.BufferGeometry().setFromPoints([point(-180,lat,-.48),point(180,lat,-.48)]);scene.add(new T.Line(g,gridMaterial));}
 const routePoints=Object.values(centers).filter(p=>p[1]>-70).map(([lng,lat])=>point(lng,lat,.8));
 const countryMarker=new T.Group();countryMarker.visible=false;countryMarker.name='selected-country-location';group.add(countryMarker);
 mesh(countryMarker,new T.TorusGeometry(.14,.035,8,24),new T.MeshBasicMaterial({color:'#fff5ba'}),0,0,.08);
 mesh(countryMarker,new T.SphereGeometry(.085,12,8),new T.MeshBasicMaterial({color:'#ffb643'}),0,0,.16);
 for(const [id,[lng,lat]] of Object.entries(centers)){
  const ring=mesh(group,new T.TorusGeometry(.23,.045,8,32),new T.MeshBasicMaterial({color:'#f9d56d'}),lng/10,lat/10,.82);ring.name=id;ring.userData.continent=id;rings.set(id,ring);
  const glow=mesh(group,new T.CircleGeometry(.17,24),new T.MeshBasicMaterial({color:'#fff3b2',transparent:true,opacity:.64}),lng/10,lat/10,.8);glow.userData.continent=id;lands.push(glow);
 }
 for(let i=1;i<routePoints.length;i++){
  const a=routePoints[i-1],b=routePoints[i],mid=a.clone().lerp(b,.5);mid.y+=.7;const curve=new T.QuadraticBezierCurve3(a,mid,b),line=new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(32)),new T.LineDashedMaterial({color:'#ffdc83',dashSize:.16,gapSize:.12,transparent:true,opacity:.42}));line.computeLineDistances();group.add(line);
 }
 const abort=new AbortController();
 void fetch('/world-explorer/atlas-world.json',{signal:abort.signal}).then(response=>{if(!response.ok)throw new Error('Map data unavailable');return response.json();}).then((geo:{features:GeoFeature[]})=>{
  if(dead)return;
  for(const feature of geo.features){
   const id=ids[feature.properties.continent];if(!id)continue;
   const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates as number[][][]]:feature.geometry.coordinates as number[][][][];
   for(const polygon of polygons){
    if(!polygon[0]?.length)continue;const shape=new T.Shape(polygon[0].map(([lng,lat])=>new T.Vector2(lng/10,lat/10)));
    for(const hole of polygon.slice(1))shape.holes.push(new T.Path(hole.map(([lng,lat])=>new T.Vector2(lng/10,lat/10))));
    const geometry=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelSize:.025,bevelThickness:.045,bevelSegments:1,steps:1});
    const land=new T.Mesh(geometry,[tops.get(id)!,sides.get(id)!]);land.castShadow=land.receiveShadow=true;land.userData.continent=id;land.name=feature.properties.name;group.add(land);lands.push(land);
    const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(polygon[0].map(([lng,lat])=>point(lng,lat,.355))),new T.LineBasicMaterial({color:'#c8e6b4',transparent:true,opacity:.25}));group.add(line);
   }
  }canvas.dataset.ready='true';
 }).catch(error=>{
  if(dead||error?.name==='AbortError')return;loadWarning=document.createElement('p');loadWarning.setAttribute('role','status');loadWarning.textContent='The map could not load. Use the continent buttons to continue.';loadWarning.style.cssText='position:absolute;left:1rem;bottom:1rem;color:white';parent.appendChild(loadWarning);
 });
 const pointer=new T.Vector2(),ray=new T.Raycaster();
 const hit=(event:PointerEvent)=>{const bounds=canvas.getBoundingClientRect();pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(lands,false)[0]?.object.userData.continent as string|undefined;};
 const move=(event:PointerEvent)=>{hovered=hit(event)||null;canvas.style.cursor=hovered?'pointer':'grab';};
 const click=(event:PointerEvent)=>{const id=hit(event);if(id)onSelect(id);};canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',click);
 const resize=()=>{const w=Math.max(1,parent.clientWidth),h=Math.max(1,parent.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=Math.max(32,21/Math.tan(T.MathUtils.degToRad(19))/camera.aspect);camera.lookAt(0,-.8,0);camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(parent);resize();
 const loop=(time:number)=>{if(dead)return;sea.uniforms.time.value=time*.001;for(const [id,m] of tops){m.emissive.set(id===selected?'#c5a342':id===hovered?'#5b8b44':'#000000');m.emissiveIntensity=id===selected?.32:.18;}for(const [id,ring] of rings){ring.scale.setScalar(id===selected?1.3+Math.sin(time*.003)*.08:1);}
  renderer.render(scene,camera);frame=requestAnimationFrame(loop);
 };frame=requestAnimationFrame(loop);
 return{select(id:string|null){selected=id;},locate(lat:number,lng:number){if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){countryMarker.visible=false;return;}countryMarker.visible=true;countryMarker.position.copy(point(lng,lat,.65));},destroy(){if(dead)return;dead=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',click);loadWarning?.remove();dispose(renderer,scene);}};
}
