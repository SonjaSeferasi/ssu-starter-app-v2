import * as T from 'three';
import {costumes} from './wardrobe';

// Art-directed proportions, articulated limbs and cloth surfaces. The saved
// facial artwork is retained on the head, rather than inventing another face.
export function characterRig(source:T.Texture,costume:string|null){
 const root=new T.Group(),body=new T.Group();root.add(body);
 const clothNormal=weave();
 const shirt=new T.MeshStandardMaterial({color:'#354d69',roughness:.94,normalMap:clothNormal,normalScale:new T.Vector2(.035,.035)});
 const pants=shirt.clone();pants.color.set('#536676');
 const skin=new T.MeshStandardMaterial({color:'#bc947a',roughness:.75});
 const hair=new T.MeshStandardMaterial({color:'#362a25',roughness:.9});
 const leather=new T.MeshStandardMaterial({color:'#272f37',roughness:.72});
 const sole=new T.MeshStandardMaterial({color:'#e2decc',roughness:.85});
 const trim=new T.MeshStandardMaterial({color:'#aab9b0',roughness:.6});
 const headMap=new T.Texture();headMap.colorSpace=T.SRGBColorSpace;
 const faceMat=new T.MeshStandardMaterial({map:headMap,transparent:true,alphaTest:.2,side:T.DoubleSide,roughness:.9});
 function part(parent:T.Object3D,geometry:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const oval=new T.SphereGeometry(1,24,16);
 const torso=part(body,new T.LatheGeometry([new T.Vector2(.145,.72),new T.Vector2(.168,.76),new T.Vector2(.18,.88),new T.Vector2(.205,1.02),new T.Vector2(.21,1.08),new T.Vector2(.16,1.13),new T.Vector2(.07,1.16)],32),shirt,0,0,0,1,1,.61);
 part(body,oval,pants,0,.688,0,.171,.106,.126);
 // Stitched waistband and hoodie hem, with a real hood behind the neck.
 part(body,new T.TorusGeometry(.16,.014,8,32),shirt,0,.73,0,1,.8,1).rotation.x=Math.PI/2;
 const hood=part(body,new T.TorusGeometry(.125,.042,12,32),shirt,0,1.13,-.055,1,1.1,.8);hood.rotation.x=.6;
 part(body,new T.CapsuleGeometry(.047,.06,8,16),skin,0,1.187,.01);
 const head=new T.Group();head.position.set(0,1.345,.025);body.add(head);
 part(head,oval,hair,0,.015,-.025,.117,.147,.105);
 const face=part(head,new T.PlaneGeometry(.305,.29),faceMat,0,.015,.105);
 const arms:T.Group[]=[],elbows:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[];
 for(const side of [-1,1]){
  const arm=new T.Group();arm.position.set(side*.208,1.084,0);body.add(arm);arms.push(arm);
  part(arm,clothSegment(.059,.248),shirt,0,-.095,0);
  const elbow=new T.Group();elbow.position.y=-.207;arm.add(elbow);elbows.push(elbow);
  part(elbow,clothSegment(.047,.229),shirt,0,-.09,0);
  part(elbow,new T.TorusGeometry(.041,.009,6,16),shirt,0,-.182,0).rotation.x=Math.PI/2;
  part(elbow,oval,skin,0,-.219,.008,.042,.064,.032);
  const leg=new T.Group();leg.position.set(side*.09,.668,0);body.add(leg);legs.push(leg);
  part(leg,clothSegment(.073,.316),pants,0,-.13,0);
  const knee=new T.Group();knee.position.y=-.285;leg.add(knee);knees.push(knee);
  part(knee,oval,pants,0,0,0,.067,.066,.062);
  part(knee,clothSegment(.054,.278),pants,0,-.125,0);
  part(knee,oval,leather,side*.006,-.275,.045,.064,.051,.125);
  part(knee,oval,sole,side*.006,-.31,.048,.067,.016,.129);
  for(let i=0;i<3;i++)part(knee,new T.BoxGeometry(.07,.007,.009),sole,side*.006,-.243,.06+i*.018);
 }
 for(const side of [-1,1]){const drawstring=part(body,new T.CapsuleGeometry(.004,.095,4,6),trim,side*.045,1.05,.135);drawstring.rotation.z=side*.12;}
 const pocket=part(body,oval,shirt,0,.85,.103,.115,.055,.032);
 const backpack=new T.Group();body.add(backpack);part(backpack,oval,leather,0,.98,-.14,.16,.2,.085);part(backpack,oval,leather,0,.93,-.207,.123,.09,.025);
 for(const side of [-1,1]){const strap=part(body,new T.CapsuleGeometry(.012,.27,4,8),leather,side*.14,.99,.121);strap.rotation.z=side*.06;}
 // Details from the chosen run outfit are geometry, not separate decals.
 if(costume==='mario'||costume==='luigi'){
  part(body,new T.BoxGeometry(.23,.235,.018),pants,0,.88,.125);
  for(const side of [-1,1]){part(body,new T.BoxGeometry(.035,.28,.021),pants,side*.103,1.01,.12);part(body,new T.SphereGeometry(.013,10,8),new T.MeshStandardMaterial({color:'#d5b24e',metalness:.5,roughness:.4}),side*.103,1.02,.14);}
 }else if(['goku','vegeta','piccolo','sasuke'].includes(costume||'')){
  backpack.visible=false;
  part(body,new T.TorusGeometry(.17,.026,8,32),new T.MeshStandardMaterial({color:costume==='sasuke'?'#785c91':'#2d4771',roughness:.9}),0,.76,0,1,.7,1).rotation.x=Math.PI/2;
  if(costume==='vegeta'){const armor=new T.MeshStandardMaterial({color:'#e6e1ca',roughness:.6});part(body,oval,armor,0,.99,.045,.204,.19,.122);for(const side of [-1,1])part(body,oval,armor,side*.205,1.09,0,.095,.045,.11);}
  if(costume==='goku')for(const side of [-1,1]){const lapel=part(body,new T.BoxGeometry(.055,.23,.025),new T.MeshStandardMaterial({color:'#293f62',roughness:.9}),side*.055,1.07,.123);lapel.rotation.z=side*-.35;}
 }else if(costume==='kakashi'){
  backpack.visible=false;const vest=new T.MeshStandardMaterial({color:'#657d59',roughness:.95});part(body,oval,vest,0,.97,.03,.219,.21,.127);for(const side of [-1,1])for(let i=0;i<2;i++)part(body,new T.BoxGeometry(.075,.09,.045),vest,side*.09,.93+i*.1,.14);
 }
 let sampled=false,lastImage:unknown,lastTime=0,stride=0,run=0;root.visible=false;
 function tick(time:number,speed:number,airborne:boolean,crouch:boolean,frame:number,texture=source,golden=false,verticalSpeed=0){
  const image=texture.image as HTMLImageElement|undefined;if(!image?.width)return false;
  if(lastImage!==image){headMap.image=image;headMap.needsUpdate=true;lastImage=image;}
  headMap.repeat.set(140/image.width,128/image.height);headMap.offset.set(60/image.width,1-128/image.height);
  if(!sampled){sampled=true;const palette=samplePalette(source.image as HTMLImageElement);shirt.color.copy(palette.shirt);pants.color.copy(palette.pants);skin.color.copy(palette.skin);hair.color.copy(palette.hair);hair.userData.base=palette.hair;const selected=costumes.find(c=>c.id===costume);if(selected){shirt.color.set(selected.shirt);pants.color.set(selected.pants);}}
  const dt=Math.max(0,Math.min(.05,(time-lastTime)/1000));lastTime=time;
  const moving=Math.abs(speed)>1,blend=1-Math.exp(-dt*14);run=T.MathUtils.lerp(run,moving?1:0,blend);
  stride+=Math.abs(speed)/100*dt*5.5;
  for(let i=0;i<2;i++){
   const swing=Math.sin(stride+i*Math.PI)*.76*run;
   const hip=crouch?-.65:airborne?(i?.32:-.72):swing;
   const knee=crouch?1.15:airborne?(verticalSpeed<0?1.05:.65):Math.max(0,-swing)*1.35;
   legs[i].rotation.x=T.MathUtils.lerp(legs[i].rotation.x,hip,blend);legs[i].rotation.z=(i?1:-1)*.02;
   knees[i].rotation.x=T.MathUtils.lerp(knees[i].rotation.x,knee,blend);knees[i].rotation.z=0;
   arms[i].rotation.x=T.MathUtils.lerp(arms[i].rotation.x,airborne?-.65:-swing*.85,blend);arms[i].rotation.z=(i?1:-1)*.06;
   elbows[i].rotation.x=T.MathUtils.lerp(elbows[i].rotation.x,-.25-run*.45,blend);elbows[i].rotation.z=0;
  }
  const bounce=!airborne?Math.abs(Math.sin(stride))*.025*run:0;
  body.position.y=T.MathUtils.lerp(body.position.y,crouch?-.22:bounce+Math.sin(time*.002)*.004,blend);
  body.scale.y=1;body.rotation.y=T.MathUtils.lerp(body.rotation.y,moving?1.05:.38,blend);
  body.rotation.x=T.MathUtils.lerp(body.rotation.x,crouch?.24:run*.09,blend);body.rotation.z=Math.sin(stride)*run*.015;
  head.rotation.x=-body.rotation.x*.7;head.rotation.y=-body.rotation.y*.42;head.rotation.z=-body.rotation.z;
  hair.color.copy(golden?new T.Color('#e9bd4e'):hair.userData.base||new T.Color('#362a25'));
  root.visible=true;return true;
 }
 return{root,tick};
}
function samplePalette(image:HTMLImageElement){
 const defaults={shirt:new T.Color('#344a64'),pants:new T.Color('#576a77'),skin:new T.Color('#b9947e'),hair:new T.Color('#352922')};if(!image)return defaults;
 try{const c=document.createElement('canvas');c.width=256;c.height=384;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0,256,384,0,0,256,384);const data=ctx.getImageData(0,0,256,384).data;
 const average=(x1:number,y1:number,x2:number,y2:number,fallback:T.Color,filter?:(r:number,g:number,b:number)=>boolean)=>{let r=0,g=0,b=0,n=0;for(let y=y1;y<y2;y+=2)for(let x=x1;x<x2;x+=2){const i=(y*256+x)*4;if(data[i+3]<200||filter&&!filter(data[i],data[i+1],data[i+2]))continue;r+=data[i];g+=data[i+1];b+=data[i+2];n++;}return n?new T.Color().setRGB(r/n/255,g/n/255,b/n/255,T.SRGBColorSpace):fallback;};
 return{shirt:average(80,145,180,230,defaults.shirt),pants:average(85,255,175,330,defaults.pants),skin:average(95,35,190,95,defaults.skin,(r,g,b)=>r>g*1.05&&g>b*.98&&r>45&&r+g+b>130),hair:average(70,5,195,60,defaults.hair,(r,g,b)=>r+g+b<280)};
 }catch{return defaults;}
}
function weave(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d')!;ctx.fillStyle='#8080ff';ctx.fillRect(0,0,64,64);for(let y=0;y<64;y+=2)for(let x=0;x<64;x+=2){ctx.fillStyle=(x+y)%4?'#7784fc':'#897bfc';ctx.fillRect(x,y,1,2);}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(12,12);return t;}

function clothSegment(radius:number,height:number){
 const points:T.Vector2[]=[];for(let i=0;i<=10;i++){const t=i/10;const fold=1+Math.sin(t*24)*.025;points.push(new T.Vector2(radius*(.86+.13*Math.sin(t*Math.PI))*fold,(t-.5)*height));}
 return new T.LatheGeometry(points,20);
}
