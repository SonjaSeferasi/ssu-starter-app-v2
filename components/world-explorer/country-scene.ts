import * as T from 'three';
import {batchStatic,dispose,hash,island,matte,mesh,palettes,random,sign,skyMountains,sphere,stage,strut,type Biome} from './scenic-kit';
import {countryLandmarks,countryPlatform,rainforestBridges} from './country-landmarks';
import {countryFlag} from './country-platforms';
import {countryProfile} from '../../lib/world-explorer/profiles';
import {countrySurface,groundAppearance,routeArchitecture,routeVegetation} from './route-scenery';
import {mountJapanEnvironment,addJapanTorii} from './japan-environment';
import {levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {LevelSimulation,cameraFrame} from '../../lib/world-explorer/simulation';
import {createExplorerAudio} from '../../lib/world-explorer/audio';
import type {CountryCallbacks,ExplorerRunPreferences,PlatformDefinition} from '../../lib/world-explorer/game-types';
export type {CountryCallbacks} from '../../lib/world-explorer/game-types';

export type ExplorerCountry={code:string;name:string;continent:string;biome:Biome;lat:number;lng:number;iso2?:string;difficulty?:1|2|3|4}&ExplorerRunPreferences;
export type ExplorerPlatform={x:number;y:number;width:number;motion:'horizontal'|'vertical'|null;amplitude:number;phase:number};
export type CountryCourse={platforms:ExplorerPlatform[];finish:number;gravity:number;jumpSpeed:number;runSpeed:number};

/** Legacy course consumers share the same validated manifests as gameplay. */
export function buildCountryCourse(country:{code:string;difficulty?:1|2|3|4},difficulty:1|2|3|4=country.difficulty??1):CountryCourse{
 const level=levelDefinitionFor(country.code,difficulty),last=level.platforms.find(p=>p.id===level.finish.platformId)!;
 return{platforms:level.platforms.map(p=>({...p})),finish:last.x+level.finish.offset,gravity:level.physics.gravity,jumpSpeed:level.physics.jumpSpeed,runSpeed:level.physics.runSpeed};
}

/** The wooden deck is a playable solid surface; its rails stay outside z=0. */
export function woodenPlatform(root:T.Group,definition:PlatformDefinition){
 for(const name of ['country-platform-cap','country-platform-cliff']){const old=root.getObjectByName(name) as T.Mesh|undefined;if(old){old.removeFromParent();old.geometry.dispose();for(const material of Array.isArray(old.material)?old.material:[old.material])material.dispose();}}
 const width=definition.width,wood=matte('#8c593f'),edge=matte('#b68b5b'),rope=matte('#bfb08b'),n=Math.ceil(width/.27);
 root.userData.surface=definition.type;
 for(let i=0;i<n;i++)mesh(root,new T.BoxGeometry(width/n-.009,.18,3.1),i%3?wood:edge,-width/2+(i+.5)*width/n,-.075,0);
 for(const z of [-1.42,1.42]){
  mesh(root,new T.BoxGeometry(width,.2,.14),wood,0,-.21,z);
  for(const x of [-width/2+.2,width/2-.2]){mesh(root,new T.CylinderGeometry(.045,.06,.68,8),wood,x,.34,z);sphere(root,edge,x,.7,z,.07);}
  const curve=new T.QuadraticBezierCurve3(new T.Vector3(-width/2+.2,.62,z),new T.Vector3(0,.34,z),new T.Vector3(width/2-.2,.62,z));mesh(root,new T.TubeGeometry(curve,24,.026,5,false),rope);
 }
}

function explorerCharacter(scene:T.Scene){
 const hero=new T.Group(),body=new T.Group();hero.add(body);scene.add(hero);hero.name='original-student-explorer';
 const navy=matte('#23456e'),denim=matte('#4d7695'),skin=matte('#c58f64'),hair=matte('#302923'),shoes=matte('#f3f2e9'),dark=matte('#202c3b');
 sphere(body,navy,0,.92,0,.21,.32,.15);sphere(body,skin,0,1.36,.015,.165,.2,.15);sphere(body,hair,0,1.46,-.025,.175,.13,.155);
 for(let i=0;i<8;i++)sphere(body,hair,Math.sin(i*2.4)*.13,1.51+Math.cos(i*1.4)*.025,Math.cos(i*2.4)*.09,.065,.055,.06);
 for(const side of [-1,1]){sphere(body,shoes,side*.06,1.37,.153,.034,.037,.015);sphere(body,dark,side*.061,1.37,.166,.018,.024,.009);}
 sphere(body,dark,0,.98,-.2,.17,.23,.1);sphere(body,dark,0,.9,-.27,.13,.1,.04);
 const legs:T.Group[]=[],arms:T.Group[]=[];
 for(const side of [-1,1]){
  const leg=new T.Group();leg.position.set(side*.1,.69,0);body.add(leg);legs.push(leg);mesh(leg,new T.CapsuleGeometry(.074,.43,4,8),denim,0,-.23,0);mesh(leg,new T.CylinderGeometry(.061,.065,.1,8),denim,0,-.52,0);sphere(leg,shoes,0,-.615,.045,.09,.06,.15);
  const arm=new T.Group();arm.position.set(side*.23,1.1,0);body.add(arm);arms.push(arm);mesh(arm,new T.CapsuleGeometry(.063,.32,4,8),navy,0,-.18,0);sphere(arm,skin,0,-.4,.015,.062,.073,.06);
  strut(body,dark,new T.Vector3(side*.15,1.2,-.13),new T.Vector3(side*.18,.9,.13),.018);
 }
 return{hero,body,legs,arms};
}

export function mountCountryStage(parent:HTMLElement,country:ExplorerCountry,callbacks:CountryCallbacks){
 const profile=countryProfile(country.code);if(!profile)throw new Error('This country does not have a verified place profile. Please choose another country.');
 const level=levelDefinitionFor(country.code,country.difficulty??1),simulation=new LevelSimulation(level),biome=country.code==='ANTARCTICA'?'alpine':profile.biome,palette=palettes[biome]||palettes.temperate;
 const {renderer,scene,sun}=stage(parent,palette.sky),canvas=renderer.domElement;canvas.tabIndex=0;
 let reducedMotion=country.reducedMotion??false;
 if(country.graphicsQuality==='low'){renderer.setPixelRatio(Math.min(window.devicePixelRatio,1));renderer.shadowMap.enabled=false;}
 canvas.setAttribute('aria-label',`${country.name}, ${level.title}. Arrow keys or A and D to move. Space to jump. Three lives and three optional stars.`);
 canvas.dataset.countryCode=country.code;canvas.dataset.levelId=level.id;canvas.dataset.landmarkName=profile.landmarkName;canvas.dataset.landmarkKind=profile.landmarkKind;canvas.dataset.representation='stylized';canvas.dataset.developmentStage=country.code==='JPN'?'prototype':'preview';
 const camera=new T.PerspectiveCamera(44,1,.1,190),r=random(hash(country.code)),finish=simulation.position(level.finish).x;
 let reviewView:'gameplay'|'overview'='gameplay',performanceStart=performance.now(),performanceFrames=0;
 const platforms=level.platforms.map((p,i)=>{
  const root=island(scene,p.x+p.width/2,p.y,p.width,p.depth,biome,i+hash(country.code),p.thickness);
  countryPlatform(root,country.code,p.width,i,profile);countrySurface(root,profile);routeArchitecture(root,profile,p.width,i);
  if(p.type==='wooden-bridge'||p.type==='wooden-moving')woodenPlatform(root,p);
  root.name='playable-'+p.id;return{...p,root};
 });
 const japan=country.code==='JPN'?mountJapanEnvironment(scene,{platforms:level.platforms,finish,reducedMotion,quality:country.graphicsQuality}):null;
 if(!japan){
  scene.fog=new T.Fog(palette.fog,27,110);const mountains=new T.Group();scene.add(mountains);skyMountains(mountains,biome,finish,hash(country.code));batchStatic(mountains);countryLandmarks(scene,country.code,biome,profile);
  if(country.code==='BRA')rainforestBridges(scene,platforms);
  const ground=groundAppearance(profile),water=mesh(scene,new T.PlaneGeometry(finish+160,150),new T.MeshStandardMaterial(ground||{color:palette.water,roughness:.26,metalness:.2}),finish/2,-8,-30);water.rotation.x=-Math.PI/2;water.name=ground?'representative-land-surface':'representative-water-surface';
  const distant=new T.Group();scene.add(distant);
  for(let x=-12;x<finish+20;x+=5+r()*5){const width=4+r()*6,y=-2+r()*4,back=island(distant,x,y,width,4,biome,hash(country.code)+Math.floor(x),7+r()*5);back.position.z=x>4&&x<30?-34-r()*12:-12-r()*15;countrySurface(back,profile);for(let i=0;i<3;i++)routeVegetation(back,profile,(r()-.5)*width*.6,0,(r()-.5)*1.8,.8+r()*.7,Math.floor(r()*10000));}
  for(const p of platforms)for(let i=0;i<Math.max(1,Math.floor(p.width/2));i++)routeVegetation(p.root,profile,(i+.5)*p.width/Math.max(1,Math.floor(p.width/2))-p.width/2,.03,-1.14,.7+r()*.45,Math.floor(r()*10000));
  batchStatic(distant);
 }
 const gold=new T.MeshStandardMaterial({color:'#f2c75b',emissive:'#a47020',emissiveIntensity:.22,roughness:.28,metalness:.55});
 const checkpointObjects:T.Mesh[]=[];
 for(const checkpoint of level.checkpoints){const position=simulation.position(checkpoint),marker=new T.Group();marker.name=checkpoint.id;marker.position.set(position.x,position.y,-.9);scene.add(marker);if(japan)addJapanTorii(marker,0,0,-.7,2.2);mesh(marker,new T.CylinderGeometry(.035,.045,1.3,8),matte('#8c593f'),0,.65,0);const orb=mesh(marker,new T.SphereGeometry(.17,14,10),new T.MeshStandardMaterial({color:'#a9c0b0',emissive:'#789c82',emissiveIntensity:.18}),0,1.4,0);checkpointObjects.push(orb);}
 const discoveryPosition=simulation.position(level.discovery),discoveryRoot=new T.Group();discoveryRoot.position.set(discoveryPosition.x,discoveryPosition.y,-.95);discoveryRoot.name='discovery-point';scene.add(discoveryRoot);mesh(discoveryRoot,new T.CylinderGeometry(.25,.35,.5,10),matte('#bcb39a'),0,.25,0);const discoveryOrb=mesh(discoveryRoot,new T.OctahedronGeometry(.23),new T.MeshStandardMaterial({color:'#bcebe1',emissive:'#5abfac',emissiveIntensity:.45}),0,1.03,0);
 for(const p of platforms)batchStatic(p.root);
 const flag=countryFlag(scene,country.iso2,country.code==='ANTARCTICA');canvas.dataset.flagType=country.code==='ANTARCTICA'?'expedition':'national';
 const end=simulation.position(level.finish),gate=new T.Group();gate.position.set(end.x,end.y,0);gate.name='level-finish';scene.add(gate);
 if(japan)addJapanTorii(gate,0,0,-1.55,3.5);
 const portal=mesh(gate,new T.TorusGeometry(1.08,.1,12,48),gold,0,1.24,-.25);mesh(gate,new T.CylinderGeometry(1.3,1.45,.12,32),matte('#acaa98'),0,.015,0);
 mesh(gate,new T.CylinderGeometry(.028,.036,2.6,8),matte('#8c593f'),1.2,1.3,-.9);const bannerShape=new T.Shape();bannerShape.moveTo(0,0);bannerShape.lineTo(.85,-.15);bannerShape.lineTo(0,-.45);bannerShape.closePath();mesh(gate,new T.ShapeGeometry(bannerShape),new T.MeshStandardMaterial({color:'#e4bd58',emissive:'#624319',emissiveIntensity:.2,side:T.DoubleSide}),1.2,2.45,-.9);
 sign(gate,'FINISH',0,3.05,-1.55,2.2);
 const {hero,body,legs,arms}=explorerCharacter(scene);
 const coinGeo=new T.CylinderGeometry(.14,.14,.05,20).rotateX(Math.PI/2),coinObjects=new Map<string,T.Mesh>();
 for(const item of level.coins){const point=simulation.position(item),object=mesh(scene,coinGeo,gold,point.x,point.y,.1);object.name=item.id;coinObjects.set(item.id,object);}
 const starShape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,rad=i%2?.14:.31;if(i===0)starShape.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);else starShape.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}starShape.closePath();const starGeometry=new T.ExtrudeGeometry(starShape,{depth:.09,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1}),starObjects=new Map<string,T.Mesh>();
 for(const item of level.stars){const point=simulation.position(item),object=mesh(scene,starGeometry,gold,point.x,point.y,.11);object.name=item.id;starObjects.set(item.id,object);}
 const audio=createExplorerAudio({musicVolume:country.musicVolume??0,effectsVolume:country.effectsVolume??.35}),keys=new Set<string>();
 let dead=false,graphicsFailed=false,frame=0,previous=performance.now(),left=false,right=false,touchJump=false,finishedReported=false,lastStats='',lastProgress=-1,visualTime=0;
 const notify=()=>{const stats=simulation.stats(),json=JSON.stringify(stats);if(json!==lastStats){lastStats=json;callbacks.onStats?.(stats);}const progress=simulation.progress();if(progress!==lastProgress){lastProgress=progress;callbacks.onProgress(progress);}};
 const clear=()=>{keys.clear();left=right=touchJump=false;simulation.clearInput();};
 const control=(event:Event)=>{const {action,pressed}=(event as CustomEvent<{action:string;pressed:boolean}>).detail||{};if(action==='left')left=pressed;if(action==='right')right=pressed;if(action==='jump')touchJump=pressed;simulation.setInput({left:left||keys.has('ArrowLeft')||keys.has('KeyA'),right:right||keys.has('ArrowRight')||keys.has('KeyD'),jump:touchJump||keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')});};
 const isKey=(code:string)=>['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW'].includes(code);
 const keydown=(event:KeyboardEvent)=>{if(!isKey(event.code)||document.activeElement!==canvas)return;event.preventDefault();if(event.isTrusted)audio.unlock();keys.add(event.code);simulation.setInput({left:left||keys.has('ArrowLeft')||keys.has('KeyA'),right:right||keys.has('ArrowRight')||keys.has('KeyD'),jump:touchJump||keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')});};
 const keyup=(event:KeyboardEvent)=>{keys.delete(event.code);simulation.setInput({left:left||keys.has('ArrowLeft')||keys.has('KeyA'),right:right||keys.has('ArrowRight')||keys.has('KeyD'),jump:touchJump||keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')});};
 const unlock=(event:Event)=>{if(event.isTrusted)audio.unlock();};
 const graphicsFailure=(message:string)=>{if(dead||graphicsFailed)return;graphicsFailed=true;simulation.pause();clear();audio.pause();callbacks.onError?.(message);};
 const contextLost=(event:Event)=>{event.preventDefault();graphicsFailure('The 3D graphics connection was interrupted. Return to the country map and retry.');};
 canvas.addEventListener('webglcontextlost',contextLost);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);window.addEventListener('pointerdown',unlock,{passive:true});parent.addEventListener('explorer-input',control);
 const focus=()=>canvas.focus({preventScroll:true});canvas.addEventListener('pointerdown',focus);
 const resize=()=>{renderer.setSize(Math.max(1,parent.clientWidth),Math.max(1,parent.clientHeight),false);camera.aspect=Math.max(1,parent.clientWidth)/Math.max(1,parent.clientHeight);camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(parent);resize();const initial=cameraFrame(level,simulation.state.x,simulation.state.y,camera.aspect);camera.position.set(initial.x,initial.y,initial.z);camera.lookAt(initial.x,initial.lookY,-1);notify();
 const render=(dt:number)=>{
  const s=simulation.state;visualTime+=s.status==='paused'||s.status==='discovery'?0:dt;canvas.dataset.gameState=s.status;canvas.dataset.animation=s.animation;
  for(let i=0;i<platforms.length;i++){const p=simulation.platforms[i];platforms[i].root.position.set(p.x+p.width/2,p.y,0);}
  for(const item of level.coins){const point=simulation.position(item),object=coinObjects.get(item.id)!;object.visible=!simulation.collectedCoins.has(item.id);object.position.set(point.x,point.y,.1);object.rotation.y=reducedMotion?0:visualTime*2.4;}
  for(const item of level.stars){const point=simulation.position(item),object=starObjects.get(item.id)!;object.visible=!simulation.collectedStars.has(item.id);object.position.set(point.x,point.y+(reducedMotion?0:Math.sin(visualTime*2)*.07),.11);object.rotation.y=reducedMotion?0:visualTime*1.2;}
  hero.position.set(s.x,s.y,.2);hero.visible=s.invulnerable<=0||Math.floor(s.invulnerable*12)%2===0;
  body.rotation.y=T.MathUtils.damp(body.rotation.y,s.facing===1?1.15:-1.15,9,dt);body.rotation.z=T.MathUtils.damp(body.rotation.z,s.animation==='damage'?s.facing*.3:-s.vx*.01,12,dt);body.scale.y=T.MathUtils.damp(body.scale.y,s.animation==='land'?.91:1,14,dt);body.position.y=reducedMotion?0:s.animation==='celebrate'?Math.abs(Math.sin(visualTime*6))*.08:s.animation==='collect'?.06:s.grounded?Math.abs(Math.sin(visualTime*12))*.035*Math.min(1,Math.abs(s.vx)):0;
  for(let i=0;i<2;i++){const swing=Math.sin(visualTime*12+i*Math.PI)*.65*Math.min(1,Math.abs(s.vx)),air=s.animation==='jump'||s.animation==='fall';legs[i].rotation.x=air?i?-.5:.7:s.grounded?swing:.2;arms[i].rotation.x=s.animation==='celebrate'?0:air?-.5:-swing*.9;arms[i].rotation.z=s.animation==='celebrate'?(i?1:-1)*2.4:0;}
  const target=cameraFrame(level,s.x,s.y,camera.aspect),blend=1-Math.exp(-dt*4);
  if(reviewView==='overview'){const distance=(finish+18)/(2*Math.tan(T.MathUtils.degToRad(44)/2)*camera.aspect)+18;camera.far=Math.max(300,distance+200);camera.fov=44;camera.position.set(finish/2,19,distance);camera.lookAt(finish/2,1,-14);camera.updateProjectionMatrix();}
  else{camera.position.lerp(new T.Vector3(target.x,target.y,target.z),blend);camera.lookAt(camera.position.x,target.lookY,-1);const fov=!reducedMotion&&s.status==='discovery'?48:44;if(Math.abs(camera.fov-fov)>.02){camera.fov=T.MathUtils.damp(camera.fov,fov,3,dt);camera.updateProjectionMatrix();}}
  sun.position.set(s.x-8,18,12);sun.target.position.set(s.x,0,0);if(!reducedMotion){flag.tick(visualTime);portal.rotation.z=Math.sin(visualTime*.7)*.025;japan?.update(s.elapsedSeconds,dt);discoveryOrb.rotation.y=visualTime*.6;}
  renderer.render(scene,camera);
 };
 const loop=(stamp:number)=>{
  if(dead||graphicsFailed)return;
  try{
   const dt=Math.min(.25,Math.max(0,(stamp-previous)/1000));previous=stamp;
   const events=simulation.advance(dt);
   for(const event of events){
    if(event.type==='coin'||event.type==='star'||event.type==='damage'||event.type==='checkpoint'||event.type==='discovery'||event.type==='finish')audio.play(event.type);
    if(event.type==='checkpoint')for(const orb of checkpointObjects){const material=orb.material as T.MeshStandardMaterial;material.color.set('#d8efb4');material.emissive.set('#b4cf68');material.emissiveIntensity=.45;}
    if(event.type==='discovery'){clear();audio.pause();notify();if(callbacks.onDiscovery)callbacks.onDiscovery();else simulation.resume();}
    if(event.type==='failed'&&!finishedReported){finishedReported=true;clear();audio.pause();callbacks.onFail?.();}
    if(event.type==='finish'&&!finishedReported){finishedReported=true;clear();notify();callbacks.onFinish(simulation.state.coins,{stars:simulation.state.stars,elapsedMs:Math.round(simulation.state.elapsedSeconds*1000),discoveryFound:simulation.state.discoveryFound});}
   }
   notify();render(dt);performanceFrames++;if(stamp-performanceStart>=1000){callbacks.onPerformance?.({fps:Math.round(performanceFrames*1000/(stamp-performanceStart)),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});performanceStart=stamp;performanceFrames=0;}frame=requestAnimationFrame(loop);
  }catch(error){graphicsFailure(error instanceof Error?error.message:'The 3D scene could not continue. Please retry.');}
 };
 frame=requestAnimationFrame(loop);canvas.dataset.ready='true';callbacks.onReady();focus();
 return{pause(){simulation.pause();clear();audio.pause();},resume(){if(finishedReported||graphicsFailed)return;simulation.resume();clear();previous=performance.now();audio.resume();focus();},setReviewView(view:'gameplay'|'overview'){reviewView=view;clear();if(view==='overview'){simulation.pause();audio.pause();}else{simulation.resume();audio.resume();const position=cameraFrame(level,simulation.state.x,simulation.state.y,camera.aspect);camera.position.set(position.x,position.y,position.z);camera.far=190;focus();}render(0);},setPreferences(preferences:ExplorerRunPreferences){audio.setVolumes({musicVolume:preferences.musicVolume,effectsVolume:preferences.effectsVolume});if(preferences.reducedMotion!==undefined){reducedMotion=preferences.reducedMotion;japan?.setReducedMotion(reducedMotion);}},destroy(){if(dead)return;dead=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);window.removeEventListener('pointerdown',unlock);parent.removeEventListener('explorer-input',control);canvas.removeEventListener('pointerdown',focus);canvas.removeEventListener('webglcontextlost',contextLost);audio.dispose();flag.dispose();japan?.dispose();dispose(renderer,scene);}};
}
