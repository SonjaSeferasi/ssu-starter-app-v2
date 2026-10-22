import type * as Phaser from 'phaser';
import type {Course} from './levels';
import {surfaceY} from './terrain';
export function courseInteractions(scene:Phaser.Scene,course:Course,player:Phaser.Physics.Arcade.Sprite,platforms:Phaser.Physics.Arcade.StaticGroup,notice:(text:string)=>void){
 const art=scene.textures.createCanvas('spring-mushroom',100,96)!,ctx=art.context;
 const stem=ctx.createLinearGradient(28,20,70,90);stem.addColorStop(0,'#f2dfae');stem.addColorStop(.5,'#fff0cb');stem.addColorStop(1,'#9b7548');ctx.fillStyle=stem;ctx.beginPath();ctx.moveTo(38,30);ctx.quadraticCurveTo(42,65,29,91);ctx.lineTo(74,91);ctx.quadraticCurveTo(58,61,64,30);ctx.fill();
 const cap=ctx.createRadialGradient(35,20,3,50,37,52);cap.addColorStop(0,'#f68d6f');cap.addColorStop(.45,'#c74431');cap.addColorStop(1,'#62291f');ctx.fillStyle=cap;ctx.beginPath();ctx.ellipse(50,35,47,30,0,Math.PI,Math.PI*2);ctx.quadraticCurveTo(98,58,50,59);ctx.quadraticCurveTo(0,57,3,35);ctx.fill();ctx.fillStyle='#fff0ca';for(const [x,y,size] of [[20,29,7],[44,16,8],[70,24,7],[81,40,5],[44,41,6]]){ctx.beginPath();ctx.ellipse(x,y,size,size*.7,0,0,Math.PI*2);ctx.fill();}art.refresh();
 const bouncers=course.number===1?[0,3,8].filter(i=>course.platforms[i]).map(i=>{const p=course.platforms[i],x=p.x+120,y=surfaceY(p,x);return scene.add.image(x,y,scene.textures.exists('interaction-props')?'interaction-props':'spring-mushroom','0').setOrigin(.5,1).setDisplaySize(54,52).setDepth(3);}):[];
 const pipes=course.number===1?[3,8].filter(i=>course.platforms[i]).map(i=>{const p=course.platforms[i],x=p.x+p.width-80,y=surfaceY(p,x),g=scene.add.graphics().setDepth(3);g.fillStyle(0x245a29);g.fillRoundedRect(x-24,y-57,48,57,4);g.fillStyle(0x509b41);g.fillRect(x-19,y-55,12,54);g.fillStyle(0x80ba5f);g.fillRect(x-16,y-55,4,54);g.fillStyle(0x173d22);g.fillEllipse(x,y-57,59,15);g.lineStyle(5,0x6da54b);g.strokeEllipse(x,y-57,59,15);if(scene.textures.exists('interaction-props')){g.setVisible(false);scene.add.image(x,y,'interaction-props','1').setDisplaySize(70,70).setOrigin(.5,1).setDepth(3);}
 const body=scene.add.rectangle(x,y-30,49,57,0,0);scene.physics.add.existing(body,true);platforms.add(body);return{x,y};}):[];
 let lastWarp=-3000;
 const ladders=course.number===3?[0,5,10].filter(i=>course.platforms[i]).map(i=>{const p=course.platforms[i],x=p.x+158,top=p.y-117,bottom=surfaceY(p,x);const g=scene.add.graphics().setDepth(3);g.lineStyle(3,0x715436);g.lineBetween(x-10,top,x-10,bottom);g.lineBetween(x+10,top,x+10,bottom);g.lineStyle(3,0xc2a878);for(let y=top+10;y<bottom;y+=13)g.lineBetween(x-10,y,x+10,y);return{x,top,bottom};}):[];
 const checkpoints=[5,10].filter(i=>course.platforms[i]).map(i=>{const p=course.platforms[i],x=p.x+65,y=surfaceY(p,x);const g=scene.add.graphics().setDepth(3);g.fillStyle(0x654d34);g.fillRect(x-2,y-54,4,54);g.lineStyle(3,0x654d34);g.lineBetween(x,y-52,x+20,y-52);g.fillStyle(0xe7bd61);g.fillRoundedRect(x+9,y-50,23,27,4);g.lineStyle(2,0x6b593a);g.strokeRoundedRect(x+9,y-50,23,27,4);g.fillStyle(0xfff0b5,.7);g.fillRect(x+14,y-45,13,17);const glow=scene.add.circle(x+20,y-37,17,0xffde81,.07).setDepth(2);return{x:x+20,y,glow,active:false};});
 let lastBounce=-1000,checkpoint:{x:number;y:number}|null=null;
 return{
  update(now:number){const body=player.body as Phaser.Physics.Arcade.Body;
   for(const mushroom of bouncers){if(now-lastBounce>650&&Math.abs(player.x-mushroom.x)<28&&Math.abs(player.y-(mushroom.y-20))<35&&body.velocity.y>=0){player.setVelocityY(-660);lastBounce=now;notice('Mushroom spring! Steer toward the upper route.');scene.tweens.add({targets:mushroom,scaleY:mushroom.scaleY*.7,duration:90,yoyo:true});}}
   for(const lantern of checkpoints)if(!lantern.active&&Math.abs(player.x-lantern.x)<38&&Math.abs(player.y-lantern.y)<45){lantern.active=true;lantern.glow.setAlpha(.3);checkpoint={x:lantern.x+35,y:lantern.y-10};notice('Checkpoint lit. Falls return here during this attempt.');}
   scene.game.canvas.dataset.checkpoint=checkpoint?String(Math.round(checkpoint.x)):'none';
  },
  warp(now:number,down:boolean){if(!down||now-lastWarp<1800||pipes.length<2)return false;const i=pipes.findIndex(p=>Math.abs(player.x-p.x)<24&&Math.abs(player.y-(p.y-58))<18);if(i<0)return false;const target=pipes[(i+1)%pipes.length];player.body!.reset(target.x,target.y-66);player.setVelocity(0,0);lastWarp=now;notice('Pipe shortcut! You emerged farther along the trail.');return true;},
  climb(up:boolean,down:boolean){if(!up&&!down)return false;const ladder=ladders.find(l=>Math.abs(player.x-l.x)<17&&player.y>l.top&&player.y<l.bottom+8);if(!ladder)return false;player.setVelocityY(up?-140:120);return true;},
  checkpoint:()=>checkpoint
 };
}
