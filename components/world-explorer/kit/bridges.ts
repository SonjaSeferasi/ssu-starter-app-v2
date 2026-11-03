import * as T from 'three';
import {Builder,clamp,random,sphere,standard,v3,vertexMaterial} from './common';
import {markSurface,type SurfaceSet} from './surface-maps';

/** Country-styled bridge decks and moving platforms. Each builder removes the
 * placeholder island and models a deck whose walking surface sits on the
 * collision cap (y=0, top of planks at +0.015). Rails, posts and cables stay
 * behind or in front of the |z|<0.55 walking corridor. */
export type DeckStyle='rope'|'timber'|'roman-arch'|'sandstone'|'carved'|'paris'|'boardwalk'|'dock'|'slab'|'raft'|'log'|'swing'|'lift'|'dock-lift'|'garden'|'sandstone-lift'|'suspended'|'masonry-lift'|'canopy-log';
export type DeckPalette={wood:string;woodAlt:string;rope:string;stone:string;stoneAlt:string;metal:string;accent:string};
export const defaultDeckPalette:DeckPalette={wood:'#936a45',woodAlt:'#a47a50',rope:'#bfb08b',stone:'#c9bba0',stoneAlt:'#b4a68b',metal:'#4c5560',accent:'#c6a24a'};

function clear(root:T.Group){for(const name of ['country-platform-cap','country-platform-cliff']){const old=root.getObjectByName(name) as T.Mesh|undefined;if(old){old.removeFromParent();old.geometry.dispose();for(const material of Array.isArray(old.material)?old.material:[old.material])material.dispose();}}
 for(const object of [...root.children])if(object instanceof T.Mesh&&!object.name&&object.geometry.type==='SphereGeometry'){object.geometry.dispose();(object.material as T.Material).dispose();object.removeFromParent();}}

function planks(b:Builder,width:number,depth:number,a:string,c:string,r:()=>number,thickness=.18,gapEvery=0){
 const n=Math.ceil(width/.27);for(let i=0;i<n;i++){if(gapEvery&&i%gapEvery===gapEvery-1)continue;const x=-width/2+(i+.5)*width/n;b.add(new T.BoxGeometry(width/n-.004,thickness,depth*(.94+r()*.06)),i%3?a:c,[x,.015-thickness/2,(r()-.5)*.05],[0,(r()-.5)*.02,(r()-.5)*.015],[1,1,1],.08);}
}
function sagRope(b:Builder,a:T.Vector3,c:T.Vector3,sag:number,radius:number,color:string){const mid=a.clone().lerp(c,.5);mid.y-=sag;const curve=new T.QuadraticBezierCurve3(a,mid,c);b.add(new T.TubeGeometry(curve,16,radius,5,false),color);}

export function dressDeck(root:T.Group,definition:{id:string;width:number;depth:number;thickness:number},style:DeckStyle,palette:DeckPalette=defaultDeckPalette,options:{below?:number;surface?:{set:SurfaceSet;tint?:string;repeat?:number}}={}){
 clear(root);root.userData.surface=style;
 const width=definition.width,depth=Math.min(definition.depth,3.4),r=random([...definition.id].reduce((n,c)=>n*31+c.charCodeAt(0)>>>0,7)),b=new Builder(options.surface?.repeat??.5),below=options.below??6;
 const rails=(z:number,height=.78,posts=Math.max(2,Math.ceil(width/2.6)+1),color=palette.wood)=>{for(let i=0;i<posts;i++){const x=-width/2+.2+(width-.4)*i/(posts-1);b.add(new T.CylinderGeometry(.045,.06,height,7),color,[x,height/2,z]);b.add(new T.SphereGeometry(.07,7,5),palette.woodAlt,[x,height+.02,z]);if(i)sagRope(b,v3(-width/2+.2+(width-.4)*(i-1)/(posts-1),height-.06,z),v3(x,height-.06,z),.26,.03,palette.rope);}};
 switch(style){
  case'rope':case'timber':case'canopy-log':{
   planks(b,width,depth*.92,palette.wood,palette.woodAlt,r,.16);
   for(const z of [-1.42,1.42]){b.add(new T.BoxGeometry(width,.18,.14),palette.wood,[0,-.2,z]);if(z<0||style!=='rope')rails(z,style==='timber'?.9:.78);}
   for(const z of [-1.42,1.42])sagRope(b,v3(-width/2,-.1,z),v3(width/2,-.1,z),style==='rope'?.65:.32,.055,style==='rope'?palette.rope:palette.wood);
   if(style==='timber'){const posts=Math.max(2,Math.round(width/5));for(let i=0;i<posts;i++){const x=-width/2+1+(width-2)*i/Math.max(1,posts-1);for(const z of [-1.2,1.2])b.add(new T.CylinderGeometry(.13,.16,below,7),palette.woodAlt,[x,-below/2-.2,z]);b.strut(v3(x-1,-.3,-1.2),v3(x,-2.4,-1.2),.07,palette.wood,5);b.strut(v3(x+1,-.3,-1.2),v3(x,-2.4,-1.2),.07,palette.wood,5);}}
   break;
  }
  case'boardwalk':case'dock':{
   planks(b,width,depth*.96,palette.wood,palette.woodAlt,r,.2);
   const posts=Math.max(2,Math.round(width/2.2));for(let i=0;i<posts;i++){const x=-width/2+.3+(width-.6)*i/Math.max(1,posts-1);for(const z of [-1.4,1.4])b.add(new T.CylinderGeometry(.12,.14,below,8),style==='dock'?palette.metal:palette.woodAlt,[x,-below/2,z]);}
   if(style==='dock'){b.add(new T.BoxGeometry(width,.28,.16),palette.metal,[0,-.32,-1.5]);b.add(new T.BoxGeometry(width,.28,.16),palette.metal,[0,-.32,1.5]);for(let i=0;i<Math.ceil(width/1.4);i++){const x=-width/2+.4+i*1.4;b.add(new T.CylinderGeometry(.025,.025,1,6),palette.metal,[x,.5,-1.45]);}b.add(new T.BoxGeometry(width,.05,.05),palette.accent,[0,1,-1.45]);b.add(new T.BoxGeometry(width,.05,.05),palette.metal,[0,.55,-1.45]);for(const x of [-width/2+.5,width/2-.5])b.add(new T.CylinderGeometry(.14,.18,.4,10),'#2d3035',[x,.2,1.3]);}
   else rails(-1.45,.8);
   break;
  }
  case'roman-arch':case'sandstone':case'carved':case'paris':{
   const stone=palette.stone,alt=palette.stoneAlt,deck=.55;b.add(new T.BoxGeometry(width,deck,depth),stone,[0,-deck/2,0],[0,0,0],[1,1,1],.04);
   const blocks=Math.ceil(width/.9);for(let i=0;i<blocks;i++)b.add(new T.BoxGeometry(width/blocks-.03,.06,depth*.98),i%2?stone:alt,[-width/2+(i+.5)*width/blocks,.015-.03,0],[0,0,0],[1,1,1],.06);
   // Parapets stay at the back and a low kerb at the front edge.
   const parapet=style==='paris'?.6:style==='carved'?.5:.42;
   for(let i=0;i<blocks;i++){const x=-width/2+(i+.5)*width/blocks;b.add(new T.BoxGeometry(width/blocks-.04,parapet,.3),i%2?alt:stone,[x,parapet/2,-depth/2+.18],[0,0,0],[1,1,1],.05);if(style==='carved'&&i%2===0)b.add(new T.SphereGeometry(.12,8,6),palette.accent,[x,parapet+.08,-depth/2+.18]);}
   b.add(new T.BoxGeometry(width,.16,.22),alt,[0,.08,depth/2-.12]);
   // Arches below the deck, read from the camera side.
   const spans=Math.max(1,Math.round(width/(style==='roman-arch'?3.6:4.5))),span=width/spans,rise=style==='paris'?1.3:1.6,height=Math.min(below,style==='roman-arch'?5.5:4);
   for(let i=0;i<=spans;i++){const x=-width/2+i*span;b.add(new T.BoxGeometry(.7,height,depth*.9),i%2?alt:stone,[clamp(x,-width/2+.35,width/2-.35),-deck-height/2,0],[0,0,0],[1,1,1],.05);}
   for(let i=0;i<spans;i++){const shape=new T.Shape(),x1=span/2-.35,top=x1+rise*.25;shape.moveTo(-span/2,0);shape.lineTo(span/2,0);shape.lineTo(span/2,-top);shape.lineTo(x1,-top);shape.absarc(0,-top,x1,0,Math.PI,false);shape.lineTo(-span/2,-top);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:depth*.9,bevelEnabled:false,curveSegments:12});g.translate(0,0,-depth*.45);b.add(g,i%2?stone:alt,[-width/2+(i+.5)*span,-deck,0],[0,0,0],[1,1,1],.04);}
   if(style==='paris')for(const x of [-width/2+.6,width/2-.6]){b.add(new T.CylinderGeometry(.05,.07,2.2,8),'#2d3a3a',[x,1.1,-depth/2+.18]);b.add(new T.SphereGeometry(.17,10,8),'#fff1c4',[x,2.3,-depth/2+.18]);}
   break;
  }
  case'slab':case'sandstone-lift':case'masonry-lift':case'garden':{
   const t=Math.max(.45,Math.min(1.1,definition.thickness+.3));b.add(new T.BoxGeometry(width,t,depth*.92),palette.stone,[0,-t/2+.015,0],[0,0,0],[1,1,1],.05);
   b.add(new T.BoxGeometry(width+.1,.08,depth*.95),palette.stoneAlt,[0,.0,0]);for(let i=0;i<3;i++)b.add(new T.BoxGeometry(width*.98,.04,.04),palette.stoneAlt,[0,-.15-i*.18,depth*.46]);
   if(style==='garden')for(let i=0;i<Math.ceil(width*1.6);i++){const x=-width/2+.2+r()*(width-.4);b.add(new T.IcosahedronGeometry(.12,0),i%3===0?'#e86b8a':i%3===1?'#f3c45b':'#4f8a3d',[x,.1,-depth*.4+r()*.25]);}
   if(style==='sandstone-lift')b.add(new T.BoxGeometry(width*.3,.05,.02),palette.accent,[0,-.3,depth*.47]);
   break;
  }
  case'raft':{
   const logs=Math.max(4,Math.round(depth/.34));for(let i=0;i<logs;i++){const z=-depth*.46+i*depth*.92/(logs-1),g=new T.CylinderGeometry(.17,.17,width,9);g.rotateZ(Math.PI/2);b.add(g,i%2?palette.wood:palette.woodAlt,[0,-.16,z],[0,0,0],[1,1,1],.08);}
   for(const x of [-width*.36,width*.36]){const g=new T.CylinderGeometry(.06,.06,depth,7);g.rotateX(Math.PI/2);b.add(g,palette.rope,[x,0,0]);}
   planks(b,width*.94,depth*.7,palette.woodAlt,palette.wood,r,.06);
   break;
  }
  case'log':{
   const g=new T.CylinderGeometry(.45,.48,width,14,1);g.rotateZ(Math.PI/2);b.add(g,palette.wood,[0,-.52,0],[0,0,0],[1,1,.9],.08);
   const top=new T.BoxGeometry(width*.96,.06,.92);b.add(top,palette.woodAlt,[0,-.015,0]);for(const x of [-width/2,width/2]){const end=new T.CircleGeometry(.47,14);end.rotateY(x<0?-Math.PI/2:Math.PI/2);b.add(end,'#c99f6b',[x+(x<0?-.002:.002),-.52,0]);}
   for(let i=0;i<4;i++){const x=-width/2+.6+i*(width-1.2)/3;b.add(new T.TorusGeometry(.47,.03,5,14),'#4f7a35',[x,-.52,0],[0,Math.PI/2,0]);}
   break;
  }
  case'swing':case'suspended':{
   planks(b,width,depth*.86,palette.wood,palette.woodAlt,r,.16);for(const z of [-1.3,1.3])b.add(new T.BoxGeometry(width,.16,.14),palette.woodAlt,[0,-.2,z]);
   break;
  }
  case'lift':case'dock-lift':{
   const metal=palette.metal;b.add(new T.BoxGeometry(width,.2,depth*.9),metal,[0,-.085,0]);
   const n=Math.ceil(width/.22);for(let i=0;i<n;i++)b.add(new T.BoxGeometry(.04,.025,depth*.88),'#7a828a',[-width/2+(i+.5)*width/n,.02,0]);
   for(const z of [-depth*.43])for(const x of [-width/2+.1,width/2-.1])b.add(new T.BoxGeometry(.07,1.1,.07),metal,[x,.55,z]);
   b.add(new T.BoxGeometry(width,.06,.06),palette.accent,[0,1.08,-depth*.43]);b.add(new T.BoxGeometry(width,.05,.05),metal,[0,.6,-depth*.43]);
   const stripes=Math.ceil(width/.5);for(let i=0;i<stripes;i++)b.add(new T.BoxGeometry(.24,.2,.02),i%2?'#26292d':palette.accent,[-width/2+(i+.5)*width/stripes,-.09,depth*.45],[0,0,.6]);
   break;
  }
 }
 const material=vertexMaterial(.82);if(options.surface)markSurface(material,options.surface.set,options.surface.tint,1);
 const deck=b.mesh(root,material,'deck-'+style);deck.userData.walkingSurface=.015;deck.castShadow=deck.receiveShadow=true;
 if(style==='lift'||style==='dock-lift')for(const x of [-width/2+.1,width/2-.1])sphere(root,standard(palette.accent,.3,{emissive:palette.accent,emissiveIntensity:.5}),x,1.16,-depth*.43,.06);
 return deck;
}

/** Hanging cables or vines from a fixed pivot to a moving platform. The group
 * pivots at its top, so rotating it keeps the lower end on the platform. */
export function createHangers(parent:T.Object3D,options:{x:number;top:number;bottom:number;spread:number;color:string;kind:'vine'|'rope'|'cable';leaves?:string}){
 const root=new T.Group();root.name='platform-hangers';root.position.set(options.x,options.top,0);parent.add(root);const b=new Builder(),length=options.top-options.bottom;
 for(const x of [-options.spread/2,options.spread/2])for(const z of options.kind==='cable'?[-1.25]:[-1.2,1.2]){const points=[v3(x*.6,0,z*.7),v3(x*.85+.08,-length*.45,z*.9),v3(x,-length,z)];b.add(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,options.kind==='vine'?.06:.035,5,false),options.color);
  if(options.kind==='vine'&&options.leaves)for(let i=0;i<8;i++){const p=new T.CatmullRomCurve3(points).getPoint(i/8);b.add(new T.IcosahedronGeometry(.16,0),options.leaves,[p.x+.08,p.y,p.z],[i,i*2,0],[1,.5,.8]);}}
 b.mesh(root,vertexMaterial(.9),'hanger-'+options.kind);root.userData.length=length;
 return{root,follow(dx:number){root.rotation.z=Math.atan2(dx,length);root.scale.y=Math.hypot(dx,length)/length;}};
}
