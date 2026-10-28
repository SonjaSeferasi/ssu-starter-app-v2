import * as T from 'three';
import {matte,mesh,sphere,strut} from './scenic-kit';
import type {VisualProfile} from './country-platforms';

/** Profile-led architectural settings. These are small illustrative models;
 * named monuments retain their own branches ahead of this shared builder. */
export function addProfileDistrict(parent:T.Group,p:VisualProfile):boolean {
 const name=p.landmarkName.toLowerCase(),traits=p.features.join(' ').toLowerCase();
 let family='';
 if(/imperial palaces.*(?:ming|qing)|forbidden city/.test(name))family='imperial-courtyards';
 else if(/lalibela/.test(name))family='rock-cut-church';
 else if(/haghpat|sanahin|gelati|stari ras|sopoćani/.test(name))family='cross-domed-monastery';
 else if(/shibam/.test(name))family='earthen-tower-town';
 else if(/koutammakou/.test(name))family='earthen-tower-houses';
 else if(/nan madol/.test(name))family='basalt-islets';
 else if(/jelling/.test(name))family='mounds-and-church';
 else if(p.landmarkKind==='old-town'&&/medina|damascus/.test(name+' '+traits))family='medina-courtyards';
 else if(p.landmarkKind==='old-town'&&/timber/.test(traits))family='timber-town';
 else if(p.landmarkKind==='old-town'&&/modernist/.test(name+' '+traits))family='modernist-boulevard';
 else if(p.landmarkKind==='old-town'&&(/tallinn/.test(name)||/gothic/.test(traits)))family='gabled-stone-town';
 else if(p.landmarkKind==='old-town'&&/colonial|baroque|courtyards/.test(traits))family='arcaded-plaza';
 else if(p.landmarkKind==='old-town'&&/church buildings|cathedral architecture|monastic buildings/.test(traits))family='church-precinct';
 // Do not consume named forms with an existing more specific geometry builder.
 else if(p.landmarkKind==='ruins'&&!/petra|angkor|colosseum|acropolis|borobudur|laas geel|trilithon|ha.?amonga|el jem|copan|copán|maya|polonnaruwa|ayutthaya|pyu|hegra|merv|moenjodaro|mohenjo|machu|inca|great zimbabwe|khami|stepped|terrace/.test(name+' '+traits)&&/archaeological remains|archaeological settlement|stone buildings|fortified enclosures/.test(traits))family='archaeological-enclosures';
 if(!family)return false;

 const root=new T.Group();root.name='profile-district-'+p.code;root.userData.family=family;root.userData.landmarkName=p.landmarkName;parent.add(root);
 const stone=matte(p.palette.stone),roof=matte(p.palette.roof),accent=matte(p.palette.accent),leaf=matte(p.palette.foliage),dark=matte('#33404a'),white=matte('#e9e3ce');
 const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material=stone)=>{const o=mesh(root,new T.BoxGeometry(w,h,d),m,x,y,z);o.name=name;return o;};
 const column=(name:string,x:number,y:number,z:number,r:number,h:number,m:T.Material=stone)=>{const o=mesh(root,new T.CylinderGeometry(r,r,h,10),m,x,y,z);o.name=name;return o;};
 const beam=(a:[number,number,number],b:[number,number,number],r=.04,m:T.Material=accent)=>strut(root,m,new T.Vector3(...a),new T.Vector3(...b),r);
 const gable=(name:string,x:number,y:number,z:number,w:number,d:number,h:number,m:T.Material=roof)=>{
  const vertices=[-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2,-w/2,0,d/2,w/2,0,d/2,0,h,d/2];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);g.computeVertexNormals();const o=mesh(root,g,m,x,y,z);o.name=name;return o;
 };
 const arch=(x:number,y:number,z:number,width:number,height:number,m:T.Material=stone)=>{
  const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(-width/2,height-width/2);shape.absarc(0,height-width/2,width/2,Math.PI,0,true);shape.lineTo(width/2,0);shape.lineTo(width/2-.12,0);shape.lineTo(width/2-.12,height-width/2);shape.absarc(0,height-width/2,width/2-.12,0,Math.PI,false);shape.lineTo(-width/2+.12,0);shape.closePath();return mesh(root,new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false}),m,x,y,z);
 };
 const windows=(x:number,z:number,w:number,h:number,rows=2)=>{for(let row=0;row<rows;row++)for(let i=0;i<3;i++)box('recessed-window',x+(i-1)*w*.27,.5+row*(h-.6)/rows,z,.17,.31,.035,dark);};
 const curvedRoof=(x:number,y:number,z:number,w:number,d:number,h:number,m:T.Material=roof)=>{
  const pos:number[]=[],indices:number[]=[],steps=8;
  for(let face=0;face<4;face++)for(let row=0;row<=3;row++)for(let i=0;i<=steps;i++){
   const t=row/3,u=i/steps*2-1,a=face*Math.PI/2,s=.56*(1-t)+.08*t,xx=u*s,zz=s;
   pos.push((xx*Math.cos(a)+zz*Math.sin(a))*w,t*h+(1-t)**3*(.15+Math.abs(u)**4*.18)*h,(zz*Math.cos(a)-xx*Math.sin(a))*d);
  }
  const count=4*(steps+1);for(let f=0;f<4;f++)for(let row=0;row<3;row++)for(let i=0;i<steps;i++){const a=f*count+row*(steps+1)+i;indices.push(a,a+1,a+steps+1,a+1,a+steps+2,a+steps+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();const roofMaterial=m.clone();roofMaterial.side=T.DoubleSide;const o=mesh(root,g,roofMaterial,x,y,z);o.name='curved-eaves-roof';return o;
 };

 if(family==='imperial-courtyards'){
  // https://whc.unesco.org/en/list/439/ describes the axis, symmetry and courts;
  // ChinaCulture's architecture reference identifies yellow tile and red wood.
  const red=matte('#a44131'),tile=matte('#d9aa42');
  box('central-processional-axis',0,.04,0,1,.08,8.2,white);
  for(const z of [-2.8,.1,3.1]){
   const w=z<0?5:3.8;box('raised-stone-terrace',0,.2,z,w+.7,.4,1.8,white);box('hall-timber-body',0,1.05,z,w,1.3,1.2,red);
   for(const x of [-w*.4,-w*.2,0,w*.2,w*.4])column('red-wood-column',x,1,z+.7,.055,1.45,red);
   curvedRoof(0,1.7,z,w*1.18,1.9,.82,tile);curvedRoof(0,2.24,z,w*.75,1.3,.52,tile);
   for(let step=0;step<4;step++)box('axial-stone-step',0,.06+step*.1,z+1.15-step*.13,1.3,.12,.32,white);
  }
  for(const x of [-3.7,3.7]){box('courtyard-side-hall',x,.7,0,1.1,1.4,6.5,red);const wing=curvedRoof(x,1.4,0,1.6,6.9,.6,tile);wing.rotation.y=0;}
 }else if(family==='rock-cut-church'){
  // https://whc.unesco.org/en/list/18/ identifies the cruciform monolith.
  // Raise the sectional courtyard clear of the shared island cap. The front
  // trench remains open so the small side-view model can reveal the carving.
  root.position.y=1.5;
  const rock=matte('#ac7053');
  box('excavated-courtyard-floor',0,-1.4,0,6,.25,5,rock);
  for(const x of [-3.5,3.5])box('surrounding-living-rock',x,-.4,0,1.2,2.6,6.4,rock);
  box('surrounding-living-rock',0,-.4,-2.95,5.8,2.6,.8,rock);
  for(const x of [-2.1,2.1])box('front-trench-rock',x,-.4,2.95,1.6,2.6,.8,rock);
  const cross=new T.Shape();const q=.5,r=1.6;
  cross.moveTo(-q,-r);cross.lineTo(q,-r);cross.lineTo(q,-q);cross.lineTo(r,-q);cross.lineTo(r,q);cross.lineTo(q,q);cross.lineTo(q,r);cross.lineTo(-q,r);cross.lineTo(-q,q);cross.lineTo(-r,q);cross.lineTo(-r,-q);cross.lineTo(-q,-q);cross.closePath();
  const monolith=mesh(root,new T.ExtrudeGeometry(cross,{depth:2.1,bevelEnabled:false}),rock,0,-1.22,0);monolith.rotation.x=-Math.PI/2;monolith.name='cruciform-rock-cut-monolith';
  for(const y of [-.45,.1])for(const x of [-.3,.3])box('carved-church-window',x,y,1.61,.12,.24,.025,dark);
  box('entry-in-trench',0,-.78,1.62,.35,.9,.03,dark);
  for(const scale of [1,.73,.47]){const edge=new T.EdgesGeometry(monolith.geometry),line=new T.LineSegments(edge,new T.LineBasicMaterial({color:'#80513e'}));line.rotation.x=-Math.PI/2;line.position.y=.9;line.scale.set(scale,scale,.008);root.add(line);}
 }else if(family==='cross-domed-monastery'){
  // https://whc.unesco.org/en/list/777/ and /710/: cross-in-square churches,
  // attached halls and (Gelati) blind arches rather than a town-house row.
  const gelati=/gelati/.test(name),m=matte(gelati?'#c9b991':'#9c9383');
  box('cross-church-longitudinal',0,1.1,0,1.7,2.2,4.1,m);box('cross-church-transverse',0,1.1,0,3.3,2.2,1.8,m);
  gable('nave-gable',0,2.2,0,1.9,4.3,.75,roof);const transverse=gable('transept-gable',0,2.2,0,1.9,3.5,.75,roof);transverse.rotation.y=Math.PI/2;
  column('central-church-drum',0,2.75,0,.67,1.1,m);const cap=mesh(root,new T.ConeGeometry(.88,1.05,gelati?12:8),roof,0,3.78,0);cap.name='conical-monastery-dome';
  for(const side of [-1,1]){box('attached-monastic-hall',side*2.65,.7,.8,1.8,1.4,2.4,m);gable('hall-gable',side*2.65,1.4,.8,2,2.6,.65);}
  for(let i=0;i<5;i++)arch((i-2)*.57,.2,2.07,.47,1.45,m);
  if(gelati)for(const side of [-1,1])for(let i=0;i<4;i++)arch(side*1.68,.24,(i-1.5)*.65,.49,1.4,m).rotation.y=side*Math.PI/2;
 }else if(family==='earthen-tower-town'){
  const earth=matte('#ae7e58');for(let i=0;i<7;i++){const x=(i-3)*1.05,h=2.5+(i%3)*.65,z=(i%2)*1.1;box('earthen-high-rise',x,h/2,z,.94,h,.95,earth);box('whitewashed-roof-band',x,h-.12,z,1.01,.15,1.02,white);windows(x,z+.49,.9,h,4);}
 }else if(family==='earthen-tower-houses'){
  // https://whc.unesco.org/document/128607 describes earth towers, spherical
  // granaries, and both flat and conical thatched roofs.
  const earth=matte('#a47b55'),thatch=matte('#8b7951');
  for(const centre of [-2.3,2.3]){box('connecting-earth-wall',centre,.65,0,3,1.3,1.7,earth);for(const dx of [-1,1]){column('earthen-cylinder-house',centre+dx,1,0,.65,2,earth);sphere(root,earth,centre+dx,2.1,0,.7,.6,.7);const cone=mesh(root,new T.ConeGeometry(.8,.8,16),thatch,centre+dx,2.8,0);cone.name='thatched-granary-roof';}box('recessed-earth-door',centre,.5,.87,.35,1,.03,dark);}
 }else if(family==='basalt-islets'){
  // https://www.nps.gov/places/nan-madol.htm: crisscross basalt and canals.
  const basalt=matte('#596866'),water=new T.MeshStandardMaterial({color:'#5ca9a3',roughness:.3,metalness:.1});box('lagoon-water',0,.015,0,9,.03,6,water);
  for(const x of [-2.3,2.3]){box('constructed-islet',x,.12,0,3.6,.24,4,stone);for(let layer=0;layer<6;layer++){const y=.35+layer*.22;for(const side of [-1,1]){box('cross-stacked-basalt',x+side*1.5,y,0,.35,.19,3.7,basalt);box('cross-stacked-basalt',x,y,side*1.7,3.3,.19,.35,basalt);}if(layer%2===0)for(const z of [-1.5,1.5])for(const dx of [-1.25,0,1.25])box('basalt-joint',x+dx,y,z,.6,.22,.5,basalt);}}
 }else if(family==='mounds-and-church'){
  // https://whc.unesco.org/en/list/697/: turf mounds, stones and white church.
  for(const x of [-3.6,3.6]){const mound=mesh(root,new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),leaf,x,0,-.3);mound.scale.set(2,1.15,2);mound.name='turf-burial-mound';}
  box('whitewashed-church',0,.75,0,1.6,1.5,2.2,white);gable('church-gable',0,1.5,0,1.8,2.4,.85);for(const x of [-.55,.55]){const rune=sphere(root,stone,x,.45,2.1,.25,.45,.17);rune.name='unlettered-standing-stone';}
 }else if(family==='medina-courtyards'){
  for(const x of [-3,3]){box('courtyard-wing',x,.9,0,2,1.8,5.2);box('flat-parapet',x,1.85,0,2.15,.15,5.35,accent);for(let i=0;i<4;i++)arch(x+(x<0?.95:-.95),0,(i-1.5)*1.13,.84,1.4).rotation.y=Math.PI/2;}
  box('courtyard-back-wall',0,1,-2.5,4.6,2,.35);box('courtyard-garden',0,.06,0,2.5,.12,3.4,leaf);
  for(const x of [-2.1,2.1])box('monumental-gateway-pier',x,1.4,2.5,1.2,2.8,.8);arch(0,0,2.5,3,2.8,accent);
 }else if(family==='gabled-stone-town'||family==='timber-town'){
  const timber=family==='timber-town',beamMat=matte('#69543d');
  for(let i=0;i<6;i++){const x=(i-2.5)*1.24,h=2.1+(i%3)*.32,w=1.12;box(timber?'timber-house':'merchant-house',x,h/2,0,w,h,1.65,i%2?white:stone);gable('street-facing-gable',x,h,0,w*1.08,1.8,1.15);windows(x,.84,w,h,2);
   if(timber){for(const y of [.2,1.2,h-.05])box('horizontal-timber',x,y,.87,w,.07,.04,beamMat);for(const dx of [-.48,0,.48])box('vertical-timber',x+dx,h/2,.87,.06,h,.04,beamMat);beam([x-.45,.25,.9],[x+.45,1.15,.9],.025,beamMat);}}
  if(!timber){box('medieval-church-tower',-4.7,1.8,-.5,.8,3.6,.9);const spire=mesh(root,new T.ConeGeometry(.65,2,8),roof,-4.7,4.6,-.5);spire.name='gothic-spire';}
 }else if(family==='modernist-boulevard'){
  // UNESCO 1550 identifies Asmara's modernist urban ensemble. Flat terraces,
  // long horizontal glazing and canopies avoid substituting medieval houses.
  const glazing=new T.MeshStandardMaterial({color:'#68898d',roughness:.35,metalness:.15});
  for(let i=0;i<4;i++){const x=(i-1.5)*2.1,h=1.65+(i%2)*.9;box('modernist-block',x,h/2,0,1.9,h,2.1,i%2?white:stone);box('flat-terrace-parapet',x,h+.06,0,2.05,.12,2.2,accent);
   for(let y=.65;y<h;y+=.7)box('horizontal-ribbon-window',x,y,1.065,1.55,.24,.035,glazing);box('street-canopy',x,.65,1.3,1.85,.1,.65,white);
  }
 }else if(family==='arcaded-plaza'){
  for(const side of [-1,1]){const x=side*3.4;box('plaza-wing',x,1.5,0,1.6,3,4.7);gable('plaza-tile-roof',x,3,0,1.9,5,.7);for(let i=0;i<4;i++){const a=arch(x+side*.81,.05,(i-1.5)*1.05,.8,1.5,white);a.rotation.y=Math.PI/2;}}
  box('civic-plaza-paving',0,.025,0,5,.05,4.8,white);column('plaza-fountain-base',0,.18,0,.65,.25);sphere(root,accent,0,.48,0,.17,.3,.17);
  box('church-facade',0,1.4,-2.2,3.5,2.8,.8);gable('front-pediment',0,2.8,-2.2,3.8,.9,.9);arch(0,0,-1.77,1.1,1.9,accent);
 }else if(family==='church-precinct'){
  box('church-nave',0,1,0,2.2,2,3.3);gable('church-roof',0,2,0,2.5,3.6,1);arch(0,0,1.7,.8,1.55,accent);
  box('adjoining-precinct-hall',-3.2,.7,-.6,2.2,1.4,2);gable('precinct-gable',-3.2,1.4,-.6,2.4,2.2,.65);box('garden-court',0,.04,2.65,4,.08,1.1,leaf);
 }else if(family==='archaeological-enclosures'){
  // Preserved footprints and partial masonry, never invented complete temples.
  for(let plot=0;plot<4;plot++){const x=(plot%2?1:-1)*2.2,z=plot<2?-1.4:1.5,w=2.5,d=1.8;box('excavated-building-footprint',x,.02,z,w,.04,d,accent);for(const side of [-1,1]){box('partial-masonry-wall',x+side*w/2,.25,z,.2,.5,d);box('partial-masonry-wall',x,.25,z+side*d/2,w,.5,.2);}if(plot%2===0)box('standing-wall-remnant',x-w/2,.82,z,.3,1.15,.7);}
 }
 return true;
}
