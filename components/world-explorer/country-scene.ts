import * as T from 'three';
import {batchStatic,dispose,hash,island,matte,mesh,palettes,random,sign,skyMountains,stage,type Biome} from './scenic-kit';
import {countryLandmarks,countryPlatform,rainforestBridges} from './country-landmarks';
import {countryFlag} from './country-platforms';
import {countryProfile} from '../../lib/world-explorer/profiles';
import {countrySurface,groundAppearance,routeArchitecture,routeVegetation} from './route-scenery';
import {createExplorerCharacter} from './explorer-character';
import {createCollectibleBurst} from './japan-interactives';
import {woodenDeck} from './kit/wooden-deck';
import {skyEnvironment} from './kit/sky';
import {createGate,createPressurePlate,createSwingRopes} from './kit/mechanisms';
import {materialUpgradeQueue} from './kit/material-upgrade-queue';
import {mountCountryPuzzles} from './kit/country-puzzles';
import {createTimedHazard} from './kit/hazards';
import {levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {FIXED_STEP,LevelSimulation,cameraFrame,hazardAt,solidPlatform,windAt} from '../../lib/world-explorer/simulation';
import {cameraTrackingHeight} from '../../lib/world-explorer/game-camera';
import {explorerAssist} from '../../lib/world-explorer/difficulty';
import {createExplorerAudio} from '../../lib/world-explorer/audio';
import type {CountryCallbacks,ExplorerRunPreferences,PlatformDefinition,SimulationEvent,SimulationInput} from '../../lib/world-explorer/game-types';
import type {CountryEnvironment,EnvironmentContext} from './countries/types';
export type {CountryCallbacks} from '../../lib/world-explorer/game-types';

export type ExplorerCountry={code:string;name:string;continent:string;biome:Biome;lat:number;lng:number;iso2?:string;difficulty?:1|2|3|4}&ExplorerRunPreferences;
export type ExplorerPlatform={x:number;y:number;width:number;motion:'horizontal'|'vertical'|'pendulum'|null;amplitude:number;phase:number};
export type CountryCourse={platforms:ExplorerPlatform[];finish:number;gravity:number;jumpSpeed:number;runSpeed:number};

/** Legacy course consumers share the same validated manifests as gameplay. */
export function buildCountryCourse(country:{code:string;difficulty?:1|2|3|4},difficulty:1|2|3|4=country.difficulty??1):CountryCourse{
 const level=levelDefinitionFor(country.code,difficulty),last=level.platforms.find(p=>p.id===level.finish.platformId)!;
 return{platforms:level.platforms.map(p=>({...p})),finish:last.x+level.finish.offset,gravity:level.physics.gravity,jumpSpeed:level.physics.jumpSpeed,runSpeed:level.physics.runSpeed};
}

/** The wooden deck is a playable solid surface; its rails stay outside z=0. */
export function woodenPlatform(root:T.Group,definition:PlatformDefinition){woodenDeck(root,definition);}

function collectibleGlow(){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const radius=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;data[i]=255;data[i+1]=236;data[i+2]=163;data[i+3]=Math.round(Math.max(0,1-radius)**2*210);}
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;return texture;
}

/** One engine for every country. An authored level passes its lazily loaded
 * environment; without one, the seeded scenery preview is shown. Physics,
 * camera, collectibles, character and HUD signals are identical in both. */
export function mountCountryStage(parent:HTMLElement,country:ExplorerCountry,callbacks:CountryCallbacks,environment:CountryEnvironment|null=null){
 const profile=countryProfile(country.code);if(!profile)throw new Error('This country does not have a verified place profile. Please choose another country.');
 // Explorer assist keeps the route and gentles its timing (see difficulty.ts).
 const designed=levelDefinitionFor(country.code,country.difficulty??1),level=country.explorerAssist?explorerAssist(designed):designed,simulation=new LevelSimulation(level),biome=country.code==='ANTARCTICA'?'alpine':profile.biome,palette=palettes[biome]||palettes.temperate;
 const authored=environment!==null;
 const {renderer,scene,sun}=stage(parent,palette.sky),canvas=renderer.domElement;canvas.tabIndex=0;
 let reducedMotion=country.reducedMotion??false;
 const low=country.graphicsQuality==='low';
 if(low){renderer.setPixelRatio(Math.min(window.devicePixelRatio,1));renderer.shadowMap.enabled=false;}
 canvas.setAttribute('aria-label',`${country.name}, ${level.title}. Arrow keys or A and D to move. Space to jump. Three lives and three optional stars.`);
 canvas.dataset.countryCode=country.code;canvas.dataset.levelId=level.id;canvas.dataset.landmarkName=profile.landmarkName;canvas.dataset.landmarkKind=profile.landmarkKind;canvas.dataset.representation='stylized';canvas.dataset.developmentStage=authored?'prototype':'preview';canvas.dataset.environment=environment?.id||'preview';
 const camera=new T.PerspectiveCamera(44,1,.1,190),r=random(hash(country.code)),finish=simulation.position(level.finish).x;
 const context:EnvironmentContext={scene,renderer,level,finish,low,reducedMotion};
 let reviewView:'gameplay'|'overview'|'scan'|'camera'='gameplay',scanX=0,scanY:number|undefined,performanceStart=performance.now(),performanceFrames=0;
 // Review playthroughs: with ?review=1&autoplay=1 the run waits at its start
 // until an input script arrives, then replays it one fixed step at a time,
 // so the in-page run follows the analysed route exactly. Events are tallied.
 const holdForAutoplay=new URLSearchParams(window.location.search).get('review')==='1'&&new URLSearchParams(window.location.search).get('autoplay')==='1',reviewTally:Record<string,number>={};
 let autoplay:{inputs:SimulationInput[];index:number;carry:number}|null=null;
 // Review-only: an explicit camera for landmark captures, and recent frame
 // times so a capture can report average FPS and 1% lows, not only a counter.
 let reviewCamera:{position:[number,number,number];target:[number,number,number];fov?:number}|null=null;const frameTimes:number[]=[];
 const groundAt=(x:number)=>{const under=level.platforms.filter(p=>p.route!=='upper'&&x>=p.x-.5&&x<=p.x+p.width+.5);return under.length?Math.max(...under.map(p=>p.y+(p.slope||0)*Math.max(0,Math.min(1,(x-p.x)/p.width)))):level.platforms.reduce((best,p)=>Math.abs(p.x+p.width/2-x)<Math.abs(best.x+best.width/2-x)?p:best).y;};
 const platforms=level.platforms.map((p,i)=>{
  const root=island(scene,p.x+p.width/2,p.y,p.width,p.depth,biome,i+hash(country.code),p.thickness);
  if(environment)environment.dressPlatform(root,p,context);
  else{countryPlatform(root,country.code,p.width,i,profile);countrySurface(root,profile);routeArchitecture(root,profile,p.width,i);if(p.type!=='stone')woodenDeck(root,p);}
  root.name='playable-'+p.id;return{...p,root};
 });
 const scenery=environment?environment.mount(context):null;
 let reflections:T.WebGLRenderTarget|null=null;
 if(environment&&scenery){
  const light=environment.lighting;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,low?1:light.pixelRatio??1.25));
  renderer.toneMappingExposure=light.exposure;sun.intensity=light.sunIntensity;sun.color.set(light.sun);
  for(const object of scene.children){if(object instanceof T.HemisphereLight){object.intensity=light.hemisphere;object.color.set(light.sky);object.groundColor.set(light.ground);}else if(object instanceof T.DirectionalLight&&object!==sun&&light.rim){object.color.set(light.rim);object.intensity=light.rimIntensity??.75;}}
  sun.shadow.mapSize.set(low?512:1024,low?512:1024);
  if(light.reflections&&!low){reflections=skyEnvironment(renderer,light.reflections);scene.environment=reflections.texture;scene.environmentIntensity=light.reflections.intensity;}
  scenery.setView?.('gameplay');
 }
 if(!authored){
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
 for(const checkpoint of level.checkpoints){const position=simulation.position(checkpoint),marker=new T.Group();marker.name=checkpoint.id;marker.position.set(position.x,position.y,-.9);scene.add(marker);environment?.decorateCheckpoint(marker,context);mesh(marker,new T.CylinderGeometry(.035,.045,1.3,8),matte('#8c593f'),0,.65,0);const orb=mesh(marker,new T.SphereGeometry(.17,14,10),new T.MeshStandardMaterial({color:'#a9c0b0',emissive:'#789c82',emissiveIntensity:.18}),0,1.4,0);checkpointObjects.push(orb);}
 const discoveryPosition=simulation.position(level.discovery),discoveryRoot=new T.Group();discoveryRoot.position.set(discoveryPosition.x,discoveryPosition.y,-.95);discoveryRoot.name='discovery-point';scene.add(discoveryRoot);mesh(discoveryRoot,new T.CylinderGeometry(.25,.35,.5,10),matte('#bcb39a'),0,.25,0);const discoveryOrb=mesh(discoveryRoot,new T.OctahedronGeometry(.23),new T.MeshStandardMaterial({color:'#bcebe1',emissive:'#5abfac',emissiveIntensity:.45}),0,1.03,0);
 discoveryRoot.visible=!authored;
 const enemies=new Map((environment?level.enemies||[]:[]).map(enemy=>{
  const visual=environment!.createEnemy(scene);
  const modelHeight=Number(visual.root.userData.height)||1.06;
  if(enemy.height)visual.root.scale.setScalar(enemy.height/modelHeight);
  return[enemy.id,visual] as const;
 }));
 const blocks=new Map<string,{object:T.Group;baseY:number;bounceAt:number}>((environment?level.discoveryBlocks||[]:[]).map(block=>{const object=environment!.createDiscoveryBlock(scene,block.width,block.height);object.position.set(block.x,block.y-block.height/2,0);return[block.id,{object,baseY:object.position.y,bounceAt:-10}] as const;}));
 // Shared mechanisms: gate slabs, pressure plates and pendulum ropes follow
 // the simulation; a country may supply its own stone palette and rope colour.
 const gates=new Map((level.gates||[]).map(gate=>{const visual=createGate(scene,gate.width,gate.height,environment?.mechanisms);visual.root.position.set(gate.x+gate.width/2,gate.y,0);visual.root.name='gate-'+gate.id;return[gate.id,visual] as const;}));
 const plates=(level.switches||[]).map(plate=>{const visual=createPressurePlate(scene,environment?.mechanisms),point=simulation.position(plate);visual.root.position.set(point.x,point.y,0);visual.root.name='switch-'+plate.id;return{plate,visual};});
 const countryPuzzles=mountCountryPuzzles(scene,simulation);
 const swings=level.platforms.flatMap((p,i)=>p.motion==='pendulum'?[{index:i,length:p.length||4,ropes:createSwingRopes(scene,environment?.ropeColor||'#6b5034')}]:[]);
 // Timed hazards (geysers, surges, calving ice) show their warning and eruption.
 const timedHazards=level.hazards.filter(hazard=>hazard.cycle).map(hazard=>({hazard,visual:createTimedHazard(scene,hazard,environment?.hazardPalette)}));
 const bursts:{effect:ReturnType<typeof createCollectibleBurst>;born:number}[]=[];
 for(const p of platforms)batchStatic(p.root);
 // Materials that change after mounting (photographic surface maps arriving
 // late) are prepared on stand-ins first: shallow clones of the meshes that
 // use them, compiled with this scene's lights, fog and environment, so the live swap
 // reuses finished programs and play never waits for a shader. The stand-ins'
 // materials are never disposed, which keeps those programs alive until the
 // renderer itself is disposed.
 let started=false;
 const upgrades=materialUpgradeQueue(()=>!started||simulation.state.status!=='playing',state=>{canvas.dataset.materialUpgrades=state;});
 scene.userData.prepareMaterials=(changes:{object:T.Mesh;material:T.Material}[])=>upgrades.prepare(async()=>{
  if(dead)throw new Error('The stage has closed.');
  const staging=new T.Scene();
  // A shallow clone keeps everything that shapes the program: instancing,
  // per-instance colours, morph data and the geometry's attributes.
  for(const {object,material} of changes){const standIn=object.clone(false) as T.Mesh;standIn.material=material;staging.add(standIn);}
  // Upload candidate textures while safe as well as compiling their programs.
  const textures=new Set<T.Texture>();for(const {material}of changes)for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);for(const texture of textures)renderer.initTexture(texture);
  await renderer.compileAsync(staging,camera,scene);
  if(dead)throw new Error('The stage has closed.');
 });
 let surfacesApplied=()=>{};const surfaces=new Promise<void>(resolve=>{surfacesApplied=resolve;});
 const finalized=scenery?.finalize?.(scene,()=>{canvas.dataset.surfaceDetail='natural-rock-pbr';surfacesApplied();})||null;
 if(!scenery?.finalize)surfacesApplied();
 const flag=countryFlag(scene,country.iso2,country.code==='ANTARCTICA');canvas.dataset.flagType=country.code==='ANTARCTICA'?'expedition':'national';
 const end=simulation.position(level.finish),gate=new T.Group();gate.position.set(end.x,end.y,0);gate.name='level-finish';scene.add(gate);
 environment?.decorateFinish(gate,context);
 const portal=mesh(gate,new T.TorusGeometry(1.08,.1,12,48),gold,0,1.24,-.25);mesh(gate,new T.CylinderGeometry(1.3,1.45,.12,32),matte('#acaa98'),0,.015,0);
 mesh(gate,new T.CylinderGeometry(.028,.036,2.6,8),matte('#8c593f'),1.2,1.3,-.9);const bannerShape=new T.Shape();bannerShape.moveTo(0,0);bannerShape.lineTo(.85,-.15);bannerShape.lineTo(0,-.45);bannerShape.closePath();mesh(gate,new T.ShapeGeometry(bannerShape),new T.MeshStandardMaterial({color:'#e4bd58',emissive:'#624319',emissiveIntensity:.2,side:T.DoubleSide}),1.2,2.45,-.9);
 sign(gate,'FINISH',0,3.05,-1.55,2.2);
 const {hero,body,legs,arms}=createExplorerCharacter(scene);
 if(authored)hero.scale.setScalar(level.physics.playerHeight/1.59);
 const coinRadius=authored ? .24 : .14,coinGeo=new T.CylinderGeometry(coinRadius,coinRadius,.07,28).rotateX(Math.PI/2),coinObjects=new Map<string,T.Mesh>();
 const collectibleGold=new T.MeshStandardMaterial({color:'#ffcd35',emissive:'#dc9b16',emissiveIntensity:.5,roughness:.22,metalness:.5});
 for(const item of level.coins){const point=simulation.position(item),object=mesh(scene,coinGeo,collectibleGold,point.x,point.y,.1);object.name=item.id;if(authored){mesh(object,new T.TorusGeometry(.183,.017,5,24),collectibleGold,0,0,.043);mesh(object,new T.BoxGeometry(.033,.23,.018),collectibleGold,0,0,.05);}coinObjects.set(item.id,object);}
 const starShape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,rad=i%2?(authored?.2:.14):(authored?.45:.31);if(i===0)starShape.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);else starShape.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}starShape.closePath();const starGeometry=new T.ExtrudeGeometry(starShape,{depth:.1,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1}),starObjects=new Map<string,T.Mesh>(),starHalos=new Map<string,T.Mesh>();
 const haloMaterial=new T.MeshBasicMaterial({map:collectibleGlow(),transparent:true,depthWrite:false,toneMapped:false,color:'#ffd44e',side:T.DoubleSide,opacity:.65});
 for(const item of level.stars){const point=simulation.position(item),object=mesh(scene,starGeometry,collectibleGold,point.x,point.y,.11);object.name=item.id;starObjects.set(item.id,object);if(authored){const halo=mesh(scene,new T.PlaneGeometry(2.1,2.1),haloMaterial,point.x,point.y,-.08);halo.castShadow=false;starHalos.set(item.id,halo);}}
 const audio=createExplorerAudio({musicVolume:country.musicVolume??0,effectsVolume:country.effectsVolume??.35}),keys=new Set<string>();
 let dead=false,graphicsFailed=false,frame=0,previous=performance.now(),left=false,right=false,touchJump=false,touchInteract=false,finishedReported=false,lastStats='',lastProgress=-1,visualTime=0;
 const notify=()=>{const stats=simulation.stats(),json=JSON.stringify(stats);if(json!==lastStats){lastStats=json;callbacks.onStats?.(stats);}const progress=simulation.progress();if(progress!==lastProgress){lastProgress=progress;callbacks.onProgress(progress);}};
 const clear=()=>{keys.clear();left=right=touchJump=touchInteract=false;simulation.clearInput();};
 const control=(event:Event)=>{const {action,pressed}=(event as CustomEvent<{action:string;pressed:boolean}>).detail||{};if(action==='left')left=pressed;if(action==='right')right=pressed;if(action==='jump')touchJump=pressed;if(action==='interact')touchInteract=pressed;simulation.setInput({left:left||keys.has('ArrowLeft')||keys.has('KeyA'),right:right||keys.has('ArrowRight')||keys.has('KeyD'),jump:touchJump||keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW'),interact:touchInteract||keys.has('KeyE')});};
 const isKey=(code:string)=>['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyE'].includes(code);
 const keydown=(event:KeyboardEvent)=>{if(!isKey(event.code)||document.activeElement!==canvas)return;event.preventDefault();if(event.isTrusted)audio.unlock();keys.add(event.code);simulation.setInput({left:left||keys.has('ArrowLeft')||keys.has('KeyA'),right:right||keys.has('ArrowRight')||keys.has('KeyD'),jump:touchJump||keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW'),interact:touchInteract||keys.has('KeyE')});};
 const keyup=(event:KeyboardEvent)=>{keys.delete(event.code);simulation.setInput({left:left||keys.has('ArrowLeft')||keys.has('KeyA'),right:right||keys.has('ArrowRight')||keys.has('KeyD'),jump:touchJump||keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW'),interact:touchInteract||keys.has('KeyE')});};
 const unlock=(event:Event)=>{if(event.isTrusted)audio.unlock();};
 const graphicsFailure=(message:string)=>{if(dead||graphicsFailed)return;graphicsFailed=true;simulation.pause();clear();audio.pause();callbacks.onError?.(message);};
 const contextLost=(event:Event)=>{event.preventDefault();graphicsFailure('The 3D graphics connection was interrupted. Return to the country map and retry.');};
 canvas.addEventListener('webglcontextlost',contextLost);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);window.addEventListener('pointerdown',unlock,{passive:true});parent.addEventListener('explorer-input',control);
 const focus=()=>canvas.focus({preventScroll:true});canvas.addEventListener('pointerdown',focus);
 const resize=()=>{renderer.setSize(Math.max(1,parent.clientWidth),Math.max(1,parent.clientHeight),false);camera.aspect=Math.max(1,parent.clientWidth)/Math.max(1,parent.clientHeight);camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(parent);resize();const initial=cameraFrame(level,simulation.state.x,simulation.state.y,camera.aspect);camera.position.set(initial.x,initial.y,initial.z);camera.lookAt(initial.x,initial.lookY,-1);notify();
 const zones=level.zones||[];
 let cameraGroundY=simulation.state.y,cameraLookY=initial.lookY;
 const render=(dt:number)=>{
  const s=simulation.state;visualTime+=s.status==='paused'||s.status==='discovery'?0:dt;canvas.dataset.gameState=s.status;canvas.dataset.animation=s.animation;
  for(let i=0;i<platforms.length;i++){
   const p=simulation.platforms[i],root=platforms[i].root,shake=p.collapsePhase==='shaking'&&!reducedMotion?Math.sin(visualTime*70)*.045:0;
   root.position.set(p.x+p.width/2+shake,p.y,0);root.visible=!!p.raise||solidPlatform(p)||p.collapsePhase==='falling';root.rotation.z=p.collapsePhase==='falling'?-(p.drop||0)*.04:0;
  }
  for(const swing of swings){const p=simulation.platforms[swing.index];swing.ropes.update(p.baseX+p.width/2,p.baseY+swing.length,p.x+p.width/2,p.y+.05);}
  for(const {hazard,visual} of timedHazards){const at=hazardAt(hazard,s.elapsedSeconds);visual.update(at.phase,reducedMotion&&at.phase!=='calm'?1:at.strength,reducedMotion?0:visualTime);}
  countryPuzzles.update(visualTime);
  for(const gate of simulation.gates){const visual=gates.get(gate.id);visual?.update(gate.open,gate.timer>0&&gate.timer<1.5,visualTime);}
  for(const {plate,visual} of plates){const point=simulation.position(plate),pressed=s.grounded&&s.standing===plate.platformId&&Math.abs(s.x-point.x)<.75;visual.root.position.set(point.x,point.y,0);visual.update(pressed,plate.gateIds.some(id=>(simulation.gates.find(gate=>gate.id===id)?.timer||0)>0));}
  for(const item of level.coins){const point=simulation.position(item),object=coinObjects.get(item.id)!;object.visible=!simulation.collectedCoins.has(item.id);object.position.set(point.x,point.y,.1);object.rotation.y=reducedMotion?0:visualTime*1.8+(hash(item.id)%100)*.035;}
  for(const item of level.stars){const point=simulation.position(item),object=starObjects.get(item.id)!;object.visible=!simulation.collectedStars.has(item.id);object.position.set(point.x,point.y+(reducedMotion?0:Math.sin(visualTime*2)*.07),.11);object.rotation.y=reducedMotion?0:authored?Math.sin(visualTime*.7)*.3:visualTime*1.2;}
  for(const [id,halo] of starHalos){const star=starObjects.get(id)!;halo.visible=star.visible;halo.position.set(star.position.x,star.position.y,-.08);halo.scale.setScalar(reducedMotion?1:1+Math.sin(visualTime*2)*.05);}
  for(const enemy of simulation.enemies){const object=enemies.get(enemy.id);if(object){object.root.position.set(enemy.x,enemy.y,.1);object.update(reducedMotion?0:visualTime,enemy.direction,enemy.state);}}
  for(const [id,block] of blocks){const age=visualTime-block.bounceAt;block.object.position.y=block.baseY+(!reducedMotion&&age<.3?Math.sin(age/.3*Math.PI)*.16:0);block.object.userData.activated=simulation.activatedBlocks.has(id);}
  for(let i=bursts.length-1;i>=0;i--)if(!bursts[i].effect.update(visualTime-bursts[i].born)){bursts[i].effect.dispose();bursts.splice(i,1);}
  hero.position.set(s.x,s.y,.2);hero.visible=s.invulnerable<=0||Math.floor(s.invulnerable*12)%2===0;
  body.rotation.y=T.MathUtils.damp(body.rotation.y,s.facing===1?1.15:-1.15,9,dt);body.rotation.z=T.MathUtils.damp(body.rotation.z,s.animation==='damage'?s.facing*.3:-s.vx*.01,12,dt);body.scale.y=T.MathUtils.damp(body.scale.y,s.animation==='land'?.91:1,14,dt);body.position.y=reducedMotion?0:s.animation==='celebrate'?Math.abs(Math.sin(visualTime*6))*.08:s.animation==='collect'?.06:s.grounded?Math.abs(Math.sin(visualTime*12))*.035*Math.min(1,Math.abs(s.vx)):0;
  for(let i=0;i<2;i++){const swing=Math.sin(visualTime*12+i*Math.PI)*.65*Math.min(1,Math.abs(s.vx)),air=s.animation==='jump'||s.animation==='fall',climb=s.animation==='climb'?Math.sin(visualTime*10+i*Math.PI):0;legs[i].rotation.x=s.animation==='climb'?climb*.6:air?i?-.5:.7:s.grounded?swing:.2;arms[i].rotation.x=s.animation==='climb'?-2.5+climb*.5:s.animation==='celebrate'?0:air?-.5:-swing*.9;arms[i].rotation.z=s.animation==='celebrate'?(i?1:-1)*2.4:0;}
  // A normal jump does not drag the horizon up and down. Follow newly landed
  // terraces and long falls; the camera itself eases into the new elevation.
  cameraGroundY=cameraTrackingHeight(cameraGroundY,s.y,s.grounded||s.status==='respawning');
  const target=cameraFrame(level,s.x,level.countryId==='JP'||level.camera?.distance?cameraGroundY:s.y,camera.aspect),blend=1-Math.exp(-dt*4);
 if(reviewView==='scan'){const frame=cameraFrame(level,scanX,scanY??groundAt(scanX),camera.aspect);camera.position.set(frame.x,frame.y,frame.z);camera.lookAt(frame.x,frame.lookY,-1);}
  else if(reviewView==='camera'&&reviewCamera){camera.far=600;camera.fov=reviewCamera.fov??44;camera.position.set(...reviewCamera.position);camera.lookAt(...reviewCamera.target);camera.updateProjectionMatrix();}
  else if(reviewView==='overview'){const distance=(finish+18)/(2*Math.tan(T.MathUtils.degToRad(44)/2)*camera.aspect)+18;camera.far=Math.max(300,distance+200);camera.fov=44;camera.position.set(finish/2,19,distance);camera.lookAt(finish/2,1,-14);camera.updateProjectionMatrix();}
  else{camera.position.lerp(new T.Vector3(target.x,target.y,target.z),blend);cameraLookY=T.MathUtils.lerp(cameraLookY,target.lookY,blend);camera.lookAt(camera.position.x,cameraLookY,-1);const fov=44;if(Math.abs(camera.fov-fov)>.02){camera.fov=T.MathUtils.damp(camera.fov,fov,3,dt);camera.updateProjectionMatrix();}}
  scenery?.frame(camera.position.x);sun.position.set(s.x-8,18,12);sun.target.position.set(s.x,0,0);
  scenery?.update(s.elapsedSeconds,dt,{time:visualTime,platforms:simulation.platforms,wind:zones.map(zone=>({id:zone.id,force:zone.force,...windAt(zone,s.elapsedSeconds)})),playerX:s.x});
  if(!reducedMotion){flag.tick(visualTime);portal.rotation.z=Math.sin(visualTime*.7)*.025;discoveryOrb.rotation.y=visualTime*.6;}
  renderer.render(scene,camera);
 };
 const replay=(dt:number)=>{
  const run=autoplay!,out:SimulationEvent[]=[];if(run.index>=run.inputs.length)return simulation.advance(dt);
  run.carry=Math.min(.25,run.carry+dt);
  while(run.carry+1e-9>=FIXED_STEP&&run.index<run.inputs.length){
   if(['paused','discovery','completed','failed'].includes(simulation.state.status)){run.carry=0;break;}
   run.carry-=FIXED_STEP;simulation.setInput(run.inputs[run.index++]);out.push(...simulation.advance(FIXED_STEP));
   if(out.some(event=>event.type==='discovery'||event.type==='finish'||event.type==='failed'))break;
  }
  return out;
 };
 const loop=(stamp:number)=>{
  if(dead||graphicsFailed)return;
  try{
   const dt=Math.min(.25,Math.max(0,(stamp-previous)/1000));previous=stamp;
   const events=autoplay?replay(dt):holdForAutoplay?[]:simulation.advance(dt);for(const event of events)reviewTally[event.type]=(reviewTally[event.type]||0)+1;
   for(const event of events){
    if(event.type==='coin'||event.type==='star'||event.type==='block'){
     const item=event.type==='coin'?level.coins.find(item=>item.id===event.id):event.type==='star'?level.stars.find(item=>item.id===event.id):undefined;
     const point=item?simulation.position(item):level.discoveryBlocks?.find(block=>block.id===event.id);if(point&&authored&&!reducedMotion)bursts.push({effect:createCollectibleBurst(scene,point.x,point.y,.2),born:visualTime});
     if(event.type==='block'){const block=blocks.get(event.id||'');if(block)block.bounceAt=visualTime;audio.play('checkpoint');}
    }
    if(event.type==='switch'||event.type==='gate-open'||event.type==='raise')audio.play('checkpoint');
    if(event.type==='hazard-warning'){const hazard=level.hazards.find(item=>item.id===event.id);if(hazard&&Math.abs(simulation.state.x-(hazard.x+hazard.width/2))<14)audio.play('wind');}
    if(event.type==='gate-closing'||event.type==='collapse')audio.play('wind');
    if(event.type==='wind-warning'){const zone=zones.find(zone=>zone.id===event.id);if(zone&&Math.abs(simulation.state.x-(zone.x+zone.width/2))<zone.width/2+16)audio.play('wind');}
    if(event.type==='coin'||event.type==='star'||event.type==='damage'||event.type==='checkpoint'||event.type==='discovery'||event.type==='finish')audio.play(event.type);
    if(event.type==='checkpoint')for(const orb of checkpointObjects){if(orb.parent?.name!==event.id)continue;const material=orb.material as T.MeshStandardMaterial;material.color.set('#d8efb4');material.emissive.set('#b4cf68');material.emissiveIntensity=.45;}
    if(event.type==='discovery'){clear();audio.pause();notify();if(callbacks.onDiscovery)callbacks.onDiscovery();else simulation.resume();}
    if(event.type==='failed'&&!finishedReported){finishedReported=true;clear();audio.pause();callbacks.onFail?.();}
    if(event.type==='finish'&&!finishedReported){finishedReported=true;clear();notify();callbacks.onFinish(simulation.state.coins,{stars:simulation.state.stars,elapsedMs:Math.round(simulation.state.elapsedSeconds*1000),discoveryFound:simulation.state.discoveryFound});}
   }
   void upgrades.flush();notify();render(dt);performanceFrames++;frameTimes.push(dt*1000);if(frameTimes.length>1200)frameTimes.shift();if(stamp-performanceStart>=1000){callbacks.onPerformance?.({fps:Math.round(performanceFrames*1000/(stamp-performanceStart)),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});performanceStart=stamp;performanceFrames=0;}frame=requestAnimationFrame(loop);
  }catch(error){graphicsFailure(error instanceof Error?error.message:'The 3D scene could not continue. Please retry.');}
 };
 // Prepare every shader program before play starts: wait for the photographic
 // surface maps (they change their materials' programs), link all programs in
 // parallel, then draw once so the shadow pass compiles too. A program first
 // needed mid-play (an object hidden or off screen at the start) otherwise
 // blocks a frame for hundreds of milliseconds on a cold browser. A slow device
 // never holds the start back.
 const start=()=>{if(started||dead)return;started=true;try{renderer.render(scene,camera);}catch{/* the loop reports graphics failures */}previous=performance.now();frame=requestAnimationFrame(loop);canvas.dataset.ready='true';callbacks.onReady();focus();};
 // A coin's sparkle burst is created on pickup and disposed after it; one
 // hidden sample keeps its program compiled and alive for the whole run.
 if(authored&&!reducedMotion){const sample=createCollectibleBurst(scene,0,-50,0);sample.root.visible=false;sample.root.name='collectible-burst-shader-sample';}
 const prepare=async()=>{await Promise.race([surfaces,new Promise(resolve=>setTimeout(resolve,3000))]);if(!dead)await renderer.compileAsync(scene,camera);};
 prepare().then(start,start);setTimeout(start,6000);
 return{autoplay(inputs:SimulationInput[]){autoplay={inputs,index:0,carry:0};clear();focus();},reviewState(){const s=simulation.state;return{...simulation.stats(),status:s.status,x:s.x,y:s.y,standing:s.standing,lightPuzzles:simulation.lightPuzzles.map(p=>({...p})),waterBasins:(level.waterBasins||[]).map(b=>({id:b.id,y:simulation.waterSurface(b.id)})),elapsed:s.elapsedSeconds,discoveryFound:s.discoveryFound,coinIds:[...simulation.collectedCoins].sort(),starIds:[...simulation.collectedStars].sort(),autoplayIndex:autoplay?.index??0,autoplayLength:autoplay?.inputs.length??0,tally:{...reviewTally}};},pause(){simulation.pause();clear();audio.pause();},resume(){if(finishedReported||graphicsFailed)return;simulation.resume();clear();previous=performance.now();audio.resume();focus();},reviewStats(){const memory=renderer.info.memory;return{frameTimes:[...frameTimes],calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:memory.geometries,textures:memory.textures};},setReviewCamera(view:{position:[number,number,number];target:[number,number,number];fov?:number}){reviewCamera=view;reviewView='camera';clear();scenery?.setView?.('gameplay');simulation.pause();audio.pause();render(0);},setReviewView(view:'gameplay'|'overview'|'scan',x=0,y?:number){reviewView=view;scanX=x;scanY=y;clear();scenery?.setView?.(view==='overview'?'overview':'gameplay');if(view!=='gameplay'){simulation.pause();audio.pause();}else{simulation.resume();audio.resume();const position=cameraFrame(level,simulation.state.x,simulation.state.y,camera.aspect);camera.position.set(position.x,position.y,position.z);cameraLookY=position.lookY;cameraGroundY=simulation.state.y;camera.far=190;camera.updateProjectionMatrix();focus();}render(0);},setPreferences(preferences:ExplorerRunPreferences){audio.setVolumes({musicVolume:preferences.musicVolume,effectsVolume:preferences.effectsVolume});if(preferences.reducedMotion!==undefined){reducedMotion=preferences.reducedMotion;context.reducedMotion=reducedMotion;scenery?.setReducedMotion(reducedMotion);}},destroy(){if(dead)return;dead=true;upgrades.dispose();cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);window.removeEventListener('pointerdown',unlock);parent.removeEventListener('explorer-input',control);canvas.removeEventListener('pointerdown',focus);canvas.removeEventListener('webglcontextlost',contextLost);bursts.forEach(burst=>burst.effect.dispose());haloMaterial.map?.dispose();haloMaterial.dispose();audio.dispose();flag.dispose();finalized?.dispose();scenery?.dispose();scene.environment=null;reflections?.dispose();dispose(renderer,scene);}};
}
