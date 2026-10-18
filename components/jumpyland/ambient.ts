import type * as Phaser from 'phaser';
import {Course,regionAt} from './levels';

// Cosmetic foreground/background layers share the gameplay clock: paused means
// no wind, particles, clouds, rain, or flashes advance. They have no physics bodies.
export function livingBackground(scene:Phaser.Scene,course:Course){
 let elapsed=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const wisps=Array.from({length:5},(_,i)=>scene.add.ellipse(i*245,70+(i%3)*130,190,22,0xffffff,.11).setScrollFactor(0).setDepth(-2));
 const motes=Array.from({length:24},(_,i)=>scene.add.ellipse((i*137)%960,(i*83)%540,7,3,0xc6d98b,.45).setScrollFactor(0).setDepth(2));
 const weather=scene.add.graphics().setScrollFactor(0).setDepth(2);
 return(delta:number,x:number)=>{
   if(reduced)return;
   elapsed+=Math.min(delta,80);
   const style=regionAt(course,x).style;
   const storm=style==='arena',embers=style==='castle',dust=style==='sand',glow=style==='namek'||style==='cavern';
   wisps.forEach((w,i)=>{w.x=((i*245+elapsed*(.004+i*.001))%1250)-150;w.y=70+(i%3)*130+Math.sin(elapsed/6000+i)*9;w.setAlpha(storm?.07:style==='cloud'?.23:.1);});
   motes.forEach((m,i)=>{
     const speed=embers?.016:storm?.13:dust?.028:.012;
     m.x=((i*137+elapsed*(speed+i*.0004))%1000)-20;
     m.y=embers?560-((i*83+elapsed*(.023+i*.0004))%600):((i*83+elapsed*(storm?.20:.009))%580)-20+Math.sin(elapsed/1500+i)*12;
     m.setFillStyle(embers?0xffbb65:dust?0xe2c894:glow?0xbef4e5:0xb8d192);
     m.setDisplaySize(glow?3:storm?2:7,glow?3:storm?12:3);
     m.setAlpha(glow?.3+Math.sin(elapsed/700+i)*.2:storm?.28:.4);
     m.rotation=storm?-.35:Math.sin(elapsed/1300+i)*.8;
   });
   weather.clear();
   if(storm){
     weather.lineStyle(1,0xc7e5ed,.18);
     for(let i=0;i<22;i++){const px=(i*91+elapsed*.06)%960,py=(i*67+elapsed*.21)%540;weather.lineBetween(px,py,px-7,py+18);}
     // Gentle storm illumination, with no full-screen high-intensity strobe.
     if(elapsed%8500<160){weather.fillStyle(0xcfe9f1,.07);weather.fillRect(0,0,960,540);}
   }
   scene.game.canvas.dataset.ambientTick=String(Math.floor(elapsed/100));
 };
}
