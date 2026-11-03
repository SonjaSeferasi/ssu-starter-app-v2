import * as T from 'three';
import {matte,mesh,nature,sphere,strut} from './scenic-kit';

/** Dedicated, modeled place scenes. Scale/layout remain an illustrative game
 * composition; architectural identities and wildlife follow linked sources.
 * Taj: https://whc.unesco.org/en/list/252/
 * Rockies: https://whc.unesco.org/en/list/304/
 * Moose: https://parks.canada.ca/pn-np/ab/banff/nature/faune-wildlife/mammal/ongules/cervids
 * Kruger fauna: https://www.sanparks.org/parks/kruger/explore/fauna-flora/mammals */
export function addCountryShowcase(parent:T.Group,code:string):boolean{
 if(!['IND','CAN','ZAF'].includes(code))return false;
 const root=new T.Group();root.name='country-showcase-'+code;root.userData.countryCode=code;parent.add(root);
 const box=(group:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material)=>mesh(group,new T.BoxGeometry(w,h,d),material,x,y,z);
 const beam=(group:T.Object3D,material:T.Material,a:[number,number,number],b:[number,number,number],radius=.05)=>strut(group,material,new T.Vector3(...a),new T.Vector3(...b),radius);
 const arch=(group:T.Object3D,x:number,y:number,z:number,w:number,h:number,material:T.Material)=>{
  const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h*.56);s.quadraticCurveTo(-w*.36,h*.86,0,h);s.quadraticCurveTo(w*.36,h*.86,w/2,h*.56);s.lineTo(w/2,0);s.closePath();
  return mesh(group,new T.ShapeGeometry(s,12),material,x,y,z);
 };
 if(code==='IND'){
  root.userData.place='Taj Mahal';
  const marble=matte('#f3eee0',.65),trim=matte('#d9c6a6'),sandstone=matte('#b76e4f'),shadow=matte('#4d5656'),green=matte('#4b793a'),gold=matte('#c5a55d');
  const terrace=box(root,0,.2,-.45,11.4,.4,5.2,marble);terrace.name='taj-marble-terrace';
  const tomb=new T.Group();tomb.name='taj-central-mausoleum';tomb.position.z=-1;root.add(tomb);
  box(tomb,0,1.6,0,4.8,2.8,2.8,marble);box(tomb,0,3.05,0,5.05,.16,3.05,trim);
  arch(tomb,0,.42,1.415,1.5,2.18,shadow);
  for(const x of [-1.7,1.7]){arch(tomb,x,.5,1.416,.65,.95,shadow);arch(tomb,x,1.75,1.416,.6,.86,shadow);}
  for(const x of [-1.25,1.25]){box(tomb,x,1.6,1.44,.06,2.4,.04,trim);}
  const onion=(group:T.Object3D,x:number,y:number,z:number,size:number,name:string)=>{
   // Bulbous double-dome silhouette narrows into a neck and finial.
   const points=[[0,0],[.8,0],[.91,.2],[1,.58],[.94,.95],[.73,1.28],[.42,1.55],[.15,1.76],[0,1.83]].map(([r,h])=>new T.Vector2(r*size,h*size));
   const dome=mesh(group,new T.LatheGeometry(points,32),marble,x,y,z);dome.name=name;
   beam(group,gold,[x,y+size*1.79,z],[x,y+size*2.2,z],.025*size);sphere(group,gold,x,y+size*2.16,z,.05*size);
  };
  mesh(tomb,new T.CylinderGeometry(1.25,1.25,.55,32),marble,0,3.37,0);onion(tomb,0,3.6,0,1.25,'taj-onion-dome');
  for(const x of [-1.9,1.9])for(const z of [-1,1]){
   for(const dx of [-.22,.22])for(const dz of [-.22,.22])beam(tomb,marble,[x+dx,3.08,z+dz],[x+dx,3.76,z+dz],.035);
   onion(tomb,x,3.75,z,.43,'taj-roof-chhatri');
  }
  for(const x of [-4.55,4.55])for(const z of [-2.3,1.45]){
   const minaret=new T.Group();minaret.name='taj-corner-minaret';minaret.position.set(x,.42,z);root.add(minaret);
   mesh(minaret,new T.CylinderGeometry(.2,.28,4.3,20),marble,0,2.15,0);
   for(const y of [1.4,2.9,4.25]){mesh(minaret,new T.CylinderGeometry(.38,.35,.12,20),trim,0,y,0);}
   for(let j=0;j<6;j++){const a=j*Math.PI/3;beam(minaret,marble,[Math.sin(a)*.19,4.3,Math.cos(a)*.19],[Math.sin(a)*.19,4.7,Math.cos(a)*.19],.025);}
   onion(minaret,0,4.68,0,.35,'taj-minaret-canopy');
  }
  // The flanking mosque and guest house are red sandstone, separate from
  // the central marble tomb. This is not a generic palace or a white castle.
  for(const side of [-1,1]){
   const wing=new T.Group();wing.name='taj-sandstone-flank';wing.position.set(side*7.1,0,-1.3);root.add(wing);
   box(wing,0,1.05,0,2.3,2.1,2,sandstone);box(wing,0,2.17,0,2.5,.18,2.2,trim);
   for(const dx of [-.7,0,.7])arch(wing,dx,.2,1.012,.48,1.35,shadow);
   for(const dx of [-.7,0,.7])onion(wing,dx,2.22,0,dx===0?.46:.31,'taj-flank-dome');
  }
  const garden=new T.Group();garden.name='taj-charbagh-garden';root.add(garden);
  box(garden,0,.06,2.65,10.2,.12,2.6,trim);
  const pool=box(garden,0,.135,2.6,1.05,.04,2.3,new T.MeshStandardMaterial({color:'#70b9bb',roughness:.15,metalness:.2}));pool.name='taj-reflecting-pool';
  for(const x of [-3.6,-1.9,1.9,3.6]){
   box(garden,x,.16,2.65,1.35,.12,2.1,green);
   for(const z of [1.85,2.65,3.4]){mesh(garden,new T.ConeGeometry(.13,.7,12),green,x,.55,z);}
  }
  for(const z of [1.7,3.5])for(const x of [-2.8,2.8])box(garden,x,.24,z,4.45,.08,.1,marble);
 }else if(code==='CAN'){
  root.userData.place='Canadian Rocky Mountain Parks';
  const rock=matte('#7d929e'),snow=matte('#f0f6f8'),ice=matte('#92c5d6'),water=new T.MeshStandardMaterial({color:'#3fa0b7',roughness:.18,metalness:.15});
  for(let i=0;i<5;i++){
   const peak=new T.Group();peak.name='rockies-snow-peak';peak.position.set((i-2)*3.2,0,-2.8-Math.sin(i)*.4);root.add(peak);
   const h=4.8+(i%3)*1.3,body=mesh(peak,new T.ConeGeometry(2.6,h,6),rock,0,h/2,0);body.rotation.y=i*.51;
   const cap=mesh(peak,new T.ConeGeometry(1.05,h*.4,6),snow,0,h*.805,0);cap.rotation.y=body.rotation.y;
   for(const y of [h*.24,h*.4]){const ridge=mesh(peak,new T.TorusGeometry(1.75,.035,3,6,Math.PI*1.3),ice,0,y,.1);ridge.rotation.x=Math.PI/2;}
  }
  const lake=mesh(root,new T.CircleGeometry(1,48),water,-.3,.06,1.5);lake.name='rockies-glacial-lake';lake.rotation.x=-Math.PI/2;lake.scale.set(5.4,1.7,1);
  for(const [x,z] of [[-7.3,0],[-6,1.3],[-5,-1.1],[5.6,-.4],[7.3,.7],[3.7,-.6]])nature(root,'alpine',x,0,z,.9+(Math.abs(x)%2)*.14,720+Math.floor(x*3));
  const glacier=mesh(root,new T.BoxGeometry(1.8,.12,3.3),ice,0,.03,-.8);glacier.rotation.y=-.18;glacier.name='rockies-icefield';
  const moose=new T.Group();moose.name='canadian-moose';moose.userData.species='Alces alces';moose.position.set(5.4,0,2.5);root.add(moose);
  const fur=matte('#665142'),antler=matte('#c3aa7b'),muzzle=matte('#8f7964');
  sphere(moose,fur,0,1.25,0,.85,.45,.36);sphere(moose,fur,.38,1.5,0,.36,.39,.34);
  for(const x of [-.5,.48])for(const z of [-.24,.24])beam(moose,fur,[x,1.15,z],[x-.06,.06,z],.07);
  beam(moose,fur,[.4,1.35,0],[.82,1.98,0],.19);sphere(moose,fur,.97,1.91,.02,.31,.25,.22);sphere(moose,muzzle,1.24,1.8,.03,.32,.18,.2);
  for(const side of [-1,1]){
   sphere(moose,fur,.86,2.13,side*.2,.15,.08,.1);
   beam(moose,antler,[.9,2.05,side*.1],[.7,2.39,side*.55],.045);
   const palm=sphere(moose,antler,.74,2.41,side*.59,.33,.08,.24);palm.rotation.x=side*.2;
   for(let j=0;j<4;j++)beam(moose,antler,[.5+j*.15,2.44,side*(.48+j*.07)],[.48+j*.18,2.67+(j%2)*.09,side*(.52+j*.09)],.025);
  }
  beam(moose,fur,[-.7,1.3,0],[-1.05,1.15,0],.04);
 }else{
  root.userData.place='Kruger National Park';
  const rock=matte('#a98e66'),grass=matte('#b0ab61'),bark=matte('#796247'),leaf=matte('#718142');
  for(let i=0;i<8;i++){const x=(i-3.5)*1.5,stone=sphere(root,rock,x,.25+(i%3)*.12,-1.9+(i%2)*.7,.8,.45+(i%3)*.3,.9);stone.rotation.z=i*.2;}
  for(const [x,z] of [[-6.3,-1.7],[-3.6,-2.1],[4.4,-2.4],[7,-.9]]){
   const tree=new T.Group();tree.name='kruger-savanna-tree';tree.position.set(x,0,z);root.add(tree);
   beam(tree,bark,[0,0,0],[.12,2.15,0],.13);
   for(let i=0;i<7;i++){const a=i*2.4,px=Math.sin(a)*.85,pz=Math.cos(a)*.63;beam(tree,bark,[.05,1.3,0],[px,2.28,pz],.045);sphere(tree,leaf,px,2.3+(i%2)*.1,pz,.78,.18,.58);}
  }
  for(let i=0;i<44;i++){
   const x=((i*37)%101)/101*16-8,z=((i*19)%53)/53*5-2.5;
   for(const dx of [-.05,0,.05]){const blade=mesh(root,new T.ConeGeometry(.025,.22+(i%4)*.035,3),grass,x+dx,.12,z);blade.rotation.z=dx*3;}
  }
  const waterhole=mesh(root,new T.CircleGeometry(1,40),new T.MeshStandardMaterial({color:'#799d9b',roughness:.25}),.5,.025,1.3);waterhole.name='kruger-waterhole';waterhole.rotation.x=-Math.PI/2;waterhole.scale.set(2.4,.8,1);
  const giraffe=new T.Group();giraffe.name='kruger-giraffe';giraffe.userData.species='Southern giraffe';giraffe.position.set(4.9,0,1.5);root.add(giraffe);
  const tan=matte('#d1ac6a'),spots=matte('#8c603d'),dark=matte('#4c453a');
  sphere(giraffe,tan,0,1.65,0,.66,.38,.28);
  for(const x of [-.44,.44])for(const z of [-.19,.19])beam(giraffe,tan,[x,1.65,z],[x-.05,.04,z],.055);
  beam(giraffe,tan,[.4,1.65,0],[.8,3.6,0],.17);sphere(giraffe,tan,.97,3.72,0,.3,.16,.15);
  for(const z of [-.12,.12]){beam(giraffe,spots,[.91,3.8,z],[.89,4.04,z],.03);sphere(giraffe,tan,.79,3.8,z*2,.12,.05,.07);}
  for(let i=0;i<17;i++){
   const t=i/16;if(i<7)for(const z of [-.27,.27])sphere(giraffe,spots,-.48+(i%4)*.28,1.55+(i%2)*.22,z,.1,.11,.018);
   else for(const z of [-.14,.14])sphere(giraffe,spots,.45+t*.32,1.9+(i-7)*.16,z,.07,.085,.02);
  }
  beam(giraffe,dark,[-.55,1.65,0],[-.94,1.2,0],.025);sphere(giraffe,dark,-.94,1.14,0,.05,.12,.045);
  const elephant=new T.Group();elephant.name='kruger-african-elephant';elephant.userData.species='Loxodonta africana';elephant.position.set(-4.5,0,1.3);root.add(elephant);
  const hide=matte('#8c9188'),ivory=matte('#ddd2ae');sphere(elephant,hide,0,1.1,0,1,.69,.56);sphere(elephant,hide,.85,1.38,0,.49,.49,.42);
  for(const x of [-.6,.5])for(const z of [-.35,.35])mesh(elephant,new T.CylinderGeometry(.14,.17,.9,10),hide,x,.5,z);
  for(const z of [-.44,.44]){const ear=sphere(elephant,hide,.52,1.35,z,.46,.56,.08);ear.rotation.y=z>0?.25:-.25;}
  const curve=new T.CatmullRomCurve3([new T.Vector3(1.13,1.55,0),new T.Vector3(1.42,.95,.02),new T.Vector3(1.35,.3,.06),new T.Vector3(1.6,.2,.08)]);
  const trunk=mesh(elephant,new T.TubeGeometry(curve,18,.1,8,false),hide);trunk.name='elephant-curved-trunk';
  for(const z of [-.2,.2]){const tusk=mesh(elephant,new T.ConeGeometry(.055,.5,8),ivory,1.32,.9,z);tusk.rotation.z=-1.1;}
  beam(elephant,dark,[-.9,1.25,0],[-1.22,.65,0],.025);
 }
 return true;
}
