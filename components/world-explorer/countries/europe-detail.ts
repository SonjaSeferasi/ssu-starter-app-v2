import * as T from 'three';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,vertexMaterial} from '../kit/common';
import {markSurface,type SurfaceSet} from '../kit/surface-maps';

/** Shared parts for the detailed European country scenes (UR-632): windows,
 * turrets, flags and street furniture, each taking its country's colours.
 * Everything here is decorative geometry for a Builder; nothing collides. */
export const QUARTER=Math.PI/4;
/** Street furniture stands at or behind this depth on a platform, clear of the walking lane. */
export const REAR=-1.12;
export const texturedStone=(set:SurfaceSet,tint:string,repeat=1.5,roughness=.9)=>{const material=vertexMaterial(roughness);markSurface(material,set,tint,repeat);return material;};
export const glowMaterial=(color='#ffe9b0',intensity=.7)=>vertexMaterial(.4,{emissive:new T.Color(color),emissiveIntensity:intensity});
/** Copy a part built facing +z at the origin to a place and a turn about y. */
/** Scales a finished landmark about a pivot and sets it further back, so a
 * tall monument stands deep enough in the view for its top to stay on screen. */
export function settle(group:T.Object3D,pivot:readonly [number,number,number],scale:number,back:number,lift=0){group.scale.setScalar(scale);group.position.set(pivot[0]*(1-scale),pivot[1]*(1-scale)+lift,pivot[2]*(1-scale)-back);}
export function place(target:Builder,part:T.BufferGeometry,x:number,y:number,z:number,turn=0){target.parts.push(part.clone().applyMatrix4(new T.Matrix4().makeRotationY(turn).setPosition(x,y,z)));}
/** The four faces of a square plan: turn about y and the outward direction. */
export const FACES=[[0,0,1],[Math.PI/2,1,0],[Math.PI,0,-1],[-Math.PI/2,-1,0]] as const;
/** A four-sided pyramid or frustum with its faces square to the axes. */
export const pyramid=(b:Builder,top:number,bottom:number,h:number,c:string,x:number,y:number,z:number)=>b.add(new T.CylinderGeometry(top*Math.SQRT1_2*2,bottom*Math.SQRT1_2*2,h,4),c,[x,y+h/2,z],[0,QUARTER,0]);
export type WindowColors={frame:string;glass:string};
/** A pointed Gothic window: dark glass, stone frame, mullions and a pointed head. */
export function pointedWindow(stone:Builder,plain:Builder,x:number,y:number,z:number,w:number,h:number,low:boolean,c:WindowColors){
 box(stone,w+.26,h+.2,.1,c.frame,x,y-.1,z);box(plain,w,h,.08,c.glass,x,y,z+.06);
 stone.add(new T.ConeGeometry((w+.26)*Math.SQRT1_2,w*.62,4),c.frame,[x,y+h+w*.31,z],[0,QUARTER,0],[1,1,.1]);
 plain.add(new T.ConeGeometry(w*Math.SQRT1_2,w*.5,4),c.glass,[x,y+h+w*.25,z+.06],[0,QUARTER,0],[1,1,.08]);
 if(!low){for(const offset of [-w/6,w/6])box(stone,.07,h,.06,c.frame,x+offset,y,z+.11);box(stone,w,.07,.06,c.frame,x,y+h*.55,z+.11);}
}
/** A round-headed window or opening (Romanesque, Moorish, Classical). `horseshoe` widens the head. */
export function archedWindow(stone:Builder,plain:Builder,x:number,y:number,z:number,w:number,h:number,c:WindowColors,horseshoe=false){
 const r=w/2*(horseshoe?1.16:1);
 box(stone,w+.22,h+.05,.08,c.frame,x,y-.05,z);stone.add(new T.CircleGeometry(r+.13,14,0,Math.PI),c.frame,[x,y+h,z+.045]);
 box(plain,w,h,.07,c.glass,x,y,z+.05);plain.add(new T.CircleGeometry(r,14,horseshoe?-.3:0,Math.PI+(horseshoe?.6:0)),c.glass,[x,y+h,z+.09]);
}
/** A pinnacle: square shaft, slender spire and finial. */
export function pinnacle(stone:Builder,x:number,y:number,z:number,size:number,low:boolean,c:{shaft:string;spire:string;finial:string}){box(stone,size*.42,size*.5,size*.42,c.shaft,x,y,z);stone.add(new T.ConeGeometry(size*.27,size*1.5,4),c.spire,[x,y+size*1.25,z],[0,QUARTER,0]);if(!low)stone.add(new T.SphereGeometry(size*.09,6,5),c.finial,[x,y+size*2.05,z]);}
/** An octagonal turret with string courses and a spirelet. */
export function turret(stone:Builder,plain:Builder,x:number,y:number,z:number,radius:number,height:number,low:boolean,c:{wall:string;trim:string;cap:string;finial:string}){
 cyl(stone,radius,radius*1.04,height,c.wall,x,y,z,8);cyl(stone,radius*1.18,radius*1.18,.22,c.trim,x,y+height,z,8);
 for(let ring=1;ring<(low?2:4);ring++)cyl(stone,radius*1.08,radius*1.08,.12,c.trim,x,y+height*ring/4,z,8);
 cone(plain,radius*1.05,radius*2.6,c.cap,x,y+height+.22,z,8);plain.add(new T.SphereGeometry(radius*.2,6,5),c.finial,[x,y+height+.3+radius*2.6,z]);
}
/** A Doric or Tuscan column: tapered shaft, cushion capital and square abacus. */
export function column(b:Builder,x:number,y:number,z:number,radius:number,height:number,color:string,segments=12){
 cyl(b,radius*.82,radius,height*.9,color,x,y,z,segments);cyl(b,radius*1.25,radius*.84,height*.045,color,x,y+height*.9,z,segments);box(b,radius*2.7,height*.055,radius*2.7,color,x,y+height*.945,z);
}
/** A square crenellated tower. `merlon` chooses flat or pyramid-capped battlements. */
export function battlementTower(stone:Builder,x:number,y:number,z:number,w:number,h:number,c:{wall:string;trim:string},merlon:'flat'|'pyramid'='flat'){
 box(stone,w,h,w,c.wall,x,y,z);box(stone,w+.24,.3,w+.24,c.trim,x,y+h-.9,z);const n=Math.max(3,Math.round(w/.85));
 for(const [turn,dx,dz] of FACES)for(let k=0;k<n;k++){const along=-w/2+w*(k+.5)/n,mx=x+dx*(w/2-.14)+(dx?0:along),mz=z+dz*(w/2-.14)+(dz?0:along);if(k%2)continue;box(stone,dx?.3:w/n*.9,.6,dz?.3:w/n*.9,c.wall,mx,y+h,mz);if(merlon==='pyramid')pyramid(stone,.02,Math.min(.3,w/n*.9)/2,.3,c.trim,mx,y+h+.6,mz);void turn;}
}
/** A flag drawn from horizontal (or vertical) bands: [colour, share] pairs. */
export function bandedFlagTexture(bands:readonly (readonly [string,number])[],vertical=false){
 const total=bands.reduce((sum,band)=>sum+band[1],0),stops:{to:number;rgb:number[]}[]=[];let run=0;
 for(const [color,share] of bands){run+=share/total;const c=new T.Color(color);stops.push({to:run,rgb:[c.r*255,c.g*255,c.b*255]});}
 return pixelTexture(48,(u,v)=>{const t=vertical?u:1-v,band=stops.find(stop=>t<=stop.to+1e-6)||stops[stops.length-1];return[band.rgb[0],band.rgb[1],band.rgb[2],255];},true,false);
}
export const flagMaterial=(map:T.Texture)=>new T.MeshStandardMaterial({map,side:T.DoubleSide,roughness:.8});
/** A cloth flag with a gentle wave, flying from x toward +x. */
export function wavingFlag(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,width:number,name:string,ratio=.5){
 const geometry=new T.PlaneGeometry(width,width*ratio,8,2),p=geometry.getAttribute('position');
 for(let i=0;i<p.count;i++){const along=p.getX(i)/width+.5;p.setZ(i,Math.sin(along*5)*width*.05*along);}geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x+width/2,y,z);mesh.name=name;mesh.castShadow=false;parent.add(mesh);return mesh;
}
// Street furniture, in a platform's own coordinates.
export function lampPost(b:Builder,glow:Builder,x:number,y:number,z:number,iron='#22262a',lamp='#f4efdf'){cyl(b,.11,.16,.5,iron,x,y,z,8);cyl(b,.045,.06,2.5,iron,x,y+.5,z,6);box(b,.3,.05,.3,iron,x,y+3,z);cone(b,.19,.2,iron,x,y+3.38,z,6);glow.add(new T.CylinderGeometry(.13,.09,.34,6),lamp,[x,y+3.2,z]);}
export function bench(b:Builder,x:number,y:number,z:number,iron='#22262a',wood='#6f5136'){for(const offset of [-.7,.7]){box(b,.07,.45,.5,iron,x+offset,y,z);box(b,.07,.5,.07,iron,x+offset,y+.45,z-.2);}for(let k=0;k<3;k++)box(b,1.7,.05,.13,wood,x,y+.45,z-.15+k*.16);for(let k=0;k<2;k++)box(b,1.7,.13,.04,wood,x,y+.62+k*.2,z-.22);}
export function railing(b:Builder,from:number,to:number,y:number,z:number,iron='#22262a',tip='#d2a63f'){box(b,to-from,.05,.05,iron,(from+to)/2,y+.95,z);box(b,to-from,.04,.04,iron,(from+to)/2,y+.2,z);for(let x=from;x<=to+.01;x+=.28){box(b,.035,1.05,.035,iron,x,y,z);b.add(new T.ConeGeometry(.045,.13,4),tip,[x,y+1.11,z]);}}
export function balustrade(b:Builder,from:number,to:number,y:number,z:number,c:{rail:string;base:string;baluster:string}){box(b,to-from,.14,.3,c.rail,(from+to)/2,y+.78,z);box(b,to-from,.12,.3,c.base,(from+to)/2,y,z);for(let x=from+.2;x<to;x+=.42)cyl(b,.07,.1,.66,c.baluster,x,y+.12,z,6);for(const x of [from,to])box(b,.36,1.05,.36,c.baluster,x,y,z);}
export function chimneyStack(b:Builder,x:number,y:number,z:number,pots:number,c:{brick:string;cap:string;pot:string}){box(b,.3+pots*.26,.85,.42,c.brick,x,y,z);box(b,.4+pots*.26,.1,.52,c.cap,x,y+.85,z);for(let k=0;k<pots;k++)cyl(b,.07,.095,.36,c.pot,x+(k-(pots-1)/2)*.26,y+.95,z,8);}
/** A potted tree or shrub: terracotta pot, short trunk and a rounded crown, with optional fruit or blossom dots. */
export function pottedTree(b:Builder,x:number,y:number,z:number,size:number,c:{pot:string;trunk:string;leaf:string;fruit?:string},seed=1){
 cyl(b,.26*size,.19*size,.4*size,c.pot,x,y,z,10);cyl(b,.035*size,.045*size,.55*size,c.trunk,x,y+.4*size,z,5);b.add(new T.IcosahedronGeometry(.42*size,1),c.leaf,[x,y+1.25*size,z],[0,seed,0],[1,1.05,1],.12);
 if(c.fruit)for(let k=0;k<6;k++){const a=k*1.05+seed,h=.95+((k*37)%10)/22;b.add(new T.SphereGeometry(.055*size,6,5),c.fruit,[x+Math.cos(a)*.38*size,y+h*size*1.25,z+Math.sin(a)*.3*size+.12*size]);}
}
/** Finish a platform's props: one vertex-coloured mesh and one glowing lamp mesh. */
export function finishProps(root:T.Object3D,b:Builder,glow:Builder,name:string){
 if(b.parts.length){const props=b.mesh(root,vertexMaterial(.72),name);props.userData={decorative:true,collidable:false};}
 if(glow.parts.length){const lamps=glow.mesh(root,glowMaterial('#ffe9b0',.8),name+'-lamps');lamps.castShadow=false;}
}

// Larger building blocks shared by several countries.
export type FacadeColors={wall:string;trim:string;glass:string;roof:string};
/** A grid of windows on a +z face: `arched` gives round heads, otherwise square sashes with sills. */
export function windowGrid(stone:Builder,plain:Builder,x:number,y:number,z:number,w:number,h:number,columns:number,rows:number,c:FacadeColors,arched=false,low=false){
 const stepX=w/columns,stepY=h/rows,ww=Math.min(.8,stepX*.5),wh=Math.min(1.5,stepY*.58);
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const wx=x-w/2+stepX*(col+.5),wy=y+stepY*row+stepY*.22;
  if(arched)archedWindow(stone,plain,wx,wy,z,ww,wh*.8,{frame:c.trim,glass:c.glass});else{box(plain,ww,wh,.07,c.glass,wx,wy,z+.03);if(!low){box(stone,ww+.2,.1,.14,c.trim,wx,wy-.1,z+.05);box(stone,ww+.24,.12,.16,c.trim,wx,wy+wh,z+.05);}}}
}
/** A plastered townhouse facing +z: plinth, storeys of windows, cornice and a roof (gabled to the street, hipped, or a flat parapet). */
export function townhouse(stone:Builder,plain:Builder,x:number,y:number,z:number,w:number,h:number,d:number,c:FacadeColors,options:{rows?:number;roof?:'gable'|'hip'|'parapet';arched?:boolean;door?:boolean;low?:boolean}={}){
 const rows=options.rows??Math.max(2,Math.round(h/2.4)),low=options.low??false;
 box(stone,w,h,d,c.wall,x,y,z-d/2);box(stone,w+.1,.5,d+.1,c.trim,x,y,z-d/2);box(stone,w+.2,.22,d+.2,c.trim,x,y+h-.11,z-d/2);
 windowGrid(stone,plain,x,y+(options.door?h/rows:.3),z,w-.4,h-(options.door?h/rows:.3)-.4,Math.max(2,Math.round(w/1.5)),options.door?rows-1:rows,c,options.arched,low);
 if(options.door){archedWindow(stone,plain,x,y,z,1,h/rows*.62,{frame:c.trim,glass:'#3a2a20'});if(w>4)for(const side of [-1,1])box(plain,.9,h/rows*.5,.07,c.glass,x+side*w*.3,y+.5,z+.03);}
 if(options.roof==='gable'){stone.add(new T.CylinderGeometry(.02,w/2,Math.min(2.6,w*.55),3,1),c.wall,[x,y+h+Math.min(2.6,w*.55)/2,z-.12],[0,-Math.PI/2,0],[.24,1,1]);roof(plain,d,Math.min(2.6,w*.55),w+.3,c.roof,x,y+h,z-d/2,Math.PI/2);}
 else if(options.roof==='parapet'){box(stone,w,.7,.3,c.wall,x,y+h,z-.15);box(stone,w+.2,.14,.4,c.trim,x,y+h+.7,z-.15);}
 else pyramid(plain,w*.12,w*.56,Math.min(2.2,w*.42),c.roof,x,y+h,z-d/2);
}
/** A drum, a ribbed dome and a lantern with a finial. */
export function drumDome(stone:Builder,plain:Builder,x:number,y:number,z:number,radius:number,drumHeight:number,c:{wall:string;trim:string;dome:string;finial:string;glass:string},options:{sides?:number;stretch?:number;low?:boolean;cross?:boolean}={}){
 const sides=options.sides??8,stretch=options.stretch??1.05,low=options.low??false;
 cyl(stone,radius,radius*1.03,drumHeight,c.wall,x,y,z,low?Math.min(sides,12):sides);cyl(stone,radius*1.08,radius*1.08,.25,c.trim,x,y+drumHeight,z,low?12:Math.max(sides,16));
 for(let k=0;k<sides;k++){const a=(k+.5)/sides*Math.PI*2;if(drumHeight>1.6)plain.add(new T.BoxGeometry(radius*.34,drumHeight*.55,.08),c.glass,[x+Math.sin(a)*radius*1.0,y+drumHeight*.5,z+Math.cos(a)*radius*1.0],[0,a,0]);}
 plain.add(new T.SphereGeometry(radius*1.02,low?12:20,low?6:10,0,Math.PI*2,0,Math.PI/2),c.dome,[x,y+drumHeight+.25,z],[0,0,0],[1,stretch,1]);
 if(!low)for(let k=0;k<sides;k++){const a=k/sides*Math.PI*2;plain.add(new T.TorusGeometry(radius*1.03,.05,4,10,Math.PI/2),c.trim,[x,y+drumHeight+.25,z],[0,a-Math.PI/2,0],[1,stretch,1]);}
 const top=y+drumHeight+.25+radius*1.02*stretch;cyl(stone,radius*.2,radius*.24,radius*.5,c.wall,x,top-.05,z,8);cone(plain,radius*.27,radius*.5,c.dome,x,top+radius*.45,z,8);plain.add(new T.SphereGeometry(radius*.09,8,6),c.finial,[x,top+radius*1.02,z]);
 if(options.cross){box(plain,.06,radius*.5,.06,c.finial,x,top+radius*1.05,z);box(plain,radius*.3,.06,.06,c.finial,x,top+radius*1.33,z);}
 return top+radius*1.6;
}
/** A roof dormer with a small window. */
export function dormer(b:Builder,x:number,y:number,z:number,wall:string,glass:string,roofColor:string){box(b,.9,.75,.5,wall,x,y,z);box(b,.5,.45,.06,glass,x,y+.14,z+.25);roof(b,.6,.4,1.1,roofColor,x,y+.75,z,Math.PI/2);}
/** A window box of flowers. */
export function flowerBox(b:Builder,from:number,to:number,y:number,z:number,wood:string,blooms:readonly string[],leaf='#4a7d3f'){box(b,to-from,.16,.2,wood,(from+to)/2,y,z);for(let x=from+.08,k=0;x<to;x+=.16,k++){b.add(new T.SphereGeometry(.07,6,5),blooms[k%blooms.length],[x,y+.25+(k%2)*.04,z]);if(k%2)b.add(new T.SphereGeometry(.07,6,5),leaf,[x,y+.18,z+.07]);}}
/** A round café table with two chairs under a parasol. */
export function cafeTable(b:Builder,x:number,y:number,z:number,c:{metal:string;top:string;parasol:string;parasolAlt:string}){
 cyl(b,.03,.04,.72,c.metal,x,y,z,6);cyl(b,.36,.36,.04,c.top,x,y+.72,z,12);cyl(b,.025,.025,2.2,c.metal,x+.02,y+.76,z-.02,5);
 for(let k=0;k<8;k++)b.add(new T.CylinderGeometry(.02,.95,.42,3,1,false,k/8*Math.PI*2,Math.PI/4),k%2?c.parasol:c.parasolAlt,[x,y+2.6,z]);
 for(const side of [-1,1]){box(b,.34,.04,.34,c.top,x+side*.62,y+.44,z);box(b,.34,.42,.04,c.top,x+side*.62,y+.48,z-.17);for(const leg of [-.14,.14])box(b,.03,.44,.03,c.metal,x+side*.62+leg,y,z+leg);}
}
/** A market stall with a striped awning and goods on the counter. */
export function awningStall(b:Builder,x:number,y:number,z:number,c:{wood:string;stripeA:string;stripeB:string;goods:readonly string[]}){
 for(const sx of [-.9,.9])for(const sz of [-.4,.4])box(b,.06,2,.06,c.wood,x+sx,y,z+sz);box(b,1.9,.7,.9,c.wood,x,y,z);
 for(let k=0;k<6;k++)box(b,.34,.05,1.3,k%2?c.stripeA:c.stripeB,x-.85+k*.34,y+2,z);for(let k=0;k<6;k++)b.add(new T.SphereGeometry(.09,6,5),c.goods[k%c.goods.length],[x-.7+k*.28,y+.78,z]);
}
/** A statue on a stepped pedestal: a simple standing figure in bronze or stone. */
export function statue(b:Builder,x:number,y:number,z:number,height:number,c:{pedestal:string;figure:string}){
 box(b,1.1,.2,1.1,c.pedestal,x,y,z);box(b,.8,height*.45,.8,c.pedestal,x,y+.2,z);box(b,.95,.12,.95,c.pedestal,x,y+.2+height*.45,z);const base=y+.32+height*.45;
 cyl(b,.14,.2,height*.3,c.figure,x,base,z,8);cyl(b,.17,.14,height*.2,c.figure,x,base+height*.3,z,8);b.add(new T.SphereGeometry(.11,8,6),c.figure,[x,base+height*.56,z]);b.strut(new T.Vector3(x+.16,base+height*.45,z),new T.Vector3(x+.36,base+height*.3,z+.1),.04,c.figure,5,1);
}
/** A basin fountain with a central column and bowl. */
export function fountain(b:Builder,x:number,y:number,z:number,radius:number,c:{stone:string;water:string}){
 cyl(b,radius,radius*1.05,.42,c.stone,x,y,z,14);cyl(b,radius*.86,radius*.86,.06,c.water,x,y+.4,z,14);cyl(b,radius*.14,radius*.2,radius*.9,c.stone,x,y+.4,z,8);cyl(b,radius*.45,radius*.16,radius*.16,c.stone,x,y+.4+radius*.9,z,12);cyl(b,radius*.38,radius*.38,.04,c.water,x,y+.4+radius*1.05,z,12);cyl(b,.03,.04,radius*.5,'#cfe8ee',x,y+.4+radius*1.05,z,5);
}
