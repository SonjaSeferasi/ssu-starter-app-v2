import type * as Phaser from 'phaser';
import type {Platform,Region} from './levels';

// The visible curve and the collision bodies use the same height profile.
export function surfaceY(p:Platform,x:number){
  const t=Math.max(0,Math.min(1,(x-p.x)/p.width));
  // A smooth irregular ridge with flat-safe lips, rather than a straight slab.
  const envelope=Math.sin(t*Math.PI);
  return p.y-envelope*(12+Math.sin(t*Math.PI*3+p.x*.007)*5)+Math.sin(t*Math.PI*2)*4;
}
const noise=(n:number)=>{const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);};

export function naturalTerrain(scene:Phaser.Scene,p:Platform,group:Phaser.Physics.Arcade.StaticGroup,level:number,style:Region['style']){
  const slabs:Phaser.GameObjects.Rectangle[]=[];
  const segments=Math.ceil(p.width/16),step=p.width/segments;
  for(let i=0;i<segments;i++){
    const x=p.x+(i+.5)*step,y=surfaceY(p,x);
    const slab=scene.add.rectangle(x,y+10,step+.5,20,0,0);
    scene.physics.add.existing(slab,true);group.add(slab);slabs.push(slab);
    const body=slab.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.left=false;body.checkCollision.right=false;body.checkCollision.down=false;
  }
  // A solid core prevents characters from entering the visible rock/log body.
  // Separate one-way surface segments keep curved walking free of stair snags.
  const depth=Math.max(35,Math.min(88,p.width*.3));
  const core=scene.add.rectangle(p.x+p.width/2,p.y+12+depth/2,p.width-18,depth,0,0).setData('terrainSolid',true);
  scene.physics.add.existing(core,true);group.add(core);slabs.push(core);
  const key='terrain-'+p.x+'-'+p.y;
  if(level===1&&style==='castle'&&p.width<200&&scene.textures.exists('interaction-props')){
    const texture=scene.textures.createCanvas(key,Math.ceil(p.width)+20,115)!,ctx=texture.context,atlas=scene.textures.get('interaction-props').getSourceImage() as HTMLImageElement;
    ctx.drawImage(atlas,1536+20,20,728,460,10,20,p.width,85);texture.refresh();const image=scene.add.image(p.x-10,p.y-30,key).setOrigin(0).setDepth(2);return{image,slabs};
  }
  if(scene.textures.exists('terrain-props')){
    const texture=scene.textures.createCanvas(key,Math.ceil(p.width)+20,280)!,ctx=texture.context;
    const atlas=scene.textures.get('terrain-props').getSourceImage() as HTMLImageElement;
    const wood=style==='forest',column=wood?2:level===2||style==='sand'||style==='castle'||style==='cloud'?1:0;
    const height=Math.max(92,Math.min(245,p.width*.62));
    // Strip-warp the painted prop along the same ridge as collision. The back
    // of its visible top is the walking surface; roots and rocks hang below it.
    for(let x=0;x<p.width;x+=2){
      const sx=column*768+24+x/p.width*720,sw=2/p.width*720+1;
      const y=30+surfaceY(p,p.x+x)-p.y-height*.18;
      ctx.drawImage(atlas,sx,0,sw,460,x+10,y,2.4,height);
    }
    texture.refresh();const image=scene.add.image(p.x-10,p.y-30,key).setOrigin(0).setDepth(2);
    return{image,slabs};
  }
  const texture=scene.textures.createCanvas(key,Math.ceil(p.width)+20,250)!;
  const ctx=texture.context;
  const top=(x:number)=>30+surfaceY(p,p.x+x)-p.y;
  const rocky=['castle','cavern','arena','cloud','konoha'].includes(style);
  const sandy=style==='sand',wood=style==='forest';
  const grass=!wood&&!rocky&&!sandy&&style!=='konoha';
  const visualDepth=wood?80:p.width<200?118:170;
  const bottom=(x:number)=>70+Math.pow(Math.sin(x/p.width*Math.PI),.6)*(visualDepth-70)+noise(p.x+Math.floor(x/13))*10;
  function contour(){
    ctx.beginPath();ctx.moveTo(10,top(0));
    for(let x=4;x<p.width;x+=4)ctx.lineTo(10+x,top(x));
    ctx.lineTo(p.width+10,top(p.width));ctx.lineTo(p.width+6,64);
    for(let x=p.width-8;x>=8;x-=13)ctx.lineTo(10+x,bottom(x));
    ctx.lineTo(14,64);ctx.closePath();
  }
  ctx.save();contour();ctx.clip();
  ctx.fillStyle=sandy?'#bfa077':rocky?'#65676a':'#806445';ctx.fillRect(0,0,texture.width,250);
  if(scene.textures.exists('terrain-materials')){
    const atlas=scene.textures.get('terrain-materials').getSourceImage() as HTMLImageElement;
    const w=atlas.width/2,h=atlas.height/2,sx=rocky||wood?w:0,sy=sandy||wood?h:0;
    // Repeat the source at a consistent physical scale, never stretch one stone
    // across an entire landing. Each platform gets a deterministic crop offset.
    const offset=Math.floor(noise(p.x)*180);
    for(let x=-offset;x<texture.width;x+=210)ctx.drawImage(atlas,sx,sy,w,h,x,-12,212,212);
  }
  const shade=ctx.createLinearGradient(0,15,0,230);
  shade.addColorStop(0,'rgba(255,234,185,.12)');shade.addColorStop(.25,'rgba(12,22,23,.05)');shade.addColorStop(1,'rgba(13,24,26,.75)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,texture.width,250);
  // A narrow bevel casts a contact shadow over the textured earth underneath.
  ctx.strokeStyle='rgba(12,22,20,.55)';ctx.lineWidth=7;ctx.beginPath();
  for(let x=0;x<=p.width;x+=4){if(!x)ctx.moveTo(10+x,top(x)+9);else ctx.lineTo(10+x,top(x)+9);}ctx.stroke();
  ctx.restore();
  const rim=ctx.createLinearGradient(0,12,0,45);
  rim.addColorStop(0,sandy?'#e6d0a6':rocky?'#bdc0b2':style==='konoha'?'#bb8060':level===2?'#9dbd8a':'#a6b971');
  rim.addColorStop(1,sandy?'#a4875e':rocky?'#696f69':style==='konoha'?'#704d3d':'#4b663e');
  ctx.fillStyle=rim;ctx.beginPath();ctx.moveTo(10,top(0));
  for(let x=3;x<=p.width;x+=3)ctx.lineTo(10+x,top(x));
  for(let x=p.width;x>=0;x-=3)ctx.lineTo(10+x,top(x)+7+noise(p.x+x)*3);
  ctx.closePath();ctx.fill();
  if(wood){
    ctx.strokeStyle='#e1c18c';ctx.lineWidth=2;
    for(let x=14;x<p.width-5;x+=18){const y=top(x);ctx.beginPath();ctx.moveTo(x+10,y+7);ctx.lineTo(x+8,y+39);ctx.stroke();}
    ctx.strokeStyle='#403125';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(13,top(3)+42);ctx.lineTo(p.width+5,top(p.width-5)+42);ctx.stroke();
  }
  if(grass){
    // Dense overlapping blades make a soft turf silhouette, with low flowers
    // and moss. Their roots meet the exact walkable collision curve.
    const colors=level===2?['#486f54','#789b65','#a8c783','#c2dca2']:['#3e5e30','#68873d','#96ae57','#c9d98e'];
    for(let layer=0;layer<3;layer++)for(let x=2;x<p.width-2;x+=2){
      const n=noise(p.x+x+layer*71),height=3+n*7,base=top(x)+4-layer;
      ctx.strokeStyle=colors[(Math.floor(n*3)+layer)%colors.length];ctx.lineWidth=.65+layer*.2;
      ctx.beginPath();ctx.moveTo(x+10,base);ctx.quadraticCurveTo(x+10+n*3,base-height*.7,x+9+(n-.5)*6,base-height);ctx.stroke();
      if(layer===2&&n>.984){ctx.fillStyle='#e9dfb7';ctx.beginPath();ctx.arc(x+10,base-height,1.3,0,Math.PI*2);ctx.fill();}
    }
  }else{
    for(let x=6;x<p.width-4;x+=9){const n=noise(x+p.x);ctx.fillStyle=sandy?'#ead4ae':'#b1b6ac';ctx.globalAlpha=.35+n*.4;ctx.beginPath();ctx.ellipse(x+10,top(x)+2,1+n*3,.5+n,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  }
  if(grass||wood){
    for(let x=25;x<p.width-15;x+=49){const n=noise(x+p.x),y=bottom(x)-2;ctx.strokeStyle='rgba(87,79,47,.8)';ctx.lineWidth=1+n;ctx.beginPath();ctx.moveTo(x+10,y-6);ctx.bezierCurveTo(x+5,y+5,x+15,y+9,x+9,y+16+n*12);ctx.stroke();}
  }
  texture.refresh();
  const image=scene.add.image(p.x-10,p.y-30,key).setOrigin(0).setDepth(2);
  return {image,slabs};
}
