import * as T from 'three';

// Fine surface detail for the dimensional scenery. These stay small and shared;
// the silhouette, strata and depth still come from actual scene geometry.
// Everything is drawn once per mount on small canvases; nothing is downloaded.
export function rng(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const cache=new Map<string,T.Texture>();
/** Engine teardown disposes GPU textures found in the scene; canvases are redrawn on the next mount. */
export function clearToonTextures(){cache.forEach(texture=>texture.dispose());cache.clear();}
const rgb=(hex:string)=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
function finish(canvas:HTMLCanvasElement,{repeat=true,color=true}={}){
 const texture=new T.CanvasTexture(canvas);if(color)texture.colorSpace=T.SRGBColorSpace;
 if(repeat)texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;return texture;
}
function canvasTexture(key:string,width:number,height:number,draw:(c:CanvasRenderingContext2D)=>void,options?:{repeat?:boolean;color?:boolean}){
 const found=cache.get(key);if(found)return found;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d')!);
 const texture=finish(canvas,options);cache.set(key,texture);return texture;
}

export type WorldStyle={stones:string[];crevice:string;cells:number;stretch:number;turf:string;blades:string[];lip:string[];flowers:string[]};
export const worldStyles:Record<number,WorldStyle>={
 1:{stones:['#e6bf8c','#d9ab77','#eecb99','#d2a06c','#e0b47f'],crevice:'#8f6844',cells:6,stretch:1.3,turf:'#6fbf38',blades:['#88d34a','#5aa82c','#a0e25c','#4f9c29'],lip:['#7dca41','#69b834','#95dc55','#4c9327'],flowers:['#f2402f','#fff6e2','#ffd43b','#4a8ff4','#a56df3','#ff7fb2','#ff9b2c']},
 2:{stones:['#e1b380','#d3a370','#e9c091','#c99868'],crevice:'#7c573b',cells:6,stretch:.82,turf:'#7cbd44',blades:['#94ce56','#67aa37','#aadb69','#57952f'],lip:['#87c64c','#73b43f','#9bd55e','#568f30'],flowers:['#fff6e2','#ffe26a','#ffb7cb','#a2d6ff']},
 3:{stones:['#cdb48c','#bfa57f','#d8c199','#b09774'],crevice:'#5f503a',cells:7,stretch:1.15,turf:'#73a03b',blades:['#8ab64b','#5e8b2f','#9dc75a','#4e7a2a'],lip:['#7fac44','#6a9437','#93bf52','#4f782a'],flowers:['#e4482f','#ffcf5a','#fff1d6','#f08a3c']},
};
export const styleFor=(world:number)=>worldStyles[world]||worldStyles[1];

/** Rounded, softly lit stones (a tileable Voronoi pattern) and the matching height map. */
export function stoneTextures(world:number){
 const key='stone-'+world,found=cache.get(key+':map'),foundBump=cache.get(key+':bump');
 if(found&&foundBump)return{map:found,bump:foundBump};
 const style=styleFor(world),size=512,n=style.cells,r=rng(world*977+13);
 const points=Array.from({length:n*n},()=>({x:.14+r()*.72,y:.14+r()*.72,tone:Math.floor(r()*style.stones.length),shade:.9+r()*.2}));
 const colorCanvas=document.createElement('canvas'),bumpCanvas=document.createElement('canvas');
 colorCanvas.width=colorCanvas.height=bumpCanvas.width=bumpCanvas.height=size;
 const cc=colorCanvas.getContext('2d')!,bc=bumpCanvas.getContext('2d')!,color=cc.createImageData(size,size),height=bc.createImageData(size,size);
 const stones=style.stones.map(rgb),crevice=rgb(style.crevice);
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){
  const gu=px/size*n,gv=py/size*n,ci=Math.floor(gu),cj=Math.floor(gv);
  let d1=9,d2=9,best=0,bx=0,by=0;
  for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){
   const cx=ci+di,cy=cj+dj,index=((cy%n+n)%n)*n+((cx%n+n)%n),point=points[index];
   const dx=gu-(cx+point.x),dy=(gv-(cy+point.y))*style.stretch,d=Math.sqrt(dx*dx+dy*dy);
   if(d<d1){d2=d1;d1=d;best=index;bx=dx;by=dy;}else if(d<d2)d2=d;
  }
  // Thin, irregular joints and broken strata read as weathered cliff stone,
  // rather than the inflated cobbles produced by a broad rounded cell edge.
  const edgeRaw=Math.min(1,(d2-d1)/.07),edge=edgeRaw*edgeRaw*(3-2*edgeRaw),dome=Math.max(0,1-d1/.65);
  const light=Math.max(-1,Math.min(1,-(bx*.55+by*.85)/.55)),point=points[best],base=stones[point.tone];
  const strata=Math.sin(py*.14+Math.sin(px*.017)*2.2)+.35*Math.sin(py*.41+Math.sin(px*.04)*3),mineral=Math.sin(px*.29+py*.13)*Math.sin(py*.21-px*.11);
  const shade=(.88+.08*dome+.1*light+.035*strata+.025*mineral)*point.shade*(.91+.09*Math.min(1,edgeRaw*2.2)),hash=Math.sin(px*12.9898+py*78.233)*43758.5453,grain=(hash-Math.floor(hash))*19-9.5;
  const at=(py*size+px)*4;
  for(let k=0;k<3;k++)color.data[at+k]=Math.max(0,Math.min(255,crevice[k]+(base[k]*shade-crevice[k])*edge+grain));
  color.data[at+3]=255;
  const value=255*edge*(.65+.12*dome+.035*strata+.035*mineral)+grain*.6;height.data[at]=height.data[at+1]=height.data[at+2]=value;height.data[at+3]=255;
 }
 cc.putImageData(color,0,0);bc.putImageData(height,0,0);
 const map=finish(colorCanvas),bump=finish(bumpCanvas,{color:false});
 map.repeat.set(1,1);bump.repeat.set(1,1);cache.set(key+':map',map);cache.set(key+':bump',bump);
 return{map,bump};
}

/** Long wood fibres and knots, shared by branches, walkways and village beams. */
export function woodTexture(bark=false){
 return canvasTexture(bark?'cedar-bark':'weathered-timber',256,512,c=>{
  const r=rng(bark?571:637);c.fillStyle=bark?'#ad9068':'#c4a778';c.fillRect(0,0,256,512);
  for(let i=0;i<360;i++){
   const x=r()*256,width=bark?1+r()*3:.35+r()*1.5;c.strokeStyle=i%4?'rgba(54,34,16,.24)':'rgba(255,236,195,.24)';c.lineWidth=width;c.beginPath();
   for(let y=-16;y<=528;y+=8){const dx=x+Math.sin(y*(bark?.024:.012)+i)*((bark?4:1.7)+Math.sin(y*.013+i));if(y===-16)c.moveTo(dx,y);else c.lineTo(dx,y);}c.stroke();
  }
  for(let i=0;i<(bark?12:5);i++){
   const x=r()*256,y=r()*512;for(let k=0;k<4;k++){c.strokeStyle=`rgba(63,39,19,${.22-k*.03})`;c.lineWidth=1;c.beginPath();c.ellipse(x,y,2+k*2,7+k*5,.12,0,Math.PI*2);c.stroke();}
  }
 });
}

/** Mottled leaf-sized highlights break up the rounded crown silhouette. */
export function foliageTexture(){
 return canvasTexture('leaf-crown',256,256,c=>{
  const r=rng(213);c.fillStyle='#b6b6b6';c.fillRect(0,0,256,256);
  for(let i=0;i<1100;i++){
   const x=r()*256,y=r()*256,a=r()*Math.PI,shade=90+Math.floor(r()*165);c.fillStyle=`rgb(${shade},${shade},${shade})`;c.beginPath();c.ellipse(x,y,2+r()*5,1+r()*2,a,0,Math.PI*2);c.fill();
  }
 });
}

/** Ribbed warm paper with a recognizable spiral leaf village crest. */
export function lanternTexture(){
 return canvasTexture('lantern-paper',256,256,c=>{
  c.fillStyle='#ffe5ae';c.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=13){c.fillStyle='rgba(126,71,24,.13)';c.fillRect(0,y,256,2);}
  for(const x of [64,192]){c.save();c.translate(x,122);c.strokeStyle='#8d3b1e';c.lineWidth=6;c.beginPath();for(let i=0;i<=70;i++){const a=i/70*Math.PI*3.8,r=3+i/70*24;if(i)c.lineTo(Math.cos(a)*r,Math.sin(a)*r);else c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();c.beginPath();c.moveTo(11,22);c.lineTo(39,23);c.lineTo(31,-11);c.stroke();c.restore();}
 });
}

export function mushroomGillsTexture(){
 return canvasTexture('mushroom-gills',256,256,c=>{
  c.fillStyle='#f5e8c9';c.fillRect(0,0,256,256);
  for(let i=0;i<150;i++){
   const a=i/150*Math.PI*2;c.strokeStyle=i%3?'rgba(151,119,75,.32)':'rgba(255,252,222,.8)';c.lineWidth=i%3?1:1.6;c.beginPath();c.moveTo(128+Math.cos(a)*27,128+Math.sin(a)*27);c.lineTo(128+Math.cos(a)*129,128+Math.sin(a)*129);c.stroke();
  }
 },{repeat:false});
}

export function grassTexture(world:number){
 const style=styleFor(world);
 return canvasTexture('grass-'+world,256,256,c=>{
  const r=rng(world*31+5);c.fillStyle=style.turf;c.fillRect(0,0,256,256);
  for(let i=0;i<2600;i++){
   const x=r()*256,y=r()*256,length=3+r()*7;c.strokeStyle=style.blades[Math.floor(r()*style.blades.length)];
   c.globalAlpha=.5+r()*.45;c.lineWidth=1+r()*1.4;c.beginPath();c.moveTo(x,y);c.lineTo(x+(r()-.5)*3,y-length);c.stroke();
  }
  c.globalAlpha=1;
 });
}

/** Turf that droops over a cliff lip: hanging blades on a transparent strip. */
export function fringeTexture(world:number){
 const style=styleFor(world);
 return canvasTexture('fringe-'+world,512,128,c=>{
  const r=rng(world*53+7);c.fillStyle=style.lip[1];c.fillRect(0,0,512,12);
  for(let pass=0;pass<3;pass++)for(let x=-12;x<524;x+=pass?5:3){
   const length=pass===0?34+r()*74:16+r()*46,half=4+r()*7,sway=(r()-.5)*14,color=style.lip[Math.floor(r()*style.lip.length)];
   for(const offset of [0,512,-512]){
    const px=x+offset;if(px<-24||px>536)continue;
    c.fillStyle=color;c.beginPath();c.moveTo(px-half,0);c.quadraticCurveTo(px-half*.3,length*.6,px+sway,length);c.quadraticCurveTo(px+half*.3,length*.6,px+half,0);c.closePath();c.fill();
   }
  }
  // Shade the tips so the overhang reads as a soft roll of turf.
  const shade=c.createLinearGradient(0,0,0,128);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(18,38,10,.4)');
  c.globalCompositeOperation='source-atop';c.fillStyle=shade;c.fillRect(0,0,512,128);c.globalCompositeOperation='source-over';
 });
}

export function vineTexture(world:number){
 const style=styleFor(world);
 return canvasTexture('vine-'+world,64,512,c=>{
  const r=rng(world*71+3);c.strokeStyle='#3d6a26';c.lineWidth=3;c.beginPath();
  for(let y=0;y<=512;y+=8){const x=32+Math.sin(y*.035)*8;if(y)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();
  for(let y=6;y<505;y+=12){
   const x=32+Math.sin(y*.035)*8,side=Math.floor(y/12)%2?1:-1;c.fillStyle=style.lip[Math.floor(r()*style.lip.length)];
   c.beginPath();c.ellipse(x+side*9,y+4,9,5,side*.6,0,Math.PI*2);c.fill();
  }
 },{repeat:false});
}

/** Light polka dots; the instance colour tints the whole surface. */
export function dotsTexture(){
 return canvasTexture('dots',256,256,c=>{
  const r=rng(41);c.fillStyle='#d6d6d6';c.fillRect(0,0,256,256);c.fillStyle='#ffffff';
  for(let j=0;j<5;j++)for(let i=0;i<5;i++){
   const x=(i+.5+(j%2)*.5)*51.2+(r()-.5)*10,y=(j+.5)*51.2+(r()-.5)*10,radius=10+r()*9;
   for(const ox of [0,256,-256])for(const oy of [0,256,-256]){c.beginPath();c.arc(x+ox,y+oy,radius,0,Math.PI*2);c.fill();}
  }
 });
}

export function glowTexture(){
 return canvasTexture('glow',128,128,c=>{
  const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.22,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(0,0,128,128);
 },{repeat:false,color:false});
}

export function mistTexture(){
 return canvasTexture('mist',512,256,c=>{
  const r=rng(17);
  for(let i=0;i<46;i++){
   const x=70+r()*372,y=96+r()*80,radius=36+r()*70,g=c.createRadialGradient(x,y,0,x,y,radius);
   g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
 },{repeat:false});
}

/** Out-of-focus foreground blossoms and leaves, like a shallow camera depth of field. */
export function bokehTexture(world:number){
 const colors=world===3?['#d9472b','#f08a3c','#f7c04a','#b8321f']:world===2?['#ffffff','#c4e8a4','#fff2a8','#a2d47e']:['#ff5a4a','#ffffff','#ffd84a','#6aa8ff','#ff8fc0','#ff9b2c'];
 return canvasTexture('bokeh-'+world,256,256,c=>{
  const r=rng(world*19+2);
  for(let i=0;i<24;i++){
   const x=20+r()*216,y=120+r()*130,radius=18+r()*36,g=c.createRadialGradient(x,y,0,x,y,radius),tone=world===3?(i<12?'86,120,44':'130,150,60'):(i<12?'64,140,46':'112,176,62');
   g.addColorStop(0,`rgba(${tone},.85)`);g.addColorStop(1,`rgba(${tone},0)`);c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  for(let i=0;i<15;i++){
   const x=24+r()*208,y=50+r()*160,radius=10+r()*22,color=colors[Math.floor(r()*colors.length)],g=c.createRadialGradient(x,y,0,x,y,radius);
   g.addColorStop(0,color);g.addColorStop(.55,color+'cc');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
 },{repeat:false});
}

export function waterfallTexture(){
 return canvasTexture('waterfall',64,256,c=>{
  const r=rng(91),g=c.createLinearGradient(0,0,64,0);
  g.addColorStop(0,'rgba(190,235,245,0)');g.addColorStop(.18,'rgba(225,248,252,.88)');g.addColorStop(.5,'rgba(248,255,255,.97)');g.addColorStop(.82,'rgba(205,240,248,.88)');g.addColorStop(1,'rgba(180,225,240,0)');
  c.fillStyle=g;c.fillRect(0,0,64,256);
  for(let i=0;i<150;i++){c.fillStyle=`rgba(${r()>.5?255:160},${r()>.5?255:220},255,${.22+r()*.4})`;c.fillRect(4+r()*56,r()*256,1+r()*2.5,8+r()*40);}
 });
}

function starPath(c:CanvasRenderingContext2D,x:number,y:number,outer:number,inner:number){
 c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,radius=i%2?inner:outer;const px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();
}
/** A generic maple leaf (seven pointed lobes and a stem). */
export function leafPath(c:CanvasRenderingContext2D,x:number,y:number,size:number){
 c.beginPath();
 for(let i=0;i<=56;i++){
  const a=-Math.PI/2+i/56*Math.PI*2,lobe=Math.pow(Math.abs(Math.cos(a*3.5+Math.PI*.25)),.7),bottom=Math.max(0,Math.sin(a))*.45;
  const radius=size*(.42+.58*lobe)*(1-bottom);const px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;if(i)c.lineTo(px,py);else c.moveTo(px,py);
 }
 c.closePath();
}

export function bannerTexture(kind:'star'|'leaf'){
 return canvasTexture('banner-'+kind,128,256,c=>{
  c.fillStyle=kind==='star'?'#bc3528':'#ddbf89';c.fillRect(0,0,128,256);
  c.fillStyle=kind==='star'?'#f2c230':'#e7c26b';c.fillRect(0,0,128,10);c.fillRect(0,0,7,256);c.fillRect(121,0,7,256);
  if(kind==='star'){starPath(c,64,104,38,16);c.fill();}
  else{
   c.strokeStyle='#713a23';c.lineWidth=6;c.lineCap='round';c.beginPath();
   for(let i=0;i<=90;i++){const a=i/90*Math.PI*3.8,r=3+i/90*30,x=60+Math.cos(a)*r,y=105+Math.sin(a)*r;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();
   c.beginPath();c.moveTo(75,134);c.lineTo(110,134);c.lineTo(101,93);c.stroke();
   // A little paper fibre and weathering keeps the cloth from reading as UI.
   const r=rng(353);for(let i=0;i<360;i++){c.fillStyle=i%2?'rgba(76,42,19,.055)':'rgba(255,250,219,.12)';c.fillRect(r()*128,r()*256,.4+r()*1.3,2+r()*6);}
  }
  // Swallowtail hem.
  c.globalCompositeOperation='destination-out';c.beginPath();c.moveTo(30,256);c.lineTo(64,214);c.lineTo(98,256);c.closePath();c.fill();c.globalCompositeOperation='source-over';
 },{repeat:false});
}

export function roofTexture(color:string){
 return canvasTexture('roof-'+color,256,256,c=>{
  const [r0,g0,b0]=rgb(color);c.fillStyle=color;c.fillRect(0,0,256,256);
  for(let row=0;row<16;row++){
   const y=row*16,shift=row%2*8;
   c.fillStyle=`rgba(${r0+40},${g0+40},${b0+40},.35)`;c.fillRect(0,y,256,3);
   c.fillStyle='rgba(0,0,0,.28)';c.fillRect(0,y+13,256,3);
   for(let x=shift;x<264;x+=16){c.fillStyle='rgba(0,0,0,.16)';c.fillRect(x,y,2,16);}
  }
 });
}

export function mapleLeafTexture(){
 return canvasTexture('maple-leaf',64,64,c=>{
  const g=c.createLinearGradient(0,0,64,64);g.addColorStop(0,'#f2672e');g.addColorStop(1,'#c9301f');c.fillStyle=g;leafPath(c,32,30,26);c.fill();
  c.strokeStyle='rgba(120,30,15,.6)';c.lineWidth=1.5;c.beginPath();c.moveTo(32,56);c.lineTo(32,14);c.moveTo(32,34);c.lineTo(14,22);c.moveTo(32,34);c.lineTo(50,22);c.stroke();
 },{repeat:false});
}

export function planetTexture(){
 return canvasTexture('planet',512,256,c=>{
  const hash=(x:number,y:number,z:number)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7+77)*43758.5453;return n-Math.floor(n);};
  const noise=(x:number,y:number,z:number)=>{
   const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),smooth=(v:number)=>v*v*(3-2*v),fx=smooth(x-ix),fy=smooth(y-iy),fz=smooth(z-iz);let n=0;
   for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)n+=hash(ix+dx,iy+dy,iz+dz)*(dx?fx:1-fx)*(dy?fy:1-fy)*(dz?fz:1-fz);return n;
  };
  const image=c.createImageData(512,256);
  for(let py=0;py<256;py++)for(let px=0;px<512;px++){
   const latitude=(py/256-.5)*Math.PI,longitude=px/512*Math.PI*2,x=Math.cos(longitude)*Math.cos(latitude),y=Math.sin(latitude),z=Math.sin(longitude)*Math.cos(latitude);
   const land=noise(x*3+9,y*3+9,z*3+9)*.7+noise(x*8+19,y*8+19,z*8+19)*.2+noise(x*19+29,y*19+29,z*19+29)*.1;
   const clouds=Math.max(0,(noise(x*9+70,y*17+70,z*9+70)+.35*noise(x*22+90,y*35+90,z*22+90)-.73)*3.3),frost=Math.max(0,(Math.abs(y)-.8)*3);
   const terrain=land>.55?[100,155,115]:[57,139,178],ice=Math.min(.9,Math.max(clouds,frost)),detail=(land-.5)*40,index=(py*512+px)*4;
   for(let k=0;k<3;k++)image.data[index+k]=terrain[k]+detail+(241-terrain[k])*ice;image.data[index+3]=255;
  }
  c.putImageData(image,0,0);
 });
}
