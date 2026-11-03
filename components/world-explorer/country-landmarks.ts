import * as T from 'three';
import {batchStatic,island,matte,mesh,nature,sphere,strut,type Biome} from './scenic-kit';
import {eavesRoof,profileLandmark,profilePlatform,type VisualProfile} from './country-platforms';
import {addCountryShowcase} from './country-showcase';
import {addReferenceDetails} from './reference-details';
import {countrySurface} from './route-scenery';

/** Country-specific architecture attached to the moving platform root. The
 * walking plane stays at local y=0; rails, plants and carved trim stay behind it. */
export function countryPlatform(root:T.Group,code:string,width:number,index:number,profile?:VisualProfile){
 if(!['USA','FRA','EGY','JPN','BRA','AUS','ANTARCTICA'].includes(code)){if(profile)profilePlatform(root,profile,width,index);return;}
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>mesh(root,new T.BoxGeometry(w,h,d),m,x,y,z);
 const cap=root.getObjectByName('country-platform-cap') as T.Mesh<T.CircleGeometry,T.MeshStandardMaterial>|undefined;
 const stone=matte('#cdb98f'),wood=matte('#826343'),dark=matte('#394c5a');
 if(code==='USA'||code==='FRA'){
  const old=root.getObjectByName('country-platform-cliff') as T.Mesh|undefined;if(old){old.removeFromParent();old.geometry.dispose();for(const m of Array.isArray(old.material)?old.material:[old.material])m.dispose();}
  const usa=code==='USA',wall=matte(usa?'#b3b9b4':'#e4d7bf'),roof=matte(usa?'#6b7c7b':'#bcbca4'),height=usa?3.6+(index%3)*.4:3.2;
  box(0,-height/2-.02,0,width*.98,height,2.78,wall);box(0,-.08,0,width,.16,3.1,roof);if(cap)cap.material.color.copy(roof.color);
  const glass=new T.MeshStandardMaterial({color:usa?'#397d9b':'#344d63',roughness:.3,metalness:.15});
  const windows=Math.max(2,Math.floor(width/.7));for(let j=0;j<windows;j++)for(let y=-.65;y>-height+.25;y-=.82)box((j+.5)*width/windows-width/2,y,1.402,.28,.45,.035,glass);
  // The back parapet has a clear, unobstructed front walking line.
  for(const z of [-1.45]){box(0,.3,z,width,.08,.11,usa?dark:stone);for(let i=0;i<=windows;i++)box(i*width/windows-width/2,.17,z,.065,.32,.08,usa?dark:stone);}
  if(usa){box(-width*.28,.17,-.8,.5,.3,.4,dark);box(-width*.28,.35,-.8,.6,.06,.5,roof);}
  else{box(0,.05,-1.03,width*.65,.1,.28,stone);for(let i=0;i<3;i++)sphere(root,matte('#7b9d4a'),(i-1)*width*.18,.2,-1.03,.25,.15,.19);}
 }else if(code==='EGY'){
  if(cap)cap.material.color.set('#dfc28d');const sandstone=matte('#cba26d');
  box(0,-.24,0,width,.45,2.9,sandstone);
  for(let x=-width/2+.2;x<width/2;x+=.48){box(x,-.51,1.46,.42,.42,.09,stone);box(x+.2,-.18,1.47,.34,.2,.08,sandstone);}
  for(const side of [-1,1]){const x=side*width*.4;mesh(root,new T.CylinderGeometry(.15,.2,.75,10),stone,x,.37,-1.25);box(x,.78,-1.25,.47,.12,.47,stone);}
 }else if(code==='JPN'){
  if(cap)cap.material.color.set('#9ca777');box(0,-.11,1.42,width,.2,.16,wood);box(0,-.11,-1.42,width,.2,.16,wood);
  const red=matte('#a84c39');for(let x=-width/2+.18;x<width/2;x+=.75){box(x,.3,-1.46,.07,.58,.07,red);}box(0,.55,-1.46,width,.07,.08,red);
  // A mossy stone garden lamp on each second terrace.
  if(index%2===0){const x=width*.28;box(x,.25,-.91,.14,.5,.14,stone);box(x,.58,-.91,.38,.24,.38,stone);const roof=mesh(root,new T.ConeGeometry(.34,.17,4),dark,x,.79,-.91);roof.rotation.y=Math.PI/4;}
 }else if(code==='BRA'){
  box(0,-.1,-1.37,width,.18,.22,wood);const vine=matte('#406f35'),leaf=matte('#63983c');
  for(let i=0;i<Math.ceil(width*1.6);i++){
   const x=(i+.5)*width/Math.ceil(width*1.6)-width/2,drop=.65+(i%4)*.2,curve=new T.QuadraticBezierCurve3(new T.Vector3(x,-.03,1.52),new T.Vector3(x+.13,-drop*.55,1.58),new T.Vector3(x-.1,-drop,1.52));mesh(root,new T.TubeGeometry(curve,8,.012,4,false),vine);
   for(let j=1;j<5;j++){const p=curve.getPoint(j/5),side=j%2?1:-1;sphere(root,leaf,p.x+side*.075,p.y,p.z,.1,.045,.035);}
  }
 }else if(code==='AUS'){
  if(cap)cap.material.color.set('#e1d4a6');const limestone=matte('#b7b8a2');for(const side of [-1,1])sphere(root,limestone,side*width*.35,-.1,1.25,.3,.2,.25);
 }else if(code==='ANTARCTICA'){
  if(cap)cap.material.color.set('#edf8fc');const ice=new T.MeshPhysicalMaterial({color:'#9edbed',roughness:.2,metalness:.03,clearcoat:.6});box(0,-.23,0,width*.98,.4,3.05,ice);
 }
}

export function rainforestBridges(parent:T.Object3D,platforms:{x:number;y:number;width:number;motion:string|null}[]){
 const root=new T.Group();root.name='rainforest-background-bridges';parent.add(root);const wood=matte('#94764c'),rope=matte('#bcaa78');
 for(let i=1;i<platforms.length;i+=3){const a=platforms[i-1],b=platforms[i];if(a.motion||b.motion)continue;const start=a.x+a.width-.35,end=b.x+.35,w=end-start,y=(a.y+b.y)/2-.38,z=-3.4;
  for(let j=0;j<Math.ceil(w/.16);j++){const x=start+(j+.5)*w/Math.ceil(w/.16),sag=Math.sin((x-start)/w*Math.PI)*.15;mesh(root,new T.BoxGeometry(w/Math.ceil(w/.16)-.01,.08,.9),wood,x,y-sag,z);}
  for(const side of [-1,1]){const zz=z+side*.47,curve=new T.QuadraticBezierCurve3(new T.Vector3(start,y+.55,zz),new T.Vector3((start+end)/2,y+.1,zz),new T.Vector3(end,y+.55,zz));mesh(root,new T.TubeGeometry(curve,20,.023,5,false),rope);for(const x of [start,end])strut(root,wood,new T.Vector3(x,y-.05,zz),new T.Vector3(x,y+.65,zz),.04);}
 }batchStatic(root);
}

/** Every sourced place gets a modeled interpretation. Seven introductory
 * sites have dedicated geometry; other places use their physical profile. */
export function countryLandmarks(scene:T.Scene,code:string,biome:Biome,profile?:VisualProfile){
 const root=new T.Group();root.position.set(17,1,-15);root.name='country-landmark-'+code;scene.add(root);
 if(profile){root.userData.landmarkName=profile.landmarkName;root.userData.landmarkKind=profile.landmarkKind;root.userData.representation='stylized';}
 const shelf=island(root,0,0,18,8,biome,113,9);shelf.position.z=-1;if(profile)countrySurface(shelf,profile);
 if(addCountryShowcase(root,code)){batchStatic(root);return root;}
 if(!['USA','BRA','FRA','EGY','JPN','AUS','ANTARCTICA'].includes(code)){
  if(profile)profileLandmark(root,profile);batchStatic(root);return root;
 }
 const stone=matte('#d9c59b'),white=matte('#f2ece0'),dark=matte('#36495a'),red=matte('#b74232'),wood=matte('#936c42'),gold=matte('#d9b751',.4);
 const box=(p:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
 const bar=(p:T.Object3D,m:T.Material,a:[number,number,number],b:[number,number,number],r=.06)=>strut(p,m,new T.Vector3(...a),new T.Vector3(...b),r);
 if(code==='USA'){
  const glass=new T.MeshStandardMaterial({color:'#6e9fb5',roughness:.3,metalness:.35});
  for(let i=0;i<7;i++){const x=-6+i*1.35,h=2.2+(i*7%5)*.75;box(root,x,h/2,-2,.9,h,1.1,i%2?glass:dark);for(let y=.35;y<h-.2;y+=.45)for(const dx of [-.23,.23])box(root,x+dx,y,-1.435,.13,.19,.03,white);}
  const bridge=new T.Group();bridge.position.set(1.4,.4,2);root.add(bridge);box(bridge,0,.6,0,10,.14,.75,red);
  for(const x of [-3.1,3.1]){for(const z of [-.4,.4])box(bridge,x,2.05,z,.16,4.1,.16,red);for(const y of [1.45,2.9,3.7])box(bridge,x,y,0,.19,.15,.98,red);}
  for(const z of [-.43,.43]){const curve=new T.QuadraticBezierCurve3(new T.Vector3(-3.1,3.8,z),new T.Vector3(0,-.1,z),new T.Vector3(3.1,3.8,z));mesh(bridge,new T.TubeGeometry(curve,36,.035,6,false),red);for(let i=0;i<=12;i++){const p=curve.getPoint(i/12);bar(bridge,red,[p.x,.7,z],[p.x,p.y,z],.018);}}
  // The sourced discovery is the Statue of Liberty, distinct from the
  // illustrative skyline and suspension bridge surrounding the route.
  const liberty=new T.Group();liberty.name='statue-of-liberty';liberty.position.set(-3.9,0,2.4);root.add(liberty);const copper=matte('#7bb7a5');
  box(liberty,0,.55,0,1.35,1.1,1,stone);mesh(liberty,new T.ConeGeometry(.38,1.75,10),copper,0,1.9,0);sphere(liberty,copper,0,2.97,0,.22,.29,.21);
  bar(liberty,copper,[.2,2.55,0],[.6,3.7,0],.085);bar(liberty,copper,[-.19,2.55,0],[-.45,2.18,.1],.075);box(liberty,-.42,2.23,.12,.34,.5,.12,copper);
  for(let i=0;i<7;i++){const a=(i/6-.5)*Math.PI;bar(liberty,copper,[Math.sin(a)*.17,3.13+Math.cos(a)*.12,0],[Math.sin(a)*.4,3.13+Math.cos(a)*.37,0],.025);}sphere(liberty,gold,.6,3.86,0,.1,.2,.1);
 }else if(code==='BRA'){
  for(let i=0;i<8;i++)nature(root,'tropical',-7+i*1.8,0,-1+(i%3),1.5+(i%2)*.5,700+i);
  const water=new T.MeshStandardMaterial({color:'#d4f5f2',emissive:'#65bed0',emissiveIntensity:.18,roughness:.35,transparent:true,opacity:.84,side:T.DoubleSide});
  for(const x of [-4.4,-1.8,1,3.2]){mesh(root,new T.PlaneGeometry(.8,8),water,x,-4,3.12);for(let j=0;j<4;j++)sphere(root,white,x+(j-1.5)*.28,-7.8,3.3,.4,.18,.24);}
  const bird=new T.Group();bird.position.set(4,2.4,2);root.add(bird);sphere(bird,red,0,0,0,.22,.4,.2);sphere(bird,matte('#286ca9'),0,-.12,-.12,.27,.27,.1);sphere(bird,gold,0,.35,.03,.18);sphere(bird,dark,.05,.38,.17,.09,.05,.1);const tail=mesh(bird,new T.ConeGeometry(.12,1.15,7),red,0,-.83,-.08);tail.rotation.z=Math.PI;
 }else if(code==='FRA'){
  const tower=new T.Group();tower.position.set(1,0,0);root.add(tower);const iron=matte('#83704e');
  for(const sx of [-1,1])for(const sz of [-1,1]){bar(tower,iron,[sx*1.4,0,sz*1.4],[sx*.42,4.5,sz*.42],.16);bar(tower,iron,[sx*.42,4.5,sz*.42],[sx*.1,7,sz*.1],.08);for(let i=0;i<6;i++){const y=i*.65+.2,outer=1.4-y*.22,next=1.4-(y+.6)*.22;bar(tower,iron,[sx*outer,y,sz*outer],[-sx*next,y+.6,sz*next],.025);}}
  for(const [y,size] of [[1.8,2.35],[3.5,1.5],[5.7,.56]])box(tower,0,y,0,size,.16,size,iron);bar(tower,iron,[0,6.7,0],[0,8,0],.05);
  for(let i=0;i<4;i++){const x=-6+i*1.3;box(root,x,1.2,1,1.1,2.4,1.3,white);const roof=mesh(root,new T.ConeGeometry(.9,.95,4),dark,x,2.8,1);roof.rotation.y=Math.PI/4;for(const y of [.7,1.6])for(const dx of [-.24,.24])box(root,x+dx,y,1.66,.21,.4,.03,dark);}
  for(const x of [-6,-2,5,7])nature(root,'temperate',x,0,-2,.9,54+x);
 }else if(code==='EGY'){
  for(const [x,h,size,z] of [[-3,5.2,6,-.7],[3,3.9,4.8,-1.5],[6.4,2.5,3,-.2]]){const pyramid=mesh(root,new T.ConeGeometry(size*.7,h,4),stone,x,h/2,z);pyramid.rotation.y=Math.PI/4;}
  for(const x of [-5,-3,3,5]){mesh(root,new T.CylinderGeometry(.28,.34,2.4,10),stone,x,1.2,2.4);box(root,x,2.45,2.4,.8,.24,.8,stone);box(root,x,.1,2.4,.8,.2,.8,stone);}box(root,-4,2.72,2.4,3,.3,.7,stone);box(root,4,2.72,2.4,3,.3,.7,stone);
 }else if(code==='JPN'){
  const temple=new T.Group();temple.position.set(2,0,0);root.add(temple);const tiles=dark.clone();tiles.side=T.DoubleSide;
  for(let level=0;level<3;level++){
   const y=level*1.3,w=3.1-level*.58;box(temple,0,y+.55,0,w,.95,w*.72,white);
   for(const x of [-w*.4,w*.4])box(temple,x,y+.55,w*.38,.12,1.05,.12,red);
   const roof=mesh(temple,eavesRoof(w*1.6,w*1.15,.73),tiles,0,y+1.02,0);roof.name='curved-temple-eaves';box(temple,0,y+1.76,0,w*.25,.07,w*.17,dark);
   for(const side of [-1,1])for(const x of [-w*.35,w*.35])bar(temple,wood,[x,y+.87,side*w*.34],[x,y+1.05,side*w*.52],.035);
  }bar(temple,gold,[0,4.4,0],[0,5,0],.045);
  const pink=matte('#ecafc2'),pale=matte('#f9dce1');for(const x of [-6,-3.4,5.7,7.3]){bar(root,wood,[x,0,1.5],[x,1.8,1.5],.13);for(let i=0;i<15;i++){const a=i*2.4,px=x+Math.sin(a)*.72,py=1.9+(i%3)*.25,pz=1.5+Math.cos(a)*.56;sphere(root,i%3?pink:pale,px,py,pz,.4,.3,.38);if(i%3===0)bar(root,wood,[x,1.2,1.5],[px,py,pz],.035);}}
  for(const x of [-4,4]){bar(root,wood,[x,0,2.5],[x,1.45,2.5],.04);sphere(root,new T.MeshStandardMaterial({color:'#efc186',emissive:'#e6a247',emissiveIntensity:.35}),x,1.3,2.5,.16,.24,.16);box(root,x,1.57,2.5,.33,.09,.3,dark);}
  const fuji=mesh(scene,new T.ConeGeometry(9,12,24),matte('#829eb0'),28,3,-49),snow=mesh(scene,new T.ConeGeometry(3.1,4.2,24),white,28,6.9,-49);fuji.castShadow=snow.castShadow=false;
 }else if(code==='AUS'){
  const sails=new T.Group();sails.position.set(1,.25,1.2);root.add(sails);box(sails,0,0,0,8,.35,3,stone);
  for(let i=0;i<5;i++){const sail=mesh(sails,new T.SphereGeometry(1,20,14,0,Math.PI,0,Math.PI/2),new T.MeshStandardMaterial({color:'#faf5db',side:T.DoubleSide,roughness:.55}),-2.5+i*1.25,.12,0);sail.scale.set(1.25,1.8+(i%3)*.38,1.3);sail.rotation.z=(i-2)*-.14;}
  for(const x of [-6,6,7.5])nature(root,'coastal',x,0,-1,1.3,100+x);
  const roo=new T.Group();roo.position.set(-4.5,.15,2.2);root.add(roo);const tan=matte('#af855d');sphere(roo,tan,0,.65,0,.25,.48,.23);sphere(roo,tan,.08,1.2,.02,.16,.2,.14);for(const dx of [-.08,.08])sphere(roo,tan,dx,1.48,0,.04,.19,.055);bar(roo,tan,[0,.48,0],[-.8,.04,-.2],.09);for(const dx of [-.16,.16])sphere(roo,tan,dx,.12,.2,.12,.1,.28);
 }else{
  const metal=matte('#7d9aa9'),blue=matte('#386e9d');for(const x of [-2.5,2.5]){for(const sx of [-1,1])for(const z of [-.7,.7])bar(root,metal,[x+sx*.95,0,z],[x+sx*.95,1,z],.09);box(root,x,1.6,0,3,1.5,2,x<0?red:blue);box(root,x,2.4,0,3.2,.16,2.2,white);for(const dx of [-.8,0,.8])box(root,x+dx,1.8,1.015,.4,.45,.03,dark);}bar(root,metal,[0,0,-1],[0,4.1,-1],.05);mesh(root,new T.SphereGeometry(.35,16,10),white,0,4,-1);
 }
 addReferenceDetails(root,code);batchStatic(root);return root;
}
