// Animate pixels already present in the artwork. Masks are authored in source
// image coordinates, so rivers never detach from banks and cliffs never drift.
type Zone={points:number[][];kind:'cloud'|'water'};
const zones:Record<number,Zone[]>={
 0:[{kind:'cloud',points:[[.01,.005],[.62,.005],[.62,.075],[.01,.075]]},{kind:'cloud',points:[[.86,.01],[1,.01],[1,.075],[.86,.075]]},{kind:'water',points:[[.14,.25],[.163,.25],[.172,.43],[.146,.43]]},{kind:'water',points:[[.49,.65],[.524,.65],[.53,.79],[.495,.79]]},{kind:'water',points:[[.505,.86],[.535,.86],[.545,.98],[.512,.98]]},{kind:'water',points:[[.42,.275],[.438,.275],[.439,.38],[.424,.38]]},{kind:'water',points:[[.35,.42],[.58,.41],[.63,.59],[.44,.62]]}],
 1:[{kind:'cloud',points:[[.01,.005],[.43,.005],[.43,.12],[.01,.12]]},{kind:'water',points:[[.563,.258],[.577,.258],[.578,.6],[.56,.6]]},{kind:'water',points:[[.65,.34],[.675,.34],[.672,.69],[.647,.69]]}],
 2:[{kind:'cloud',points:[[.04,.01],[.5,.01],[.5,.13],[.04,.13]]},{kind:'water',points:[[.28,.63],[.58,.63],[.6,.86],[.28,.86]]}],
 3:[{kind:'cloud',points:[[.02,.005],[.27,.005],[.27,.09],[.02,.09]]},{kind:'water',points:[[.46,.48],[.48,.48],[.48,.76],[.46,.76]]}]
};
export function livingArtwork(source:HTMLImageElement,world:number){
 const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
 const ctx=canvas.getContext('2d')!;ctx.drawImage(source,0,0);
 const layers=(zones[world]||[]).map(zone=>{
  const points=zone.points.map(([x,y])=>[x*canvas.width,y*canvas.height]);
  const left=Math.floor(Math.min(...points.map(p=>p[0]))),top=Math.floor(Math.min(...points.map(p=>p[1]))),right=Math.ceil(Math.max(...points.map(p=>p[0]))),bottom=Math.ceil(Math.max(...points.map(p=>p[1])));
  const mask=document.createElement('canvas');mask.width=right-left;mask.height=bottom-top;const m=mask.getContext('2d')!;
  m.fillStyle='#fff';m.beginPath();points.forEach(([x,y],i)=>i?m.lineTo(x-left,y-top):m.moveTo(x-left,y-top));m.closePath();m.fill();
  // Feather only inside the authored patch, avoiding rectangular seams.
  const pixels=m.getImageData(0,0,mask.width,mask.height);for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){const edge=Math.min(x,y,mask.width-x-1,mask.height-y-1);pixels.data[(y*mask.width+x)*4+3]*=Math.min(1,edge/14);}m.putImageData(pixels,0,0);
  const patch=document.createElement('canvas');patch.width=mask.width;patch.height=mask.height;return{zone,mask,patch,left,top};
 });
 let previous=-100;
 return{canvas,update(ms:number){if(ms-previous<66)return false;previous=ms;ctx.drawImage(source,0,0);
  for(const {zone,mask,patch,left,top} of layers){const p=patch.getContext('2d')!;p.clearRect(0,0,patch.width,patch.height);p.globalCompositeOperation='source-over';
   if(zone.kind==='cloud'){
    const drift=Math.sin(ms/18000)*12;p.drawImage(source,left+drift,top,patch.width,patch.height,0,0,patch.width,patch.height);
   }else{
    // Continuous local UV flow; no new waterfall graphics are painted.
    for(let y=0;y<patch.height;y+=3){const shift=Math.sin(y*.08-ms*.004)*1.4,flow=Math.sin(y*.06-ms*.006)*2.8;p.drawImage(source,left+shift,top+y+flow,patch.width,3,0,y,patch.width,3.2);}
   }
   p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);p.globalCompositeOperation='source-over';ctx.drawImage(patch,left,top);
  }return true;
 }};
}
