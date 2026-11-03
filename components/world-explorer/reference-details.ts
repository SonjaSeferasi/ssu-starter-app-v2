import * as T from 'three';
import {matte,mesh,sphere,strut} from './scenic-kit';

/** Physical references for the extra modeled detail, rather than a claim that
 * a fictional platform course is a reconstruction or a real visitor route. */
export const countryDetailSources:Readonly<Record<string,readonly string[]>>={
 EGY:['https://egymonuments.gov.eg/en/monuments/the-great-sphinx/','https://www.egyptianmuseum.org/explore/old-kingdom-monuments-sphinx'],
 BRA:['https://museudaamazonia.org.br/galeria-2/','https://www.gov.br/icmbio/pt-br/centrais-de-conteudo/publicacoes/guias-de-aves/souzaetal-_2008_avesdoparquenacionaldocaboorangeavesdoparquenacionaldocaboorange.pdf'],
 FRA:['https://www.paris.fr/pages/haussmann-l-homme-qui-a-transforme-paris-23091','https://www.culture.gouv.fr/Media/Thematiques/Patrimoine-culturel-immateriel/Files/Fiches-inventaire-du-PCI/Les-savoir-faire-du-couvreur-zingueur-parisien'],
 AUS:['https://www.transport.nsw.gov.au/system/files/media/documents/2023/sydney-harbour-bridge-conservation-management-plan_0.pdf'],
};

function group(parent:T.Object3D,name:string,x=0,y=0,z=0){const root=new T.Group();root.name=name;root.position.set(x,y,z);parent.add(root);return root;}
function box(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){return mesh(parent,new T.BoxGeometry(w,h,d),m,x,y,z);}
function bar(parent:T.Object3D,m:T.Material,a:[number,number,number],b:[number,number,number],r=.04){return strut(parent,m,new T.Vector3(...a),new T.Vector3(...b),r);}

function sphinx(parent:T.Group){
 const root=group(parent,'giza-sphinx',-.8,0,.1),limestone=matte('#c9a36c'),edge=matte('#af8755'),groove=matte('#99764d');
 root.userData.feature='Recumbent lion body, human head and flared nemes silhouette';
 box(root,limestone,0,.1,.55,3.1,.2,4.5);
 const body=sphere(root,limestone,0,.72,-.25,.98,.64,1.55);body.name='sphinx-lion-body';
 for(const x of [-.69,.69]){
  sphere(root,limestone,x,.57,-1.15,.45,.5,.7);
  box(root,limestone,x,.35,1.15,.48,.48,1.72);
  sphere(root,limestone,x,.33,2.03,.29,.26,.34);
  for(let i=0;i<3;i++)box(root,groove,x+(i-1)*.12,.53,2.12,.014,.015,.24);
 }
 // The surviving human face is set forward of the flared headdress. The
 // missing nose is not restored into an invented intact archaeological face.
 const headdress=new T.Shape();headdress.moveTo(-.77,-.36);headdress.lineTo(-.61,.6);headdress.quadraticCurveTo(0,1.05,.61,.6);headdress.lineTo(.77,-.36);headdress.lineTo(.45,-.48);headdress.lineTo(-.45,-.48);headdress.closePath();
 mesh(root,new T.ExtrudeGeometry(headdress,{depth:.24,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:1,steps:1}),edge,0,1.85,.97);
 const head=sphere(root,limestone,0,2.08,1.36,.43,.57,.34);head.name='sphinx-human-head';
 for(const x of [-.18,.18]){
  bar(root,groove,[x-.07,2.19,1.65],[x+.07,2.19,1.65],.015);
  for(let j=0;j<5;j++)bar(root,limestone,[Math.sign(x)*.47,2.46-j*.15,1.24],[Math.sign(x)*(.58+j*.02),2.42-j*.15,1.24],.025);
 }
 bar(root,groove,[-.14,1.88,1.67],[.14,1.88,1.67],.013);
 for(const y of [.25,.48,.7])for(let i=0;i<6;i++)box(root,edge,(i-2.5)*.39,y,.4,.32,.015,.018);
}

function rainforest(parent:T.Group){
 const root=group(parent,'amazon-canopy-and-log-crossing'),bark=matte('#665035'),wood=matte('#9d794b'),leaf=matte('#326e36'),sunLeaf=matte('#5d983a'),vine=matte('#517236');
 for(const [x,z,height] of [[-7.3,-1.7,4.8],[7,-1.9,5.4]]){
  const tree=group(root,'amazon-broadleaf-canopy',x,0,z);
  bar(tree,bark,[0,0,0],[.3,height,0],.28);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3,px=Math.cos(a)*1.35,pz=Math.sin(a)*1.1;
   bar(tree,bark,[.1,height*.55,0],[px,height-.1+(i%2)*.3,pz],.1);
   sphere(tree,i%2?leaf:sunLeaf,px,height+(i%2)*.28,pz,1.2,.72,1.1);
   bar(tree,bark,[Math.cos(a)*.7,0,Math.sin(a)*.7],[.04,1,0],.09);
   const curve=new T.QuadraticBezierCurve3(new T.Vector3(px,height-.2,pz),new T.Vector3(px+.3,height*.6,pz+.2),new T.Vector3(px-.12,height*.3,pz+.1));
   mesh(tree,new T.TubeGeometry(curve,12,.018,4,false),vine);
   for(const t of [.35,.55,.75]){const p=curve.getPoint(t);sphere(tree,leaf,p.x+.08,p.y,p.z,.13,.07,.04);}
  }
 }
 const bridge=group(root,'amazon-round-log-bridge',-.7,.23,3.15),length=6.8;
 for(let i=0;i<24;i++){
  const x=(i+.5)/24*length-length/2,sag=.26*Math.cos(x/length*Math.PI);
  const log=mesh(bridge,new T.CylinderGeometry(.13,.145,1.05,8),i%3?wood:bark,x,-sag,0);log.rotation.x=Math.PI/2;
 }
 for(const side of [-1,1]){
  const z=side*.6,rope=new T.QuadraticBezierCurve3(new T.Vector3(-length/2,.75,z),new T.Vector3(0,.05,z),new T.Vector3(length/2,.75,z));
  mesh(bridge,new T.TubeGeometry(rope,24,.028,5,false),wood);
  for(const x of [-length/2,length/2])bar(bridge,bark,[x,-.12,z],[x,.85,z],.07);
 }
 for(const x of [-4.1,2.7])sphere(root,matte('#9b9669'),x,-.2,2.9,.75,.5,.8);
 // Ramphastos tucanus is documented by Manaus's Amazon Museum and ICMBio:
 // black plumage, white throat, red/black bill with a pale upper ridge.
 const bird=group(root,'white-throated-amazon-toucan',-4.6,2.4,2.3),black=matte('#202d30'),white=matte('#f2ebd0'),red=matte('#b84d3a'),pale=matte('#d2bd62'),blue=matte('#5a949f');
 bird.userData.species='Ramphastos tucanus';
 bar(root,bark,[-5.9,.05,1.8],[-5.1,2.3,2.3],.12);
 bar(root,bark,[-5.5,2.25,2.3],[-3.7,2.25,2.3],.07);
 sphere(bird,black,0,.26,0,.24,.36,.2);sphere(bird,white,.11,.36,.16,.16,.24,.08);sphere(bird,black,.08,.64,0,.22,.22,.2);
 sphere(bird,red,.5,.65,.02,.43,.135,.13);sphere(bird,black,.81,.64,.02,.13,.1,.12);bar(bird,pale,[.19,.75,.03],[.78,.71,.03],.025);
 sphere(bird,blue,.14,.67,.185,.08,.09,.025);sphere(bird,black,.15,.68,.21,.032);sphere(bird,black,-.1,-.24,-.07,.13,.31,.07);sphere(bird,red,-.11,-.03,.04,.12,.06,.065);
 for(const x of [-.08,.08])bar(bird,black,[x,-.05,0],[x,-.16,.08],.018);
}

function mansard(parent:T.Object3D,width:number,depth:number,height:number,material:T.Material){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 const rings=[[height,width*.55,depth*.55],[height+.72,width*.37,depth*.37],[height+.9,width*.28,depth*.28]];
 for(const [y,x,z] of rings)for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){positions.push(x*sx,y,z*sz);uv.push((sx+1)/2,(y-height)/.9);}
 for(let row=0;row<2;row++)for(let i=0;i<4;i++){const a=row*4+i,b=row*4+(i+1)%4;indices.push(a,a+4,b,b,a+4,b+4);}
 indices.push(8,10,9,8,11,10);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return mesh(parent,geometry,material);
}

function paris(parent:T.Group){
 const root=group(parent,'paris-haussmann-detail'),wall=matte('#e2d2b5'),zinc=matte('#5f6c79'),iron=matte('#34434b'),glass=matte('#456274'),trim=matte('#eee1c9'),terracotta=matte('#a87b5b'),green=matte('#567c43'),pink=matte('#d97a94');
 for(const [x,z] of [[-6.3,-1.7],[5.6,.5]]){
  const house=group(root,'haussmann-mansard-building',x,0,z),w=2.2,h=3.8,d=1.6;
  box(house,wall,0,h/2,0,w,h,d);mansard(house,w,d,h,zinc);
  for(const y of [.12,1.1,2.9,3.75])box(house,trim,0,y,d*.02,w*1.07,.1,d*1.06);
  for(const y of [.62,1.48,2.34,3.2])for(const dx of [-.68,0,.68]){
   box(house,trim,dx,y,d/2+.018,.43,.65,.045);box(house,glass,dx,y,d/2+.05,.3,.53,.04);
   box(house,trim,dx,y,d/2+.075,.018,.53,.025);
  }
  for(const y of [1.13,2.92]){
   box(house,trim,0,y-.05,d/2+.18,w+.2,.09,.43);
   bar(house,iron,[-w/2,y+.37,d/2+.4],[w/2,y+.37,d/2+.4],.025);
   for(let i=0;i<15;i++){const xx=(i/14-.5)*w;bar(house,iron,[xx,y,d/2+.4],[xx,y+.38,d/2+.4],.011);}
  }
  for(const dx of [-.6,.6]){
   box(house,trim,dx,h+.31,d*.43,.48,.52,.22);box(house,glass,dx,h+.32,d*.505,.29,.33,.04);
   const roof=mesh(house,new T.ConeGeometry(.37,.2,4),zinc,dx,h+.66,d*.43);roof.rotation.y=Math.PI/4;
   box(house,terracotta,dx,h+1,-.27,.2,.45,.22);
   box(house,terracotta,dx,1.34,d/2+.35,.51,.14,.21);
   for(let i=0;i<5;i++){sphere(house,green,dx+(i-2)*.09,1.46,d/2+.34,.12,.1,.1);sphere(house,pink,dx+(i-2)*.09,1.53,d/2+.42,.055);}
  }
 }
 const glow=new T.MeshStandardMaterial({color:'#f7d697',emissive:'#efb351',emissiveIntensity:.7,roughness:.4});
 for(const [x,z] of [[-4.9,2],[4.15,2],[7.2,1]]){
  const lamp=group(root,'paris-warm-street-lantern',x,0,z);mesh(lamp,new T.CylinderGeometry(.11,.19,.25,10),iron,0,.125,0);bar(lamp,iron,[0,.2,0],[0,2.2,0],.045);
  box(lamp,glow,0,2.3,0,.26,.38,.26);box(lamp,iron,0,2.08,0,.34,.08,.34);const roof=mesh(lamp,new T.ConeGeometry(.3,.21,4),iron,0,2.59,0);roof.rotation.y=Math.PI/4;
  for(const sx of [-1,1])for(const sz of [-1,1])bar(lamp,iron,[sx*.14,2.08,sz*.14],[sx*.14,2.5,sz*.14],.014);
 }
}

function sydney(parent:T.Group){
 const root=group(parent,'sydney-harbour-bridge-detail'),steel=matte('#53666e'),granite=matte('#b6b4a6'),stone=matte('#cabb98');
 const bridge=group(root,'sydney-steel-through-arch',0,.1,-3.2),span=14.4;
 box(bridge,steel,0,1.08,0,span,.18,1.32);
 for(const z of [-.59,.59]){
  const arch=new T.QuadraticBezierCurve3(new T.Vector3(-6.5,1.3,z),new T.Vector3(0,10.8,z),new T.Vector3(6.5,1.3,z));
  const outer=new T.QuadraticBezierCurve3(new T.Vector3(-6.5,1.65,z),new T.Vector3(0,11.5,z),new T.Vector3(6.5,1.65,z));
  mesh(bridge,new T.TubeGeometry(arch,40,.085,6,false),steel);mesh(bridge,new T.TubeGeometry(outer,40,.085,6,false),steel);
  for(let i=0;i<=20;i++){
   const a=arch.getPoint(i/20),b=outer.getPoint(Math.min(1,(i+.7)/20));
   bar(bridge,steel,[a.x,1.18,z],[a.x,a.y,z],.025);bar(bridge,steel,[a.x,a.y,z],[b.x,b.y,z],.035);
  }
 }
 // Four granite-faced pylons accompany the steel arch. They are scenery,
 // not depicted as the structural elements holding up its suspended deck.
 for(const x of [-7,7])for(const z of [-.77,.77]){
  const pylon=group(bridge,'sydney-granite-pylon',x,0,z);box(pylon,granite,0,2.2,0,.68,4.4,.65);box(pylon,stone,0,4.35,0,.84,.16,.8);
  for(let i=0;i<7;i++)box(pylon,steel,0,.4+i*.53,.331,.4,.018,.012);
 }
 const water=new T.MeshStandardMaterial({color:'#349da9',roughness:.24,metalness:.2,transparent:true,opacity:.86});
 const inlet=mesh(root,new T.CircleGeometry(1,32),water,0,-.12,3.3);inlet.rotation.x=-Math.PI/2;inlet.scale.set(7,2.2,1);
 for(const x of [-7.6,-6.4,6.1,7.4])sphere(root,stone,x,.09,3.4,.65,.28,.48);
 const foam=matte('#d8ebe5');
 for(const z of [3.2,3.8,4.3])for(const x of [-4.7,-1.8,2.4,5]){const wave=mesh(root,new T.TorusGeometry(.24,.012,4,12,Math.PI),foam,x,-.07,z);wave.rotation.x=-Math.PI/2;wave.scale.x=1.8;}
}

/** Adds country-specific scenery beside an existing modeled introduction.
 * Unsupported codes are deliberately untouched; no continental stereotypes
 * are attached to unrelated country profiles. Caller batches/disposes it. */
export function addReferenceDetails(parent:T.Group,code:string):void{
 const sources=countryDetailSources[code];if(!sources)return;
 const root=group(parent,'reference-country-details-'+code);root.userData.sources=[...sources];root.userData.representation='stylized';
 if(code==='EGY')sphinx(root);else if(code==='BRA')rainforest(root);else if(code==='FRA')paris(root);else if(code==='AUS')sydney(root);
}
