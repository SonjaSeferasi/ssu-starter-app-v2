import type * as Phaser from 'phaser';
import { Course,Region } from './levels';

export function drawAdventureBackdrop(scene:Phaser.Scene,course:Course){
 const key='journey-background';
 if(!scene.textures.exists(key))return false;
 const source=scene.textures.get(key).getSourceImage() as HTMLImageElement;
 const width=source.width*(540/source.height);
 scene.add.image(0,0,key).setName('panorama').setOrigin(0).setDisplaySize(Math.max(1600,width)+72,564)
   .setScrollFactor(Math.max(0,(width-960)/(course.width-960)),0).setDepth(-3);
 const haze=scene.add.graphics().setScrollFactor(0).setDepth(-2);
 haze.fillStyle(0xf4ecd5,.08);haze.fillRect(0,0,960,540);
 return true;
}

export function makeAdventureTextures(scene:Phaser.Scene,level:number){
 const g=scene.make.graphics({x:0,y:0});
 if(level===1){
   g.fillStyle(0x70462e);g.fillEllipse(24,23,43,30);g.fillTriangle(3,27,24,4,45,27);
   g.fillStyle(0xe1b581);g.fillEllipse(24,32,28,18);g.fillStyle(0x39291f);g.fillEllipse(11,42,19,8);g.fillEllipse(37,42,19,8);
   g.fillStyle(0xffffff);g.fillEllipse(17,20,11,17);g.fillEllipse(31,20,11,17);g.fillStyle(0x2b2931);g.fillEllipse(19,22,4,9);g.fillEllipse(29,22,4,9);
   g.lineStyle(3,0x482e23);g.lineBetween(9,12,22,17);g.lineBetween(38,12,26,17);
 }else if(level===2){
   g.fillStyle(0x49465e);g.fillRoundedRect(11,19,26,22,7);g.fillStyle(0xd4d6cb);g.fillRoundedRect(12,3,24,22,10);
   g.fillStyle(0x88508f);g.fillEllipse(24,6,18,10);g.fillStyle(0xd8cb80);g.fillRect(6,23,8,10);g.fillRect(35,23,8,10);
   g.fillStyle(0xd25862);g.fillRect(17,15,5,3);g.fillRect(28,15,5,3);g.fillStyle(0x32344c);g.fillRect(12,36,9,11);g.fillRect(29,36,9,11);
 }else{
   g.fillStyle(0x303b4a);g.fillRoundedRect(10,18,29,23,7);g.fillCircle(24,13,13);g.fillStyle(0xd4c9b4);g.fillRect(13,10,23,8);
   g.fillStyle(0xa65d44);g.fillRect(11,6,27,5);g.fillStyle(0x394557);g.fillRect(13,16,23,9);g.fillStyle(0x292e38);g.fillRect(12,37,10,10);g.fillRect(29,37,10,10);
   g.fillStyle(0xf1d59b);g.fillRect(16,12,5,2);g.fillRect(28,12,5,2);g.lineStyle(2,0xa9afb0);g.lineBetween(36,28,46,17);
 }
 g.generateTexture('villain',48,48);g.clear();
 const color=level===1?0xff9847:level===2?0x8ee8ff:0x72d5ec;
 g.fillStyle(color,.15);g.fillCircle(20,20,20);g.fillStyle(color,.6);g.fillCircle(20,20,12);g.fillStyle(0xffffff);g.fillCircle(20,20,6);
 if(level===3){g.lineStyle(2,color);g.strokeEllipse(20,20,32,16);g.strokeEllipse(20,20,16,32);}
 g.generateTexture('power',40,40);g.clear();
 if(level===3){
   g.fillStyle(0x765244);g.fillRoundedRect(3,7,30,22,4);g.fillStyle(0xe8d6b2);g.fillRect(8,8,20,20);g.fillStyle(0x9a4f3d);g.fillRect(16,9,5,18);g.fillStyle(0xb68652);g.fillRect(3,5,5,26);g.fillRect(28,5,5,26);
 }else{
   g.fillStyle(level===1?0xffd65a:0xffab43);g.fillCircle(18,18,14);g.lineStyle(2,0xbc7a32);g.strokeCircle(18,18,14);
   if(level===1){g.fillStyle(0xfff0a2);g.fillRect(15,8,6,20);}else{g.fillStyle(0xbd4a38);g.fillTriangle(18,9,12,22,24,22);g.fillTriangle(11,14,25,14,18,26);g.fillStyle(0xffffff,.5);g.fillCircle(12,10,4);}
 }
 g.generateTexture('relic',36,36);g.destroy();
}

export function decorateRegion(scene:Phaser.Scene,region:Region,course:Course){
 const g=scene.add.graphics().setDepth(-1);
 const left=region.from,right=region.to;
 // Local foreground details travel with the world, so the route changes visibly
 // even with the distant painted panorama moving more slowly in parallax.
 if(region.style==='forest'){
   for(let x=left+60;x<right;x+=190){g.fillStyle(0x3e5945,.18);g.fillRect(x,220,18,350);g.fillStyle(0x7d9270,.13);g.fillRect(x+4,225,3,310);g.fillStyle(0x456b49,.12);g.fillEllipse(x+12,220,180,105);g.fillStyle(0x6f985f,.1);g.fillEllipse(x-30,182,110,70);}
 }else if(region.style==='sand'){
   for(let x=left+20;x<right;x+=210){g.fillStyle(0xb89567,.24);g.fillRoundedRect(x,280,150,270,60);g.fillStyle(0xd3b380,.24);g.fillEllipse(x+75,290,150,70);g.fillStyle(0x766c50);g.fillRoundedRect(x+60,350,24,42,12);}
 }else if(region.style==='cloud'){
   g.fillStyle(0xeaf0eb,.65);for(let x=left;x<right;x+=170){g.fillEllipse(x,500,310,100);g.fillEllipse(x+60,460,190,90);}
 }else if(region.style==='cavern'){
   g.fillStyle(0x45405d,.6);g.fillRect(left,0,right-left,130);
   for(let x=left;x<right;x+=120){g.fillTriangle(x,130,x+70,130,x+40,200);g.fillStyle(0x8a6dab,.5);g.fillTriangle(x+50,530,x+80,390,x+120,530);}
 }else if(region.style==='castle'){
   for(let x=left+50;x<right;x+=200){g.fillStyle(0x535367,.28);g.fillRect(x,160,55,380);g.fillStyle(0x747084,.25);for(let y=170;y<520;y+=35)g.fillRect(x+5,y,45,3);g.fillStyle(0xe8a14e,.6);g.fillEllipse(x+25,340,25,40);}
   g.fillStyle(0xed793e,.55);g.fillRect(left,515,right-left,25);
 }else if(region.style==='arena'){
   g.lineStyle(2,0x99b6b8,.45);for(let x=left;x<right;x+=160)g.lineBetween(x,30,x-60,130);
 }
 // Region signposts sit before the first safe landing in each new location.
 const p=course.platforms.find(p=>p.x>=left)||course.platforms[0];
 scene.add.rectangle(p.x+35,p.y-22,4,44,0x6a6652);
 scene.add.rectangle(p.x+65,p.y-51,128,28,0x2b453b,.88).setStrokeStyle(1,0xe0d8b7,.5);
 scene.add.text(p.x+65,p.y-51,region.name,{fontFamily:'Arial',fontSize:'11px',color:'#fff4d9'}).setOrigin(.5);
}

export function drawJourneySurface(scene:Phaser.Scene,p:Course['platforms'][number],region:Region){
 const g=scene.add.graphics().setDepth(1);
 if(region.style==='forest'){
   g.fillStyle(0x563e2b);g.fillRoundedRect(p.x,p.y+2,p.width,35,13);
   g.fillStyle(0x886242);g.fillRoundedRect(p.x,p.y+3,p.width,13,6);
   g.lineStyle(2,0xb28b58,.7);for(let y=10;y<34;y+=8)g.lineBetween(p.x+12,p.y+y,p.x+p.width-12,p.y+y+3);
   g.fillStyle(0x6d9150);g.fillRoundedRect(p.x-2,p.y-2,p.width+4,7,3);
 }else if(region.style==='sand'){
   g.fillStyle(0xc4a171);g.fillRoundedRect(p.x,p.y+1,p.width,45,8);
   g.fillStyle(0xe5c48e);g.fillRoundedRect(p.x-2,p.y-2,p.width+4,10,4);
   g.lineStyle(2,0x957d5f,.6);g.lineBetween(p.x+10,p.y+22,p.x+p.width-20,p.y+18);
 }else if(region.style==='cloud'){
   g.fillStyle(0xc9d1c4);g.fillRoundedRect(p.x,p.y+1,p.width,30,6);
   g.fillStyle(0xf2f1e0);g.fillRoundedRect(p.x-2,p.y-2,p.width+4,9,3);
   g.lineStyle(1,0x929f91,.6);for(let x=p.x+30;x<p.x+p.width;x+=45)g.lineBetween(x,p.y+10,x-5,p.y+30);
 }else if(region.style==='konoha'){
   g.fillStyle(0x6b7560);g.fillRoundedRect(p.x,p.y+2,p.width,24,5);
   g.fillStyle(0xa35e42);g.fillRoundedRect(p.x-2,p.y-2,p.width+4,10,3);
   g.lineStyle(1,0xdba078);for(let x=p.x+12;x<p.x+p.width;x+=18)g.lineBetween(x,p.y,x+4,p.y+9);
 }else if(region.style==='castle'||region.style==='arena'){
   g.fillStyle(0x626271);g.fillRoundedRect(p.x,p.y+1,p.width,40,3);
   g.fillStyle(0x8d8993);g.fillRect(p.x,p.y,p.width,8);
   g.lineStyle(2,0x424858);for(let x=p.x+35;x<p.x+p.width;x+=55)g.lineBetween(x,p.y+9,x-5,p.y+35);
 }
}
