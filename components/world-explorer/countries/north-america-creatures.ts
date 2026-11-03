import * as T from 'three';
import {ellipsoid,matte} from '../kit/common';
import {createCreatureRig,finishCreature,type CreatureRig} from '../kit/creature';
import type {NorthAmericaCode} from '../../../lib/world-explorer/north-america';

export const northAmericanCreatureNames={CAN:'rockies-marmot',USA:'harbor-cargo-robot',MEX:'yucatan-iguana',GTM:'forest-coati',CRI:'leafcutter-ant',JAM:'jamaican-land-crab'} as const;
/** Original, deliberately stylized patrol characters. Motion and damage remain
 * owned by the simulation; these articulated models visualize its state. */
export function createNorthAmericanCreature(parent:T.Object3D,code:NorthAmericaCode){
 const h=code==='CRI'?.56:code==='MEX'?.6:.7;
 const rig=createCreatureRig(parent,{name:northAmericanCreatureNames[code],height:h,feet:code==='JAM'||code==='CRI'?[-.18,-.1,.1,.18]:[-.12,.12],footColor:code==='USA'?'#364a56':'#614834',footSize:[.065,.035,.09],stride:code==='CRI'?12:7,
  animate(r,time,state,moving){
   if(r.extras.tail)r.extras.tail.rotation.y=Math.sin(time*(moving?7:2))*.22;
   if(r.extras.leaf)r.extras.leaf.rotation.z=Math.sin(time*3)*.13;
   if(r.extras.claws)r.extras.claws.rotation.z=Math.sin(time*(state==='ALERT'?12:3))*.12;
   if(r.extras.antenna)r.extras.antenna.rotation.z=Math.sin(time*5)*.15;
  }});
 const shape=(group:T.Object3D,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>ellipsoid(group,matte(color,.78),x,y,z,sx,sy,sz,14);
 const eyes=(y:number,z:number,spread=.11)=>{for(const side of [-1,1]){shape(rig.head,'#fff9dd',side*spread,y,z,.055,.06,.04);shape(rig.head,'#17282a',side*spread,y,z+.035,.025,.035,.02);}};
 const extra=(name:string,parent:T.Group)=>{const group=new T.Group();rig.extras[name]=group;parent.add(group);return group;};
 if(code==='CAN'){
  shape(rig.body,'#8b7053',0,.3,0,.22,.26,.19);shape(rig.body,'#c3ae86',0,.29,.13,.14,.19,.09);
  shape(rig.head,'#9d8060',0,.51,.035,.19,.17,.16);shape(rig.head,'#d2b98d',0,.46,.17,.14,.07,.08);
  for(const side of [-1,1]){shape(rig.head,'#72543b',side*.15,.65,.01,.055,.065,.045);shape(rig.head,'#d9b69a',side*.15,.65,.045,.03,.035,.015);}
  shape(rig.head,'#352e29',0,.51,.235,.05,.035,.025);eyes(.56,.17,.09);
  const tooth=new T.Mesh(new T.BoxGeometry(.055,.07,.025),matte('#fff0cd'));tooth.position.set(0,.407,.23);rig.head.add(tooth);
  const tail=extra('tail',rig.body);shape(tail,'#6e543f',0,.17,-.22,.1,.07,.16);
 }else if(code==='USA'){
  const body=new T.Mesh(new T.BoxGeometry(.41,.31,.34),matte('#d49d38',.5));body.position.y=.3;rig.body.add(body);
  shape(rig.head,'#456d79',0,.54,0,.2,.13,.17);eyes(.55,.15,.085);
  for(const side of [-1,1])shape(rig.body,'#526472',side*.25,.28,0,.055,.16,.06);
  const helmet=new T.Mesh(new T.SphereGeometry(.225,16,8,0,Math.PI*2,0,Math.PI/2),matte('#f4c75b'));helmet.position.y=.59;rig.head.add(helmet);
  const antenna=extra('antenna',rig.head);shape(antenna,'#e36e42',0,.73,0,.04,.04,.04);
  for(let i=0;i<3;i++){const slat=new T.Mesh(new T.BoxGeometry(.2,.018,.015),matte('#374956'));slat.position.set(0,.23+i*.055,.18);rig.body.add(slat);}
 }else if(code==='MEX'){
  shape(rig.body,'#7d9852',0,.24,0,.2,.14,.27);shape(rig.head,'#92a75f',0,.38,.15,.17,.14,.16);eyes(.42,.265,.1);
  const tail=extra('tail',rig.body);const curve=new T.CatmullRomCurve3([new T.Vector3(0,.2,-.17),new T.Vector3(.12,.18,-.35),new T.Vector3(.16,.12,-.5)]);
  tail.add(new T.Mesh(new T.TubeGeometry(curve,12,.055,7,false),matte('#617c43')));
  for(let i=0;i<7;i++){const crest=new T.Mesh(new T.ConeGeometry(.045,.115,4),matte(i%2?'#c2b86c':'#708646'));crest.position.set(0,.385+i*.014,-.2+i*.065);rig.body.add(crest);}
 }else if(code==='GTM'){
  shape(rig.body,'#9b7353',0,.25,0,.19,.19,.23);shape(rig.head,'#a3805d',0,.46,.12,.16,.145,.17);
  for(const side of [-1,1]){shape(rig.head,'#59483d',side*.13,.57,.07,.06,.07,.04);shape(rig.head,'#e3ceb0',side*.085,.48,.25,.065,.055,.025);}
  eyes(.49,.245,.085);shape(rig.head,'#d6b991',0,.4,.27,.09,.055,.12);shape(rig.head,'#332e29',0,.42,.37,.038,.03,.025);
  const tail=extra('tail',rig.body);
  for(let i=0;i<8;i++)shape(tail,i%2?'#e0c399':'#70533e',Math.sin(i*.17)*.07,.25+i*.048,-.21-i*.035,.065,.045,.055);
 }else if(code==='CRI'){
  for(const [y,z,s] of [[.15,-.18,.13],[.2,0,.11],[.29,.15,.14]])shape(rig.body,'#9c4f32',0,y,z,s,s*.75,s);
  eyes(.32,.25,.08);
  const leaf=extra('leaf',rig.head),g=new T.SphereGeometry(1,12,8);g.scale(.18,.024,.3);g.rotateX(-.8);
  const foliage=new T.Mesh(g,matte('#6caa3e'));foliage.position.set(.04,.47,.02);leaf.add(foliage);
  for(const side of [-1,1]){const feeler=new T.Mesh(new T.CylinderGeometry(.009,.012,.17,5),matte('#663e2d'));feeler.position.set(side*.09,.4,.24);feeler.rotation.z=-side*.4;rig.head.add(feeler);}
 }else{
  shape(rig.body,'#bc7647',0,.24,0,.25,.15,.22);shape(rig.body,'#dfad73',0,.29,.13,.18,.1,.12);
  for(const side of [-1,1]){shape(rig.head,'#ba7546',side*.12,.43,.12,.025,.13,.025);shape(rig.head,'#fff1c7',side*.12,.53,.12,.048,.055,.04);shape(rig.head,'#243932',side*.12,.54,.15,.025,.028,.02);}
  const claws=extra('claws',rig.body);
  for(const side of [-1,1]){shape(claws,'#d99b62',side*.27,.29,.16,.09,.09,.13);shape(claws,'#eed0a2',side*.3,.34,.24,.045,.07,.075);}
 }
 finishCreature(rig);rig.root.updateMatrixWorld(true);
 const size=new T.Box3().setFromObject(rig.root).getSize(new T.Vector3());rig.figure.scale.setScalar(h/size.y);rig.root.userData.species=code;rig.root.userData.collisionHeight=h;
 return rig;
}
