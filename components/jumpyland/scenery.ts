import type * as Phaser from 'phaser';
import type { Course } from './levels';
import { themeFor } from './themes';

// Authored, deterministic scenery: layers move at different camera speeds.
// Decorative silhouettes never participate in collisions.
export function drawScenery(scene: Phaser.Scene, course: Course) {
  if(course.number<3){drawAdventureWorld(scene,course);return;}
  const warm = course.number === 3;
  const sky = scene.textures.createCanvas('sky', 960, 540)!;
  const ctx = sky.context;
  const gradient = ctx.createLinearGradient(0, 0, 0, 540);
  const palette=themeFor(course.number);
  gradient.addColorStop(0,palette.sky[0]);
  gradient.addColorStop(.58,palette.sky[1]);
  gradient.addColorStop(1,palette.sky[2]);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 960, 540);
  const glow = ctx.createRadialGradient(760, 110, 5, 760, 110, 180);
  glow.addColorStop(0, '#fff9dc'); glow.addColorStop(.15, '#fff2c5bb'); glow.addColorStop(1, '#fff2c500');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 960, 540); sky.refresh();
  scene.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0);
  const distant = scene.add.graphics().setScrollFactor(.12);
  for (let i = 0; i < 15; i++) {
    const x = i * 170 - 80;
    distant.fillStyle(warm ? 0xb8b2a0 : 0xa4beb6, .55);
    distant.fillTriangle(x, 470, x + 200, 470, x + 90, 260 + (i % 4) * 30);
    distant.fillStyle(0xf6f3dc, .2); distant.fillTriangle(x+90,260+(i%4)*30,x+110,360,x+62,340);
  }
  const clouds = scene.add.graphics().setScrollFactor(.18);
  for (let i=0;i<12;i++) {
    const x=i*240+50,y=62+(i%3)*38;
    clouds.fillStyle(0xffffff,.22);clouds.fillEllipse(x,y+8,155,38);
    clouds.fillStyle(0xffffff,.55);clouds.fillEllipse(x-15,y,100,26);clouds.fillEllipse(x+16,y-12,65,40);
  }
  const campus=scene.add.graphics().setScrollFactor(.32);
  for(let i=0;i<5;i++) {
    const x=280+i*530,y=305+(i%2)*40;
    campus.fillStyle(0xb5a181,.8);campus.fillRect(x,y,205,155);
    campus.fillStyle(0x536c62,.9);campus.fillTriangle(x-22,y,x+227,y,x+100,y-58);
    campus.fillRoundedRect(x-22,y-4,249,10,4);
    campus.fillStyle(0x526b5b,.8);campus.fillRect(x+76,y-85,48,70);
    campus.fillTriangle(x+57,y-85,x+143,y-85,x+100,y-115);
    campus.lineStyle(1,0xd6d5b7,.4);
    for(let row=0;row<12;row++)campus.lineBetween(x,y+row*13,x+205,y+row*13);
    campus.fillStyle(warm?0xffe0a0:0xe0e7cb,.85);
    for(let wx=x+18;wx<x+200;wx+=34)for(let wy=y+18;wy<y+140;wy+=34)campus.fillRoundedRect(wx,wy,13,22,6);
    campus.fillStyle(0xb66045);campus.fillRect(x+55,y+100,7,55);campus.fillRect(x+143,y+100,7,55);campus.fillRoundedRect(x+42,y+96,122,9,4);
    campus.fillStyle(0xf3cd7e);campus.fillEllipse(x+28,y+87,16,22);campus.fillEllipse(x+176,y+87,16,22);
  }
  const woods=scene.add.graphics().setScrollFactor(.52);
  for(let i=0;i<32;i++) {
    const x=i*95-40,y=440+(i%3)*25;
    woods.fillStyle(0x4e7354,.8);woods.fillRect(x,y-205,7,240);
    woods.lineStyle(2,0x91a478,.8);for(let yy=y-190;yy<y+20;yy+=30)woods.lineBetween(x,yy,x+7,yy);
    woods.fillStyle(0x597d5a,.6);woods.fillEllipse(x+2,y-158,62,94);
    woods.fillStyle(0x9aaf75,.5);woods.fillEllipse(x-10,y-185,39,53);
  }
  const mist=scene.add.graphics().setScrollFactor(.65);
  mist.fillStyle(warm?0xf8e5b8:0xe2eee2,.4);mist.fillEllipse(550,575,1600,210);
}

export function drawIsland(scene:Phaser.Scene,p:Course['platforms'][number],seed:number) {
  const g=scene.add.graphics();
  if(seed===1){
    g.fillStyle(0x6d4b31,.14);g.fillEllipse(p.x+p.width/2,p.y+69,p.width-12,20);
    g.fillStyle(0x8d4f2e);g.fillRoundedRect(p.x,p.y+6,p.width,54,3);
    for(let row=0;row<3;row++)for(let x=p.x-((row%2)*18);x<p.x+p.width;x+=36){const start=Math.max(p.x,x),end=Math.min(p.x+p.width,x+33);if(end<=start)continue;g.fillStyle(row%2?0xb66c3f:0xc37c48);g.fillRect(start,p.y+9+row*16,end-start,13);g.lineStyle(1,0xe6a76b,.6);g.lineBetween(start+1,p.y+10+row*16,end-1,p.y+10+row*16);}
    g.fillStyle(0x438d32);g.fillRoundedRect(p.x-2,p.y,p.width+4,10,3);g.fillStyle(0x7fc945);g.fillRoundedRect(p.x-2,p.y-2,p.width+4,5,3);
    return g;
  }
  // Rock under the platform has depth and irregular edges, while the collision
  // surface remains the authored rectangular top.
  g.fillStyle(0x5c6557,.12);g.fillEllipse(p.x+p.width/2,p.y+82,p.width-20,28);
  g.fillStyle(0x726856);g.fillPoints([{x:p.x,y:p.y+12},{x:p.x+p.width,y:p.y+12},{x:p.x+p.width-15,y:p.y+51},{x:p.x+p.width*.69,y:p.y+81},{x:p.x+p.width*.38,y:p.y+69},{x:p.x+17,y:p.y+48}],true);
  g.fillStyle(0x8c7d61);g.fillTriangle(p.x+3,p.y+12,p.x+p.width*.55,p.y+18,p.x+p.width*.38,p.y+69);
  g.fillStyle(0x5b5f50);g.fillTriangle(p.x+p.width*.55,p.y+18,p.x+p.width,p.y+12,p.x+p.width*.69,p.y+81);
  g.fillStyle(0x9b8968,.8);g.fillTriangle(p.x+p.width*.38,p.y+69,p.x+p.width*.55,p.y+18,p.x+p.width*.69,p.y+81);
  g.fillStyle(0x665843);g.fillRoundedRect(p.x,p.y+7,p.width,18,5);
  g.fillStyle(seed===2?0x467d77:0x47674b);g.fillRoundedRect(p.x-2,p.y,p.width+4,13,5);
  g.fillStyle(themeFor(seed).grass);g.fillRoundedRect(p.x-2,p.y-2,p.width+4,7,3);
  g.lineStyle(1,0x8aab6a,.8);
  for(let x=p.x+8;x<p.x+p.width-5;x+=9) {
    const n=Math.abs(Math.sin(x*12.13+seed*41));
    g.lineBetween(x,p.y+2,x+2,p.y-3-n*4);
    if(n>.82){g.fillStyle(0xc6cbb0);g.fillEllipse(x,p.y+30,5,3);}
    if(n>.92){g.fillStyle(0xf2dc9c);g.fillCircle(x,p.y-6,1.6);}
  }
  // Hanging roots and moss break up the formerly flat rectangular underside.
  g.lineStyle(1.5,0x737848,.8);
  for(let x=p.x+30;x<p.x+p.width;x+=53){g.lineBetween(x,p.y+30,x-4,p.y+63);g.lineBetween(x-4,p.y+63,x+2,p.y+68);}
  return g;
}

function drawAdventureWorld(scene:Phaser.Scene,course:Course){
  const theme=themeFor(course.number),energy=course.number===2;
  const sky=scene.textures.createCanvas('sky',960,540)!;
  const grad=sky.context.createLinearGradient(0,0,0,540);theme.sky.forEach((c,i)=>grad.addColorStop(i/2,c));
  sky.context.fillStyle=grad;sky.context.fillRect(0,0,960,540);sky.refresh();scene.add.image(0,0,'sky').setOrigin(0).setScrollFactor(0);
  const far=scene.add.graphics().setScrollFactor(.15);
  if(energy){
    far.fillStyle(0xe3f4d4,.75);far.fillCircle(740,95,48);far.fillStyle(0xb8dbb1,.6);far.fillCircle(720,82,14);far.fillCircle(758,109,18);
    far.fillStyle(0xf6e6cb,.7);far.fillCircle(185,130,22);
    for(let i=0;i<15;i++){
      const x=i*160-20,y=300+(i%4)*32;
      far.fillStyle(0x8e9c8e,.55);far.fillPoints([{x,y:540},{x:x+13,y},{x:x+90,y:y-18},{x:x+128,y:540}],true);
      far.fillStyle(0xa4afa0,.8);far.fillEllipse(x+52,y-10,110,28);
      far.fillStyle(0xc5d5b9,.5);far.fillEllipse(x+52,y-15,100,10);
    }
  }else{
    far.fillStyle(0xffffff,.85);for(let i=0;i<12;i++){let x=i*230+30,y=75+(i%3)*25;far.fillEllipse(x,y,120,35);far.fillCircle(x-20,y-12,25);far.fillCircle(x+20,y-8,20);}
    for(let i=0;i<14;i++){
      const x=i*190-40,y=425+(i%3)*20;
      far.fillStyle(i%2?0x8ed86a:0xb5de76);far.fillRoundedRect(x,y-190,130,280,65);
      far.fillStyle(0xecf5b2,.4);far.fillEllipse(x+36,y-140,18,40);
    }
  }
  const near=scene.add.graphics().setScrollFactor(.42);
  for(let i=0;i<26;i++){
    const x=i*110-40,y=470+(i%2)*22;
    if(energy){
      near.fillStyle(0x7c877a,.65);near.fillRect(x,y-25,5,70);near.fillStyle(0x75a897,.7);near.fillEllipse(x+2,y-44,50,70);near.fillStyle(0xa4c6a2,.55);near.fillEllipse(x-9,y-56,25,40);
    }else{
      near.fillStyle(0x4baf4b,.9);near.fillEllipse(x,y,145,65);near.fillEllipse(x+35,y-15,75,65);
      if(i%4===1){near.fillStyle(0x288e41);near.fillRect(x,y-82,42,95);near.fillStyle(0x63c453);near.fillRect(x+5,y-81,9,94);near.fillStyle(0x237c38);near.fillRoundedRect(x-5,y-89,52,17,3);near.fillStyle(0x7bd563);near.fillRect(x-2,y-87,44,4);}
    }
  }
}

export function drawFinish(scene:Phaser.Scene,course:Course){
  const theme=themeFor(course.number),end=course.platforms[course.platforms.length-1];
  if(course.number===3){
    const gate=scene.add.graphics();gate.fillStyle(0x984c39);gate.fillRect(course.finish-26,end.y-113,9,113);gate.fillRect(course.finish+26,end.y-113,9,113);gate.fillRoundedRect(course.finish-43,end.y-122,96,11,4);gate.fillRect(course.finish-31,end.y-93,70,7);
    scene.add.text(course.finish+4,end.y-81,'SU',{fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:'#f9e3b3'}).setOrigin(.5);
  }else{
    scene.add.rectangle(course.finish,end.y-55,5,110,0x52654c);
    scene.add.circle(course.finish,end.y-112,6,0xffdb85);
    const flag=scene.add.triangle(course.finish+27,end.y-91,0,0,48,15,0,30,theme.flag);
    scene.tweens.add({targets:flag,scaleY:.85,duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    scene.add.text(course.finish+10,end.y-103,'SU',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#fff'});
  }
}
