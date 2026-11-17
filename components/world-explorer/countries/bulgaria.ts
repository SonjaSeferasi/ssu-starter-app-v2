import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bandedFlagTexture,chimneyStack,finishProps,flagMaterial,lampPost,texturedStone,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Bulgaria: Boyana Church at the foot of Vitosha (SRS-632.36). In a walled
 * garden of tall dark trees stands the small church built in three parts:
 * the oldest, a brick cube with a dome on a round drum; the taller middle
 * church with its own dome; and the plain stone west wing under a tiled
 * roof. A bell hangs in a wooden frame beside the gate, where the flag
 * flies. Revival houses with timber upper floors stand along the lane.
 * Behind, forest climbs to the boulder fields and bare summit of the
 * mountain. The route carries rose bushes, wooden fences, lanterns and
 * red and white martenitsi. Scenery only: nothing collides. */
const C={grass:'#7f9c5a',grassDark:'#6d8a4c',path:'#d9cfb8',brick:'#f0d8cc',brickBand:'#fbf2e4',stone:'#d6cdb8',stoneDark:'#b9b09a',tile:'#9a5a40',tileDark:'#7c4634',drum:'#e9c9b6',shade:'#3a2e26',gold:'#e0b030',white:'#f6f2e8',timber:'#5a4030',timberDark:'#3f2c20',
 iron:'#22262a',wood:'#7a5c40',rose:'#e0507a',roseDark:'#b8324e',leaf:'#3f7a3a',red:'#d62612',boulder:'#b4b0a6',boulderDark:'#96928a',bell:'#b08a3a',glass:'#3a4652'} as const;
const base=europeEnvironment('BGR',{landmark:false,flat:true,town:false});
export const boyana={parkTop:-1,churchX:52,churchZ:-24,gateX:30,bellX:37,houses:[2,12,76,88]} as const;
const brickwork=()=>texturedStone('sandstone-blocks','#c47a66',1.1,.95);

function park(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='boyana-walled-garden';root.add(group);const g=new Builder(),s=new Builder(),top=boyana.parkTop,from=-60,to=finish+100,x=boyana.churchX;
 box(g,to-from,top+5,60,C.grass,(from+to)/2,-5,-46.5);for(let k=0;k<(low?12:24);k++)g.add(new T.SphereGeometry(1,8,5),C.grassDark,[from+k*(to-from)/(low?12:24)+r()*4,-4.2,-16.3],[0,0,0],[5,2.9,1.4]);
 box(g,2.2,.05,7,C.path,boyana.gateX,top,-22);box(g,x-boyana.gateX+4,.05,2,C.path,(x+boyana.gateX)/2+1,top,-21);
 // The garden wall with its tiled coping, and the gate under a little roof.
 for(const [a,b] of [[x-26,boyana.gateX-1.3],[boyana.gateX+1.3,x+22]] as const){box(s,b-a,1.5,.5,C.stone,(a+b)/2,top,-18.6);roof(g,b-a+.2,.3,.9,C.tile,(a+b)/2,top+1.5,-18.6);}
 for(const side of [-1,1])box(s,.7,2.4,.7,C.stone,boyana.gateX+side*1.3,top,-18.6);roof(g,4,.8,1.6,C.tile,boyana.gateX,top+2.4,-18.6);
 // Boulder fields below the summit: the mountain's stone rivers.
 for(let k=0;k<(low?24:60);k++){const bx=x+16+r()*(finish+30-x),bz=-36-r()*10;g.add(new T.DodecahedronGeometry(1,0),k%2?C.boulder:C.boulderDark,[bx,top+.3,bz],[k,k*2,0],[.7+r()*.9,.5+r()*.5,.6+r()*.6],.08);}
 g.mesh(group,vertexMaterial(.97),'lawns-paths-wall-coping-and-boulder-fields');s.mesh(group,vertexMaterial(.98),'garden-wall-and-gate-posts');group.userData={feature:'Walled garden and stone rivers'};
}

function church(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='boyana-church';root.add(group);const s=new Builder(.5),m=new Builder(),p=new Builder(),x=boyana.churchX,y=boyana.parkTop,z=boyana.churchZ;
 const bands=(cx:number,w:number,h:number,d:number,cz:number)=>{for(let level=.5;level<h-.2;level+=.8)box(p,w+.06,.12,d+.06,C.brickBand,cx,y+level,cz);};
 const dome=(cx:number,top:number,radius:number,cz:number)=>{cyl(s,radius,radius,1.5,C.drum,cx,top,cz,low?8:12);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;p.add(new T.BoxGeometry(radius*.3,.9,.08),C.shade,[cx+Math.sin(a)*radius,top+.75,cz+Math.cos(a)*radius],[0,a,0]);}cyl(p,radius*1.12,radius*1.12,.12,C.brickBand,cx,top+1.5,cz,low?8:12);p.add(new T.SphereGeometry(radius*1.12,low?8:14,6,0,Math.PI*2,0,Math.PI/2),C.tile,[cx,top+1.62,cz],[0,0,0],[1,.62,1]);box(p,.06,.6,.06,C.gold,cx,top+1.62+radius*.7,cz);box(p,.3,.06,.06,C.gold,cx,top+2+radius*.7,cz);};
 // East church: a brick cube with an apse and a dome on its drum.
 box(s,4.4,3.6,4.4,C.brick,x+5.2,y,z-2.2);bands(x+5.2,4.4,3.6,4.4,z-2.2);cyl(s,1.5,1.5,2.8,C.brick,x+7.4,y,z-2.2,low?8:12);p.add(new T.SphereGeometry(1.55,low?8:12,5,0,Math.PI*2,0,Math.PI/2),C.tile,[x+7.4,y+2.8,z-2.2],[0,0,0],[1,.5,1]);roof(p,4.7,.7,4.7,C.tile,x+5.2,y+3.6,z-2.2);dome(x+5.2,y+4,1.3,z-2.2);
 // Middle church: taller, two storeys, with its own dome.
 box(s,4.6,5.4,4.8,C.brick,x+.6,y,z-2.4);bands(x+.6,4.6,5.4,4.8,z-2.4);roof(p,4.9,.8,5.1,C.tileDark,x+.6,y+5.4,z-2.4);dome(x+.6,y+5.9,1.4,z-2.4);for(const dx of [-1.1,1.1])archedWindow(s,p,x+.6+dx,y+3.2,z+.04,.6,1.3,{frame:C.brickBand,glass:C.shade});archedWindow(s,p,x+.6,y+.9,z+.04,.7,1.6,{frame:C.brickBand,glass:C.shade});
 // West wing: plain stone under a tiled roof, with the door and a painted saint above it.
 box(m,6.4,4.2,5.2,C.stone,x-5,y,z-2.6);roof(p,6.8,1.5,5.6,C.tile,x-5,y+4.2,z-2.6);box(p,1.1,2,.1,C.timberDark,x-5,y,z+.05);p.add(new T.CylinderGeometry(.5,.5,.06,low?10:16),C.gold,[x-5,y+2.8,z+.05],[Math.PI/2,0,0]);p.add(new T.SphereGeometry(.2,8,6),'#c98a5a',[x-5,y+2.86,z+.1],[0,0,0],[1,1.2,.3]);for(const dx of [-2.2,2.2])box(p,.6,.9,.08,C.glass,x-5+dx,y+2.2,z+.04);
 s.mesh(group,brickwork(),'brick-east-and-middle-churches');m.mesh(group,vertexMaterial(.97),'stone-west-wing');p.mesh(group,vertexMaterial(.75),'pale-bands-domes-and-tiled-roofs');group.userData={landmark:'Boyana Church',parts:3,domes:2};
}

function lane(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='revival-houses-and-bell';root.add(group);const s=new Builder(),p=new Builder(),y=boyana.parkTop;
 // Revival houses: white ground floor, a timber upper floor leaning out, broad tiled roof.
 boyana.houses.forEach((x,k)=>{const w=5+(k%2),z=-22-(k%2)*2;box(s,w-.6,2.2,4.4,C.white,x,y,z-2.2);box(s,w,2.2,5,k%2?'#8a5a3c':'#6e4630',x,y+2.2,z-2.1);box(p,w+.06,.14,5.06,C.timberDark,x,y+2.2,z-2.1);for(let j=0;j<(low?2:4);j++){const wx=x-w/2+w*(j+.5)/(low?2:4);box(p,w*.13,1,.06,C.glass,wx,y+2.8,z+.42);box(p,w*.16,.08,.1,C.white,wx,y+2.72,z+.44);p.strut(new T.Vector3(wx,y+1.5,z+.02),new T.Vector3(wx,y+2.2,z+.38),.05,C.timberDark,4,1);}
  box(p,.8,1.6,.08,C.timberDark,x-1,y,z+.03);roof(p,w+1.2,1,6.2,k%2?C.tile:C.tileDark,x,y+4.4,z-2.1);cyl(s,.2,.22,.8,C.white,x+w*.3,y+5,z-2.6,6);});
 // The bell in its wooden frame, and the flag by the gate.
 const bx=boyana.bellX,bz=-21;for(const dx of [-.7,.7])cyl(p,.08,.1,2.4,C.timber,bx+dx,y,bz,6);box(p,1.8,.12,.14,C.timber,bx,y+2.4,bz);roof(p,2.2,.5,1,C.tile,bx,y+2.52,bz);cyl(p,.1,.3,.5,C.bell,bx,y+1.7,bz,10);p.add(new T.SphereGeometry(.06,6,5),C.iron,[bx,y+1.62,bz]);
 cyl(p,.05,.07,4.6,C.iron,boyana.gateX-3,y,-19.6,5);s.mesh(group,vertexMaterial(.95),'house-walls-and-chimneys');p.mesh(group,vertexMaterial(.8),'timber-floors-roofs-bell-and-mast');wavingFlag(group,flag,boyana.gateX-2.94,y+3.9,-19.6,2,'bulgaria-flag',.6);group.userData={feature:'Revival houses, bell and flag'};
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function roseBush(b:Builder,x:number,y:number,z:number,seed:number){b.add(new T.SphereGeometry(.34,8,6),C.leaf,[x,y+.3,z],[0,0,0],[1.2,.9,.8]);for(let k=0;k<6;k++){const a=k/6*Math.PI*2+seed;b.add(new T.SphereGeometry(.08,6,5),(seed+k)%3?C.rose:C.roseDark,[x+Math.cos(a)*.3,y+.34+Math.sin(a*2)*.12,z+.14+Math.sin(a)*.1]);}}
/** A martenitsa: red and white tassels tied to a post. */
function martenitsa(b:Builder,x:number,y:number,z:number){cyl(b,.04,.05,1.5,C.wood,x,y,z,5);b.strut(new T.Vector3(x,y+1.4,z+.05),new T.Vector3(x+.3,y+1.3,z+.05),.02,C.red,3,1);for(const [dx,color] of [[.22,C.red],[.38,C.white]] as const){b.add(new T.SphereGeometry(.07,6,5),color,[x+dx,y+1.22,z+.05]);b.add(new T.ConeGeometry(.08,.3,6),color,[x+dx,y+1.02,z+.05]);}}
const post=(b:Builder,x:number,y:number,z:number)=>box(b,.1,.9,.1,C.timber,x,y,z);

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'three-part-church-of-brick-and-stone','two-domes-on-round-drums','garden-wall-and-roofed-gate','bell-in-a-wooden-frame','revival-houses-with-timber-upper-floors','boulder-fields-and-vitosha-summit','rose-bushes-and-martenitsi']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35900),detail=new T.Group();detail.name='boyana-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  park(detail,finish,r,low);church(detail,low);lane(detail,flagMaterial(bandedFlagTexture([['#ffffff',1],['#00966e',1],['#d62612',1]])),low);
  const vitosha=createHeightfield(detail,{name:'vitosha-mountain',x:finish/2,y:-12,z:-122,width:finish+260,depth:76,segments:[low?40:90,low?14:28],height:ridgedRange(5823,{peaks:4,height:44,sharpness:.9}),color:mountainColor({snowLine:41,treeLine:24,rock:'#9a968c',forest:'#4e7442',snow:'#eef3f5'})});vitosha.userData={feature:'Vitosha'};
  const slopes=new T.Group();slopes.name='vitosha-forest-slopes';detail.add(slopes);const m=new Builder(.5);for(const [dx,w,h] of [[-50,60,18],[36,70,22],[124,66,20],[210,60,17]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#4f7742':'#476c3b',[dx,-5,-84],[0,0,0],[w,h,14],.1);m.mesh(slopes,vertexMaterial(.98),'wooded-foothills');
  const giants:Placement[]=[],pines:Placement[]=[];for(const [dx,dz,scale] of [[-12,-27,1.7],[-9.5,-31,1.5],[11.5,-28,1.8],[14,-32,1.5],[2,-33,1.6]] as const)giants.push({x:boyana.churchX+dx,y:boyana.parkTop,z:dz,scale,rotation:dx});
  for(let k=0;k<(low?20:50);k++){const x=-44+r()*(finish+104),z=-31-r()*20;if(Math.abs(x-boyana.churchX)<12&&z>-36)continue;pines.push({x,y:boyana.parkTop,z,scale:.8+r()*.6,rotation:r()*6});}plantGrove(detail,'conifer',giants,{low,name:'garden-sequoias'});plantGrove(detail,'conifer',pines,{low,name:'vitosha-pines'});
  const jays=createFlock(detail,{name:'forest-jays',count:low?5:10,centre:[finish*.5,9,-20],radius:[30,2.5,5],speed:.24,size:.55,color:'#7a5a4a',wing:'#3f6a9a',seed:193});
  let reduced=context.reducedMotion;jays.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;jays.update(time);},setReducedMotion(value){reduced=value;jays.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*157+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){for(let x=from;x<=to+.01;x+=1.3)post(b,x,y,rear);for(const dy of [.4,.78])box(b,to-from+.1,.07,.05,C.wood,(from+to)/2,y+dy,rear);roseBush(b,from+.8,y,rear+.3,seed);if(w>4.4)martenitsa(b,to-.8,y,rear+.3);if(w>7)lampPost(b,glow,0,y,rear+.36);}
  else if(t==='slope'||t==='stairs'){for(let x=from;x<=to+.01;x+=1.3){post(b,x,surface(x),rear);if(x+1.3<=to+.01)b.strut(new T.Vector3(x,surface(x)+.8,rear),new T.Vector3(x+1.3,surface(x+1.3)+.8,rear),.035,C.wood,4,1);}if(t==='slope')roseBush(b,0,surface(0),rear+.3,seed);}
  else if(t==='rooftop'){chimneyStack(b,from+.6,y,rear+.1,2,{brick:C.white,cap:C.stoneDark,pot:C.tile});if(w>4.4)chimneyStack(b,to-.8,y,rear+.1,1,{brick:C.white,cap:C.stoneDark,pot:C.tile});}
  else if(t==='rock'){roseBush(b,(seed%2?.3:-.3),surface(0),rear+.3,seed);}
  else if(t==='terrace'){box(b,to-from,.6,.34,C.stone,(from+to)/2,y,rear);roseBush(b,from+.8,y,rear+.3,seed);martenitsa(b,to-.8,y,rear+.3);}
  finishProps(root,b,glow,'boyana-rose-bushes-fences-and-martenitsi');
 },
};
