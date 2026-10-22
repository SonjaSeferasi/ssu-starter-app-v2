import type * as Phaser from 'phaser';
export function combatArt(scene:Phaser.Scene){
 for(const key of ['fireball','ki','shuriken','rasengan','lightning','golden-beam','golden-hair','energy-aura','sand-orb','clay-bird']){
  const texture=scene.textures.createCanvas(key,128,128)!,c=texture.context;
  if(key==='clay-bird'){c.fillStyle='#eee5cd';c.strokeStyle='#a49b81';c.lineWidth=2;c.beginPath();c.moveTo(64,56);c.quadraticCurveTo(21,2,5,15);c.quadraticCurveTo(21,59,54,73);c.quadraticCurveTo(64,114,74,73);c.quadraticCurveTo(110,55,123,15);c.quadraticCurveTo(96,7,64,56);c.fill();c.stroke();c.beginPath();c.ellipse(64,68,12,30,0,0,Math.PI*2);c.fill();c.stroke();}else if(key==='golden-hair'){
   const points=[[20,95,4,49,33,61],[28,83,17,15,49,48],[43,72,42,0,64,43],[58,68,78,1,82,54],[73,75,111,16,98,70],[85,86,126,48,109,92]];
   for(const [x,y,tx,ty,bx,by] of points){const g=c.createLinearGradient(tx,ty,x,y);g.addColorStop(0,'#fffad1');g.addColorStop(.35,'#ffe07b');g.addColorStop(.7,'#edb32f');g.addColorStop(1,'#a66c14');c.fillStyle=g;c.strokeStyle='#9c6a1e';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+tx)/2-4,ty+20,tx,ty);c.quadraticCurveTo(tx+5,ty+30,bx,by);c.closePath();c.fill();c.stroke();}
   c.fillStyle='#f4c44b';c.beginPath();c.ellipse(64,85,38,22,0,Math.PI,Math.PI*2);c.fill();
  }else if(key==='shuriken'){
   const g=c.createLinearGradient(25,20,100,100);g.addColorStop(0,'#f4faff');g.addColorStop(.45,'#b2c4d0');g.addColorStop(.5,'#4f6373');g.addColorStop(1,'#223d4b');c.fillStyle=g;c.strokeStyle='#e1f6ff';c.lineWidth=2;c.beginPath();[[64,5],[74,47],[123,64],[78,76],[64,123],[51,79],[5,64],[48,51]].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();c.globalCompositeOperation='destination-out';c.beginPath();c.arc(64,64,10,0,Math.PI*2);c.fill();
  }else{
   const color=key==='sand-orb'?'194,146,81':key==='fireball'?'255,120,30':key==='golden-beam'?'255,216,65':'106,220,255';
   const g=c.createRadialGradient(64,64,3,64,64,62);g.addColorStop(0,'rgba(255,255,240,1)');g.addColorStop(.2,'rgba('+color+',1)');g.addColorStop(.5,'rgba('+color+',.7)');g.addColorStop(1,'rgba('+color+',0)');c.fillStyle=g;c.fillRect(0,0,128,128);
   if(key==='sand-orb'){for(let i=0;i<18;i++){c.fillStyle=i%2?'#e4c592':'#886f49';c.beginPath();c.arc(64+Math.sin(i*2.3)*30,64+Math.cos(i*1.7)*28,2+i%4,0,Math.PI*2);c.fill();}}
   if(key==='rasengan'){for(let i=0;i<6;i++){c.strokeStyle=i%2?'#e9ffff':'#5cceff';c.lineWidth=2;c.beginPath();c.ellipse(64,64,33,10,i*Math.PI/6,0,Math.PI*2);c.stroke();}}
   if(key==='lightning'){c.strokeStyle='#f5ffff';c.lineWidth=4;c.beginPath();[[8,72],[34,40],[48,70],[73,29],[79,65],[120,43]].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
   if(key==='golden-beam'){c.fillStyle='#fff8bb';c.beginPath();c.ellipse(64,64,60,10,0,0,Math.PI*2);c.fill();}
  }
  texture.refresh();
 }
}
