import {keyboardAction,readInput,queueAction,type InputState} from './controls';
export type {InputState} from './controls';
import {freshGuard,raiseGuard,guardActive,enemyTuning,enemyTracks,projectileAim,stepEnemy} from './challenge';
import * as T from 'three';
import {freshLife,loseHeart} from './attempt-life';
import {characterRig} from './character-rig';
import {rockDetail} from './rock-detail';
import {biomeDetails} from './biome-details';
import {clayMaterial,mushroomCrownHeight,createStage,terrainMaterials,island,deck,tree,bridge,mushroom,pipe,castle,mesh,box,cylinder,link,material,disposeStage} from './scene-3d';
import {worldScenery} from './world-scenery';
import {type Course,type Platform,GRAVITY,JUMP_SPEED,horizontalVelocity,regionAt} from './levels';
import {surfaceY} from './terrain';
import {landingHeight,landingBottom,safeRespawn} from './landing-geometry';
import {emptyLoadout,type RunLoadout} from './wardrobe';
import {freshPowers,collectPower,canCollectPower,takeHit,activeTechnique,powerNames,type PowerKind} from './powers';
import {weaponFor} from './combat';
import type {GameSound} from './audio';
import type {AvatarAppearance} from '../../lib/game-room';
export type WorldState={hearts:number;region:string;cooldown:number;defeated:number;shield:boolean;skyJump:number;rapid:number;nimbus:number;saiyan:number;special:string;specialSeconds:number;notice:string;guarding:boolean;guardCooldown:number;blockedShots:number};

export type GameController={pause:()=>void;resume:()=>void;destroy:()=>void};
type Landing={base:Platform;at:Platform;object:T.Group;dx:number;dy:number};
const top=landingHeight;
export function mountGame(parent:HTMLElement,course:Course,avatar:string,input:InputState,onCoins:(count:number)=>void,onEnd:(cause:'fall'|'hazard'|'enemy'|'complete',coins:number)=>void,onPause:()=>void,onReady:(controller:GameController)=>void,onProgress:(percent:number)=>void,onWorld:(state:WorldState)=>void,loadout:RunLoadout=emptyLoadout,onSound:(sound:GameSound)=>void=()=>{},startX=90,appearance:AvatarAppearance|null=null){
 const {scene,renderer,sun}=createStage(),world=course.number;parent.appendChild(renderer.domElement);const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D game. Left and right move, Up or Space jumps, Down crouches, climbs or enters pipes. X uses power. C or Shift defends against shots.');canvas.style.cssText='display:block;width:100%;height:100%;outline:none';
 const camera=new T.PerspectiveCamera(43,1,.1,210),env=worldScenery(scene,course),mats=terrainMaterials(world),land:T.Group=new T.Group();scene.add(land);
 const hanging:{rope:T.Mesh;anchor:T.Vector3;landing:Platform;offset:number}[]=[];
 const platforms:Landing[]=[...course.platforms,...course.ledges].map((p,i)=>{let object:T.Group;if(p.kind==='deck'||p.kind==='bamboo'||p.kind==='bridge'){object=deck(land,p,p.kind==='bamboo');if(p.kind==='bridge'){object.clear();bridge(object,0,p.width/100,-p.y/100);}
  if(p.kind==='deck'){
   // One ancient trunk anchors the entrance; the scenery forest supports the
   // remaining decks without planting a screen-filling tree at every ledge.
   if(p===course.platforms.find(platform=>platform.kind==='deck'))tree(land,p.x/100-1,-16,-6.5,30-p.y/100);
   for(const zz of [-.95,.95])for(const sign of [-1,1])link(object,new T.Vector3(p.width/200,-p.y/100-1.2,zz),new T.Vector3(p.width/200+sign*Math.min(1,p.width/230),-p.y/100-.22,zz),.095,'#8c714d');
  }
  if(p.motion==='swing'){for(const x of [p.x+30,p.x+p.width-30]){const anchor=new T.Vector3(x/100,-p.y/100+4,-.65),rope=link(land,anchor,new T.Vector3(x/100,-p.y/100,-.65),.025,'#bba779');hanging.push({rope,anchor,landing:p,offset:x-p.x});}link(land,new T.Vector3((p.x+15)/100,-p.y/100+4,-.65),new T.Vector3((p.x+p.width-15)/100,-p.y/100+4,-.65),.07,'#6e5d44');link(land,new T.Vector3((p.x+p.width/2)/100,-p.y/100+3.8,-3),new T.Vector3((p.x+p.width/2)/100,-p.y/100+4,-.65),.1,'#6e5d44');}
  }else if(p.kind==='brick'){
  object=new T.Group();object.position.x=p.x/100;land.add(object);
  const w=p.width/100,n=Math.ceil(w/.48),bw=w/n-.015,bevel=.012,shape=new T.Shape();shape.moveTo(-bw/2+bevel,-.113);shape.lineTo(bw/2-bevel,-.113);shape.lineTo(bw/2-bevel,.113);shape.lineTo(-bw/2+bevel,.113);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:1.776,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1});geometry.translate(0,0,-.888);
  const clay=[clayMaterial('#de8a4f'),clayMaterial('#cc7842')];
  for(let j=0;j<n;j++)for(let row=0;row<2;row++)mesh(geometry,clay[(j+row)%2],object,(j+.5)*w/n,-p.y/100-.125-row*.25,0);
 }
 else if(p.kind==='mushroom'){object=new T.Group();object.position.x=p.x/100;land.add(object);const cap=mushroom(object,p.width/200,-p.y/100-mushroomCrownHeight*1.35,0,1.35);cap.scale.x=p.width/164;}
 else object=island(land,p,world,mats,i+1,world===1&&course.platforms.includes(p),landingBottom(course,p));
 return{base:p,at:{...p,profileX:p.x},object,dx:0,dy:0};});
 const stopRockDetail=rockDetail(land,platforms.filter(p=>p.base.kind==='rock'),course);
 biomeDetails(scene,course);
 // Landmarks belong to the terrain, and occupy the same world coordinates as collisions.
 const pipes:{x:number;y:number;object:T.Group}[]=[],springs:{x:number;y:number}[]=[],ladders:{x:number;bottom:number;roof:number}[]=[],checkpoints:{x:number;y:number;object:T.Group;active:boolean}[]=[];
 for(let i=0;i<course.platforms.length;i++){const p=course.platforms[i];if(world===1){if([1,6,10].includes(i)){const x=p.x+80,y=top(p,x);mushroom(land,x/100,-y/100,0,.8);springs.push({x,y:y-mushroomCrownHeight*80});}if([3,9].includes(i)){const x=p.x+p.width-90,y=top(p,x);pipes.push({x,y,object:pipe(land,x/100,-y/100,0)});}if(i%3===0)mushroom(land,(p.x+40)/100,-top(p,p.x+40)/100,-2.4,1.8);}
 if(world===3&&[1,4,11].includes(i)){const x=p.x+55,bottom=p.y,roof=p.y-180;ladders.push({x,bottom,roof});for(const xx of [-.18,.18])link(land,new T.Vector3(x/100+xx,-bottom/100,1),new T.Vector3(x/100+xx,-roof/100,1),.035,'#b8a27a');for(let y=bottom;y>=roof;y-=22)box(land,x/100,-y/100,1,.43,.045,.055,'#a6936a');}
 if((world===2?[1,7,12]:world===3?[1,6,11]:[4,9]).includes(i)){const x=p.x+45,y=top(p,x),o=new T.Group();o.position.set(x/100,-y/100,-.3);land.add(o);cylinder(o,0,.35,0,.04,.7,'#9c7950');mesh(new T.SphereGeometry(.19,12,8),new T.MeshStandardMaterial({color:'#ffe19a',emissive:'#e8b548',emissiveIntensity:1}),o,0,.77,0);const light=new T.PointLight('#ffd983',1,3);light.position.y=.77;o.add(light);checkpoints.push({x,y,object:o,active:false});}}
 const finishPlatform=course.platforms[course.platforms.length-1];if(world===1)castle(land,(course.finish+20)/100,-finishPlatform.y/100,-1.6);else{const gate=new T.Group();gate.position.set(course.finish/100,-finishPlatform.y/100,0);land.add(gate);for(const xx of [-.8,.8])cylinder(gate,xx,1.2,0,.14,2.4,world===3?'#975544':'#b7b09a');box(gate,0,2.45,0,2.3,.22,.4,world===3?'#6c5143':'#c4bea7');const portal=mesh(new T.TorusGeometry(.65,.06,12,48),new T.MeshStandardMaterial({color:'#a6e6e1',emissive:'#55b7d1',emissiveIntensity:1}),gate,0,1.25,0);portal.name='exit-portal';}
 let goldenTexture:T.CanvasTexture|undefined;const texture=new T.TextureLoader().load(avatar,image=>{if(disposed)return;const c=document.createElement('canvas');c.width=image.image.width;c.height=image.image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image.image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height);for(let y=0;y<100;y++)for(let x=0;x<c.width;x++){const at=(y*c.width+x)*4,r=pixels.data[at],g=pixels.data[at+1],b=pixels.data[at+2],local=x%256;if(pixels.data[at+3]>80&&local>45&&local<215&&r<145&&g<125&&b<120&&r>=b*.94){const light=(r+g+b)/435;pixels.data[at]=145+light*105;pixels.data[at+1]=99+light*117;pixels.data[at+2]=25+light*90;}}ctx.putImageData(pixels,0,0);goldenTexture=new T.CanvasTexture(c);goldenTexture.colorSpace=T.SRGBColorSpace;goldenTexture.repeat.set(1/12,1);});texture.colorSpace=T.SRGBColorSpace;texture.repeat.set(1/12,1);const avatarMat=new T.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.25,roughness:1,side:T.DoubleSide});
 const figures:{rig:ReturnType<typeof characterRig>}[]=[];
 function character(){const group=new T.Group();scene.add(group);const rig=characterRig(texture,loadout.costume,appearance);rig.root.position.y=-.06;group.add(rig.root);figures.push({rig});return group;}
 const hero=character(),clones=[character(),character()];clones.forEach(c=>c.visible=false);
 const aura=new T.Group();hero.add(aura);for(let i=0;i<10;i++){const f=mesh(new T.ConeGeometry(.15,.9,6),new T.MeshBasicMaterial({color:'#ffdd51',transparent:true,opacity:.18,depthWrite:false}),aura,Math.sin(i*2.4)*.43,.8,Math.cos(i*2.4)*.28);f.rotation.z=Math.sin(i*2.4)*.25;}aura.visible=false;
 const nimbus=new T.Group();hero.add(nimbus);const cloudMat=new T.MeshStandardMaterial({color:'#ffdb45',roughness:.65,emissive:'#936c08',emissiveIntensity:.12});for(let i=0;i<8;i++)mesh(new T.SphereGeometry(.23,14,10),cloudMat,nimbus,Math.cos(i*2.4)*.5,-.02,Math.sin(i*2.4)*.21);const tailCurve=new T.CatmullRomCurve3([new T.Vector3(-.3,0,0),new T.Vector3(-.9,-.05,0),new T.Vector3(-1.4,-.23,0),new T.Vector3(-1.8,-.2,0),new T.Vector3(-1.95,0,0)]);mesh(new T.TubeGeometry(tailCurve,24,.065,8,false),cloudMat,nimbus);nimbus.visible=false;
 const shield=mesh(new T.SphereGeometry(.65,24,16),new T.MeshBasicMaterial({color:'#b0ece4',transparent:true,opacity:.1,depthWrite:false,wireframe:true}),hero,0,.76,0);shield.visible=false;
 const coins=course.coins.map(c=>{const group=new T.Group();group.position.set(c.x/100,-c.y/100,.15);scene.add(group);if(world===2){mesh(new T.SphereGeometry(.15,20,16),new T.MeshStandardMaterial({color:'#efb13c',roughness:.2,metalness:.3}),group);for(let i=0;i<4;i++)mesh(new T.SphereGeometry(.023,6,4),material('#a34725'),group,(i%2-.5)*.075,(Math.floor(i/2)-.5)*.075,.14);}else if(world===3){cylinder(group,0,0,0,.11,.35,'#dbd0aa');for(const y of [-.18,.18])cylinder(group,0,y,0,.13,.05,'#963f32');}else{const coin=mesh(new T.CylinderGeometry(.14,.14,.045,32),new T.MeshStandardMaterial({color:'#e9b93d',metalness:.8,roughness:.22}),group);coin.rotation.x=Math.PI/2;const rim=mesh(new T.TorusGeometry(.115,.013,6,28),material('#fff1a2'),group,0,0,.027);}return{...c,object:group,taken:false};});
 const powerColors:Record<PowerKind,string>={shield:'#a1e4d8',doubleJump:'#c5b1f0',rapid:'#eac562',nimbus:'#ffdb45',saiyan:'#ffe065',flower:'#f3934f',star:'#f9d945',rasengan:'#77d9f7',chidori:'#c7d4ff',clone:'#b9d7b1'};
 const pickups=course.powers.map(p=>{const group=new T.Group();group.position.set(p.x/100,-p.y/100,0);scene.add(group);const m=new T.MeshStandardMaterial({color:powerColors[p.kind],emissive:powerColors[p.kind],emissiveIntensity:.35,metalness:.2,roughness:.3});if(p.kind==='flower'){cylinder(group,0,-.12,0,.025,.3,'#678a43');for(let i=0;i<6;i++)mesh(new T.SphereGeometry(.065,10,8),m,group,Math.sin(i*Math.PI/3)*.11,.1+Math.cos(i*Math.PI/3)*.11,0);mesh(new T.SphereGeometry(.075,12,8),material('#f4e6b0'),group,0,.1,.03);}else if(p.kind==='star'||p.kind==='saiyan'){const shape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.1:.22;if(i===0)shape.moveTo(Math.sin(a)*r,Math.cos(a)*r);else shape.lineTo(Math.sin(a)*r,Math.cos(a)*r);}shape.closePath();mesh(new T.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:2,steps:1}),m,group);}else mesh(new T.IcosahedronGeometry(.19,1),m,group);return{...p,object:group,taken:false};});
 function enemyModel(index:number){const group=new T.Group();scene.add(group);const kind=world===1?index%3:world===2?index%2:index%3;if(world===1&&kind===0){mushroom(group,0,0,0,.52);for(const xx of [-.1,.1])mesh(new T.SphereGeometry(.035,8,6),material('#241f18'),group,xx,.43,.25);}else if(world===1&&kind===1){const shell=mesh(new T.SphereGeometry(.38,16,12),material('#aa7239'),group,0,.3,0);shell.scale.set(1,.75,1.1);for(const xx of [-.21,.21])for(const zz of [-.2,.2])mesh(new T.SphereGeometry(.11,10,8),material('#a09254'),group,xx,.1,zz);mesh(new T.SphereGeometry(.15,12,10),material('#b4ab6a'),group,.34,.3,0);}else if(world===1){cylinder(group,0,.3,0,.06,.6,'#527c3c');const head=mesh(new T.SphereGeometry(.24,16,12),material('#a64334'),group,0,.65,0);head.scale.y=.8;for(let i=0;i<5;i++)mesh(new T.ConeGeometry(.035,.13,5),material('#efe1b2'),group,(i-2)*.07,.59,.19);}else if(world===2&&kind===1){mesh(new T.SphereGeometry(.28,16,12),material('#8f9ea5',.35),group,0,.7,0);mesh(new T.TorusGeometry(.37,.04,6,24),material('#664c58'),group,0,.7,0);mesh(new T.SphereGeometry(.08,12,8),new T.MeshStandardMaterial({color:'#e6a05d',emissive:'#e6a05d',emissiveIntensity:.7}),group,0,.7,.25);}else{mesh(new T.ConeGeometry(.26,.65,12,1,true),material(world===3?'#27292c':'#5c5169'),group,0,.62,0);mesh(new T.SphereGeometry(.14,16,12),material(world===3&&kind===1?'#97afb1':'#c7ac90'),group,0,1.08,0);const hair=mesh(new T.SphereGeometry(.15,12,8,0,Math.PI*2,0,Math.PI*.57),material(world===3&&kind===2?'#cfb56a':'#292b30'),group,0,1.1,0);hair.rotation.z=.1;for(const xx of [-.12,.12])cylinder(group,xx,.16,0,.055,.3,'#30343b');if(world===3){for(let i=0;i<3;i++){const cloud=mesh(new T.TorusGeometry(.055,.018,5,10),material('#a34b43'),group,(i-1)*.11,.65+(i%2)*.1,.23);cloud.rotation.z=.4;}if(kind===1)link(group,new T.Vector3(.24,.22,0),new T.Vector3(.47,1.35,0),.06,'#b6b2a3');if(kind===2)mesh(new T.SphereGeometry(.08,8,6),material('#d8c39c'),group,.3,.75,0);}}
 const fallback=[...group.children],slot=world===1?kind:world===2?3+kind:kind,cols=3,rows=world===3?1:2;
 const art=new T.TextureLoader().load(world===3?'/jumpyland/akatsuki-v1.png':'/jumpyland/enemies-v2.png',()=>{if(disposed)return;fallback.forEach(o=>o.visible=false);portrait.visible=true;});art.colorSpace=T.SRGBColorSpace;art.repeat.set(1/cols,1/rows);art.offset.set((slot%cols)/cols,1-(Math.floor(slot/cols)+1)/rows);
 const height=world===3?1.6:world===2?(kind===1?.8:1.5):kind===2?1.15:.85,width=world===3?1.05:world===2?1.1:1;
 const portrait=mesh(new T.PlaneGeometry(width,height,10,16),new T.MeshStandardMaterial({map:art,transparent:true,alphaTest:.25,roughness:1,side:T.DoubleSide}),group,0,height*.48,.32);portrait.visible=false;
 const baseVertices=Float32Array.from(portrait.geometry.getAttribute('position').array);
 group.userData.animate=(now:number,direction:number,windup:boolean)=>{
  (portrait.material as T.MeshStandardMaterial).emissive.set(windup?'#d57738':'#000000');(portrait.material as T.MeshStandardMaterial).emissiveIntensity=windup?.4:0;portrait.scale.x=direction;const vertices=portrait.geometry.getAttribute('position'),phase=now*(world===2&&kind===1?.004:.009)+index;
  for(let i=0;i<vertices.count;i++){const at=i*3,bx=baseVertices[at],by=baseVertices[at+1],t=(by+height/2)/height;
   const feet=1-T.MathUtils.smoothstep(t,.06,.45),side=bx<0?-1:1;
   vertices.setXYZ(i,bx+Math.sin(phase+side)*feet*.025,by+Math.cos(phase*2)*(.012+(1-t)*.01)+Math.sin(phase+side)*feet*.022,baseVertices[at+2]+(windup?Math.sin(t*Math.PI)*.045:0));
  }vertices.needsUpdate=true;portrait.geometry.computeVertexNormals();
 };return group;}
 const enemies=course.enemies.map((e,i)=>{
  const lineGeometry=new T.BufferGeometry();lineGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));
  const aimLine=new T.Line(lineGeometry,new T.LineBasicMaterial({color:'#ffbd6a',transparent:true,opacity:.65,depthWrite:false}));aimLine.visible=false;aimLine.frustumCulled=false;scene.add(aimLine);
  return {...e,index:i,carrier:platforms.find(p=>e.left>=p.base.x&&e.right<=p.base.x+p.base.width),spawnLeft:e.left,spawnRight:e.right,object:enemyModel(i),direction:i%2?1:-1,alive:true,nextShot:1100+i%3*180,windupUntil:0,aimX:0,aimY:0,alert:false,aimLine};
 });
 type Shot={x:number;y:number;vx:number;vy:number;until:number;object:T.Group;enemy:boolean;pierce:boolean};const shots:Shot[]=[],smoke:{object:T.Mesh;until:number;vx:number;vy:number}[]=[];
 // Runs start at the trailhead; the dev preview may start further along a course.
 const startOn=course.platforms.find(p=>startX>=p.x&&startX<=p.x+p.width)??course.platforms[0];
 let disposed=false,paused=false,ready=false,ended=false,frame=0,accumulator=0,last=performance.now(),time=0,x=startX,y=top(startOn,startX),vy=0,facing=1,ground:Landing|null=platforms[course.platforms.indexOf(startOn)],airJump=false,wasJump=false,wasPower=false,count=0,defeated=0,nextPower=0,checkpoint={x,y},pipeUntil=0,notice='Three hearts per attempt. Lanterns save your respawn point.',nextReport=0;
 let health=freshLife(),respawnUntil=0,guard=freshGuard(),wasDefend=false,lastGroundedAt=0,jumpQueuedUntil=0;
 const guardBubble=mesh(new T.SphereGeometry(.78,24,16),new T.MeshBasicMaterial({color:'#89dcff',transparent:true,opacity:.2,depthWrite:false}),hero,0,.72,0);guardBubble.visible=false;
 let powers=freshPowers();powers.shield=loadout.shield;if(loadout.power)powers=collectPower(powers,loadout.power,0);
 const keys=new Set<string>();
 const keyDown=(e:KeyboardEvent)=>{
  if(paused||ended||(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable="true"]')))return;
  const action=keyboardAction(e.code);if(!action)return;e.preventDefault();
  if(action==='pause'){controller.pause();onPause();return;}keys.add(e.code);if(!e.repeat)queueAction(input,action);
 };
 const keyUp=(e:KeyboardEvent)=>keys.delete(e.code);
 const clearInput=()=>{keys.clear();for(const key of Object.keys(input) as (keyof InputState)[])input[key]=false;wasJump=wasPower=wasDefend=false;jumpQueuedUntil=0;};
 window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',clearInput);
 const resize=()=>{const w=Math.max(1,parent.clientWidth),h=Math.max(1,parent.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(parent);resize();
 function puff(px:number,py:number){for(let i=0;i<10;i++){const o=mesh(new T.SphereGeometry(.14+Math.random()*.12,10,8),new T.MeshBasicMaterial({color:'#ecede1',transparent:true,opacity:.75,depthWrite:false}),scene,px/100,-py/100+.5,.35);smoke.push({object:o,until:time+700,vx:(Math.random()-.5)*1.5,vy:Math.random()});}}
 function finish(cause:'fall'|'enemy'|'complete'){if(ended)return;ended=true;onEnd(cause,count);}
 function loseLife(cause:'fall'|'enemy'){
  if(time<respawnUntil||ended)return;
  const loss=loseHeart(health,time,cause==='fall');health=loss.state;if(!loss.lost)return;
  nextReport=0;onSound(cause==='fall'?'fall':'hit');puff(x,y);
  if(loss.gameOver){finish(cause);return;}
  x=checkpoint.x;y=checkpoint.y;vy=0;ground=null;airJump=false;poses.length=0;
  guard=freshGuard();guardBubble.visible=false;jumpQueuedUntil=0;lastGroundedAt=-Infinity;
  powers=freshPowers();nimbus.visible=aura.visible=shield.visible=false;clones.forEach(c=>c.visible=false);powers.invulnerableUntil=health.recoverUntil;respawnUntil=time+650;
  notice=`${health.hearts} ${health.hearts===1?'heart':'hearts'} left. ${checkpoints.some(c=>c.active)?'Back at your lantern.':'Back at the trailhead.'}`;
 }
 function hit(){if(ended||time<respawnUntil)return;const old=powers.clones,result=takeHit(powers,time);powers=result.state;if(old>powers.clones){const c=clones[Math.max(0,powers.clones)];puff(c.position.x*100,-c.position.y*100);onSound('block');}if(result.survived){if(old===powers.clones)onSound('block');return;}loseLife('enemy');}
 function fire(enemy:boolean,px:number,py:number,dir:number,index=0,target?:{x:number;y:number}){const weapon=weaponFor(world,powers,time),group=new T.Group();scene.add(group);const color=enemy?(world===3&&index%3===1?'#6fb8d7':'#d99562'):powers.saiyanUntil>time?'#ffe36a':world===1?'#f49c44':'#8ce4f7';const core=mesh(new T.SphereGeometry(enemy?.09:.14,12,10),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.3}),group);if(!enemy&&weapon.pierce){core.scale.x=4;const ring=mesh(new T.TorusGeometry(.2,.025,6,20),material(color),group);ring.rotation.y=Math.PI/2;}const velocity=enemy?projectileAim({x:px,y:py},target||{x:px+dir*100,y:py},enemyTuning(world).speed):{vx:dir*weapon.speed,vy:0};shots.push({x:px,y:py,...velocity,until:time+(enemy?2600:weapon.life),object:group,enemy,pierce:!enemy&&weapon.pierce});onSound(enemy?'enemy':world===1?'fire':world===3&&powers.chidoriUntil>time?'lightning':world===3&&powers.rasenganUntil>time?'rasengan':'power');}
 const poses:{x:number;y:number;facing:number}[]=[];
 function animateSmoke(dt:number,now:number){
 for(let i=smoke.length-1;i>=0;i--){const s=smoke[i];s.object.position.x+=s.vx*dt;s.object.position.y+=s.vy*dt;s.object.scale.multiplyScalar(1+dt*1.5);(s.object.material as T.MeshBasicMaterial).opacity=Math.max(0,(s.until-now)/1000);if(now>s.until){scene.remove(s.object);s.object.geometry.dispose();(s.object.material as T.Material).dispose();smoke.splice(i,1);}}
 }
 function update(dt:number){time+=dt*1000;if(time<respawnUntil){animateSmoke(dt,time);env.update(time,camera);for(const figure of figures)figure.rig.tick(time,0,false,false,0,texture,false);return;}const now=time;const jumpPressed=!!input.jumpQueued,powerPressed=!!input.powerQueued,defendPressed=!!input.defendQueued;const {left,right,jump,down,power,defend}=readInput(input,keys);input.jumpQueued=input.powerQueued=input.defendQueued=false;
 if(ground)lastGroundedAt=now;if(jump&&(!wasJump||jumpPressed))jumpQueuedUntil=now+120;
 if(defend&&(!wasDefend||defendPressed)&&now>=guard.readyAt){guard=raiseGuard(guard,now);notice='Guard raised — block incoming shots!';onSound('block');}wasDefend=defend;

 for(const p of platforms){const oldX=p.at.x,oldY=p.at.y,phase=now/1600+p.base.x*.01;p.at.x=p.base.x+(p.base.motion==='horizontal'?Math.sin(phase)*40:p.base.motion==='swing'?Math.sin(phase)*26:0);p.at.y=p.base.y+(p.base.motion==='vertical'?Math.sin(phase)*25:0);p.dx=p.at.x-oldX;p.dy=p.at.y-oldY;p.object.position.x=p.at.x/100;p.object.position.y=-(p.at.y-p.base.y)/100;}
 for(const h of hanging){const p=platforms.find(p=>p.base===h.landing)!,end=new T.Vector3((p.at.x+h.offset)/100,-p.at.y/100,-.65),delta=end.clone().sub(h.anchor);h.rope.position.copy(h.anchor).add(end).multiplyScalar(.5);h.rope.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());h.rope.scale.y=delta.length()/4;}
 if(ground){x+=ground.dx;y+=ground.dy;}const oldX=x,oldY=y;let vx=horizontalVelocity(left,right);if(vx)facing=Math.sign(vx);if(down&&ground)vx*=.45;x=Math.max(20,Math.min(course.width-20,x+vx*dt));
 if(ground&&x>=ground.at.x&&x<=ground.at.x+ground.at.width)y=top(ground.at,x);
 const ladder=ladders.find(l=>Math.abs(x-l.x)<35&&y>=l.roof-25&&y<=l.bottom+25);const flying=powers.nimbusUntil>now;
 if(ladder&&(down||(jump&&Math.abs(vx)<1))){vy=0;y+=(down?1:-1)*150*dt;ground=null;airJump=false;}else if(flying){vy=(down?150:jump?-160:0);y+=vy*dt;ground=null;airJump=false;}else{if(jumpQueuedUntil>now&&(ground||now-lastGroundedAt<100||pipes.some(p=>Math.abs(x-p.x)<48&&Math.abs(y-(p.y-105))<15)||(!airJump&&powers.doubleJumpUntil>now))){vy=-JUMP_SPEED;if(!ground&&now-lastGroundedAt>=100)airJump=true;ground=null;lastGroundedAt=-Infinity;jumpQueuedUntil=0;onSound('jump');}vy+=GRAVITY*dt;y+=vy*dt;}
 wasJump=jump;let landed:Landing|null=null;
 for(const p of platforms){if(x+20<p.at.x||x-20>p.at.x+p.at.width)continue;const height=top(p.at,x);if(vy>=0&&oldY<=height+Math.max(15,ground===p?24:0)&&y>=height){y=height;vy=0;landed=p;airJump=false;}
 // The visible island body is solid; jumping into its sides cannot enter the mesh.
 const bottom=landingBottom(course,p.base)+(p.at.y-p.base.y);if(y>height+18&&y-145<bottom&&oldX+20<=p.at.x&&x+20>p.at.x)x=p.at.x-21;else if(y>height+18&&y-145<bottom&&oldX-20>=p.at.x+p.at.width&&x-20<p.at.x+p.at.width)x=p.at.x+p.at.width+21;
 if(vy<0&&oldY-145>=bottom&&y-145<bottom){y=bottom+145;vy=0;}}
 ground=landed;
 for(const p of pipes){const height=p.y-105;if(Math.abs(x-p.x)<47){if(vy>=0&&oldY<=height+10&&y>=height){y=height;vy=0;airJump=false;}else if(y>height+12&&y-100<p.y){x=oldX<p.x?p.x-48:p.x+48;}if(down&&Math.abs(y-height)<12&&now>pipeUntil){const dest=pipes.find(q=>q!==p)!;x=dest.x;y=dest.y-108;vy=0;pipeUntil=now+1800;notice='Pipe passage discovered';onSound('pickup');}}}
 for(const spring of springs)if(Math.abs(x-spring.x)<60&&vy>=0&&oldY<=spring.y+20&&y>=spring.y){y=spring.y;vy=-660;ground=null;onSound('jump');notice='Mushroom bounce — reach the high route!';}
 for(const c of checkpoints)if(!c.active&&Math.abs(x-c.x)<55&&Math.abs(y-c.y)<70){
  const base=course.platforms.find(p=>c.x>=p.x&&c.x<=p.x+p.width)!;
  const blockers=platforms.filter(p=>p.base!==base).map(p=>({left:p.at.x,right:p.at.x+p.at.width,top:Math.min(top(p.at,p.at.x),top(p.at,p.at.x+p.at.width/2)),bottom:landingBottom(course,p.base)+p.at.y-p.base.y}));
  blockers.push(...pipes.map(p=>({left:p.x-50,right:p.x+50,top:p.y-105,bottom:p.y})),...enemies.filter(e=>e.alive).map(e=>({left:e.x-50,right:e.x+50,top:e.y-130,bottom:e.y+5})));
  const safe=safeRespawn(base,c.x,blockers);if(safe){c.active=true;checkpoint=safe;notice='Lantern checkpoint lit';onSound('pickup');}
 }
 for(const c of coins)if(!c.taken&&Math.abs(x-c.x)<40&&Math.abs(y-65-c.y)<85){c.taken=true;c.object.visible=false;count++;onCoins(count);onSound('coin');}
 for(const p of pickups){const anchor=platforms.find(l=>p.x>=l.base.x&&p.x<=l.base.x+l.base.width&&Math.abs(p.y-(l.base.y-44))<5);const dx=anchor?anchor.at.x-anchor.base.x:0,dy=anchor?anchor.at.y-anchor.base.y:0;p.object.position.set((p.x+dx)/100,-(p.y+dy)/100+Math.sin(now*.002)*.05,0);p.object.rotation.y=now*.001;if(!p.taken&&Math.abs(x-p.x-dx)<45&&Math.abs(y-65-p.y-dy)<70){if(canCollectPower(p.kind,world,count)){p.taken=true;p.object.visible=false;powers=collectPower(powers,p.kind,now);notice=powerNames[p.kind]+' collected';onSound(p.kind==='saiyan'?'transform':'pickup');}else notice='Collect three Dragon Balls to awaken Super Saiyan.';}}
 if(power&&(!wasPower||powerPressed)&&now>=nextPower){const w=weaponFor(world,powers,now);fire(false,x+facing*30,y-65,facing);nextPower=now+w.cooldown;}wasPower=power;
 for(const e of enemies){
 if(!e.alive){e.aimLine.visible=false;continue;}const p=e.carrier,tuning=enemyTuning(world);
 if(p){e.x+=p.dx;e.left=e.spawnLeft+p.at.x-p.base.x;e.right=e.spawnRight+p.at.x-p.base.x;e.y=top(p.at,e.x);}
 e.alert=enemyTracks(e,{x,y},world);
 const next=stepEnemy(e,x,e.alert,dt,world,world===1&&e.index%3===2);e.x=next.x;e.direction=next.direction;if(p)e.y=top(p.at,e.x);
 const firingLaneClear=!platforms.some(p=>{const left=Math.min(e.x,x),right=Math.max(e.x,x);if(p.at.x+p.at.width<=left+35||p.at.x>=right-35)return false;const sample=Math.max(left,Math.min(right,p.at.x+p.at.width/2));const t=(sample-e.x)/(x-e.x||1),shotY=e.y-65+(y-e.y)*t;return shotY>top(p.at,sample)+5&&shotY<landingBottom(course,p.base)+p.at.y-p.base.y;});
 const canShoot=e.alert&&firingLaneClear&&!(world===1&&e.index%3===0);
 if(!canShoot){e.windupUntil=0;e.aimLine.visible=false;e.nextShot=Math.max(e.nextShot,now+180);}
 else if(!e.windupUntil&&now>=e.nextShot){e.aimX=x;e.aimY=y-65;e.windupUntil=now+tuning.windup;}
 if(e.windupUntil&&now>=e.windupUntil){
  if(shots.filter(s=>s.enemy).length<12)fire(true,e.x,e.y-65,Math.sign(e.aimX-e.x)||1,e.index,{x:e.aimX,y:e.aimY});
  e.windupUntil=0;e.nextShot=now+tuning.cooldown+(e.index%3)*100;
 }
 e.aimLine.visible=e.windupUntil>now;
 if(e.aimLine.visible){const position=e.aimLine.geometry.getAttribute('position');position.setXYZ(0,e.x/100,-(e.y-65)/100,.2);position.setXYZ(1,e.aimX/100,-e.aimY/100,.2);position.needsUpdate=true;}
 e.object.position.set(e.x/100,-e.y/100+(world===2&&e.index%2?.2+Math.sin(now*.003)*.15:0),0);e.object.rotation.y=e.direction>0?-.12:.12;e.object.userData.animate?.(now,e.direction,e.windupUntil>now);e.object.rotation.z=Math.sin(now*.008+e.index)*.015;e.object.scale.y=1+Math.sin(now*.004+e.index)*.008;

 if(Math.abs(e.x-x)<38&&Math.abs(y-e.y)<110){if((vy>80&&oldY<e.y-55)||powers.saiyanUntil>now||powers.starUntil>now){e.alive=false;e.object.visible=false;defeated++;vy=-290;puff(e.x,e.y);onSound('hit');}else hit();}}
 for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.object.position.set(s.x/100,-s.y/100,.2);s.object.rotation.x+=dt*4;let remove=now>s.until;if(s.enemy&&Math.abs(s.x-x)<25&&Math.abs(s.y-(y-65))<65){if(guardActive(guard,now)){guard={...guard,blocked:guard.blocked+1};notice='Shot blocked!';onSound('block');puff(s.x,s.y);}else hit();remove=true;}if(!s.enemy)for(const e of enemies)if(e.alive&&Math.abs(s.x-e.x)<42&&Math.abs(s.y-(e.y-50))<80){e.alive=false;e.object.visible=false;defeated++;puff(e.x,e.y);onSound('hit');if(!s.pierce)remove=true;}if(remove){scene.remove(s.object);s.object.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material&&!Array.isArray(m.material))m.material.dispose();});shots.splice(i,1);}}
 if(y>Math.max(...course.platforms.map(p=>p.y))+230)loseLife('fall');if(x>=course.finish&&Math.abs(y-finishPlatform.y)<150)finish('complete');
 hero.position.set(x/100,-y/100,0);hero.scale.x=facing;const avatarFrame=!ground?(vy<0?9:10):down?11:Math.abs(vx)>0?1+Math.floor(now/80)%8:0;texture.offset.x=avatarFrame/12;if(goldenTexture)goldenTexture.offset.x=avatarFrame/12;avatarMat.map=powers.saiyanUntil>now&&goldenTexture?goldenTexture:texture;
 for(const figure of figures)figure.rig.tick(now,vx,!ground,down,avatarFrame,avatarMat.map||texture,powers.saiyanUntil>now,vy);
 guardBubble.visible=guardActive(guard,now);guardBubble.scale.setScalar(1+Math.sin(now*.025)*.025);
 aura.visible=powers.saiyanUntil>now||powers.starUntil>now;aura.rotation.y=now*.002;aura.scale.setScalar(1+Math.sin(now*.012)*.07);shield.visible=powers.shield;nimbus.visible=flying;
 poses.push({x,y,facing});if(poses.length>180)poses.shift();const cloneCount=powers.cloneUntil>now?powers.clones:0;for(let i=0;i<2;i++){const c=clones[i],show=i<cloneCount;if(c.visible&&!show)puff(c.position.x*100,-c.position.y*100);c.visible=show;if(show){const pose=poses[Math.max(0,poses.length-1-(i+1)*25)];c.position.set((pose.x-facing*(i+1)*28)/100,-pose.y/100,.7+i*.22);c.scale.x=pose.facing;}}
 animateSmoke(dt,now);
 for(const c of coins)if(!c.taken)c.object.rotation.y=now*.002;env.update(now,camera);
 const targetX=x/100+4.8,targetY=-y/100+1.65;camera.position.x=T.MathUtils.lerp(camera.position.x,targetX,.07);camera.position.y=T.MathUtils.lerp(camera.position.y,targetY+.45,.07);camera.position.z=camera.aspect<1?21:16;camera.lookAt(camera.position.x,targetY,-1.5);const sunOffset=(sun.userData.offset as number[]|undefined)??[-8,16,12];sun.position.set(x/100+sunOffset[0],sunOffset[1],sunOffset[2]);sun.target.position.set(x/100,-3,0);
 if(now>nextReport){nextReport=now+120;const special=activeTechnique(powers,now);onProgress(Math.min(100,Math.floor(x/course.finish*100)));onWorld({guarding:guardActive(guard,now),guardCooldown:Math.max(0,(guard.readyAt-now)/1000),blockedShots:guard.blocked,hearts:health.hearts,region:regionAt(course,x).name,cooldown:Math.max(0,Math.ceil((nextPower-now)/1000)),defeated,shield:powers.shield,skyJump:Math.max(0,Math.ceil((powers.doubleJumpUntil-now)/1000)),rapid:Math.max(0,Math.ceil((powers.rapidUntil-now)/1000)),nimbus:Math.max(0,Math.ceil((powers.nimbusUntil-now)/1000)),saiyan:Math.max(0,Math.ceil((powers.saiyanUntil-now)/1000)),special:special?.kind==='clone'?`Shadow clones (${cloneCount})`:special?.name||'',specialSeconds:special?Math.ceil((special.until-now)/1000):0,notice});}
 }
 camera.position.set(x/100+4.8,-y/100+2.1,camera.aspect<1?21:16);camera.lookAt(x/100+4.8,-y/100+1.65,-1.5);
 const controller:GameController={pause(){paused=true;clearInput();},resume(){paused=false;last=performance.now();canvas.focus({preventScroll:true});},destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clearInput);stopRockDetail();env.dispose();figures.forEach(figure=>figure.rig.dispose());goldenTexture?.dispose();texture.dispose();disposeStage(renderer,scene);canvas.remove();}};
 const loop=(stamp:number)=>{if(disposed)return;const dt=Math.min(.1,(stamp-last)/1000);last=stamp;if(!paused&&!ended&&ready){accumulator+=dt;while(accumulator>=1/120&&!ended){update(1/120);accumulator-=1/120;}}else accumulator=0;renderer.render(scene,camera);if(!ready&&texture.image){ready=true;canvas.dataset.ready='true';onReady(controller);canvas.focus({preventScroll:true});}frame=requestAnimationFrame(loop);};frame=requestAnimationFrame(loop);return()=>controller.destroy();
}
