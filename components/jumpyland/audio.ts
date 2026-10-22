export type GameSound='jump'|'coin'|'pickup'|'power'|'super'|'block'|'hit'|'transform'|'complete'|'fall'|'fire'|'rasengan'|'lightning'|'enemy'|'step'|'nimbus';

// Original synthesized music and effects; no franchise recordings or downloads.
// Audio starts only after a player gesture and shares the game's pause lifecycle.
export class GameAudio{
 private context:AudioContext;
 private master:GainNode;
 private voices=new Set<OscillatorNode|AudioBufferSourceNode>();
 private timer:ReturnType<typeof setInterval>|null=null;
 private enabled=true;private volume=.35;private playing=false;private paused=true;
 private theme=1;private beat=0;private next=0;
 constructor(){
  if(typeof AudioContext==='undefined')throw new Error('Sound is unavailable in this browser.');
  this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.12;this.master.connect(this.context.destination);
 }
 async unlock(){if(this.context.state==='suspended')await this.context.resume();}
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,value));this.master.gain.setTargetAtTime(this.enabled?this.volume*.35:0,this.context.currentTime,.03);}
 setEnabled(value:boolean){this.enabled=value;this.setVolume(this.volume);if(!value){this.stopTimer();this.stopVoices();void this.context.suspend().catch(()=>{});}else if(this.playing&&!this.paused)void this.resume();}
 private tone(frequency:number,start:number,length:number,volume:number,type:OscillatorType='sine',slide?:number){
  if(!this.enabled||this.volume===0)return;
  const oscillator=this.context.createOscillator(),gain=this.context.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);
  if(slide)oscillator.frequency.exponentialRampToValueAtTime(Math.max(25,slide),start+length);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+length);
  oscillator.connect(gain);gain.connect(this.master);this.voices.add(oscillator);
  oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
  oscillator.start(start);oscillator.stop(start+length+.03);
 }
 private noise(start:number,length:number,volume:number,cutoff=1500){
  if(!this.enabled||this.volume===0)return;
  const source=this.context.createBufferSource(),buffer=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*length),this.context.sampleRate),data=buffer.getChannelData(0);
  let previous=0;for(let i=0;i<data.length;i++){const seed=Math.sin(i*12.9898+this.beat)*43758.5453;previous=(previous+(seed-Math.floor(seed)-.5)*.35)/1.03;data[i]=previous*3;}
  source.buffer=buffer;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=cutoff;const gain=this.context.createGain();gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+length);source.connect(filter);filter.connect(gain);gain.connect(this.master);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(start);source.stop(start+length+.02);
 }
 private schedule=()=>{
  if(!this.enabled||!this.playing||this.paused||this.context.state!=='running')return;
  const melodies=[
   [261.63,329.63,392,440,349.23,329.63,293.66,392,329.63,261.63,349.23,440,392,293.66,329.63,196],
   [164.81,246.94,329.63,493.88,369.99,246.94,293.66,440,164.81,329.63,392,293.66,246.94,369.99,329.63,220],
   [293.66,349.23,392,440,523.25,440,392,349.23,293.66,392,440,587.33,523.25,392,349.23,220],
  ];
  let scheduled=0;
  while(this.next<this.context.currentTime+.22&&scheduled++<4){
   const frequency=melodies[this.theme-1][this.beat%16];
   if(this.theme===1){this.tone(frequency,this.next,.16,.045,'triangle');if(this.beat%2===0)this.tone(frequency/2,this.next,.1,.027,'sine');}
   else if(this.theme===2){this.tone(frequency,this.next,.34,.035,'sine');if(this.beat%4===0){this.tone(frequency/2,this.next,.46,.045,'triangle');this.tone(frequency*1.5,this.next,.4,.016,'sine');}}
   else {if(this.beat%4!==3)this.tone(frequency,this.next,.25,.035,'sine');if(this.beat%4===0)this.tone(100,this.next,.11,.04,'triangle',45);}
   // World-specific rhythm and atmosphere, using original patterns.
   if(this.theme===1&&this.beat%2===1){this.tone(frequency*2,this.next+.06,.08,.014,'square');this.noise(this.next,.045,.014,2100);}
   if(this.theme===2){if(this.beat%4===0)this.tone(85,this.next,.2,.085,'sine',35);if(this.beat%4===2)this.noise(this.next,.12,.045,1800);if(this.beat%2===1)this.noise(this.next,.045,.018,3500);}
   if(this.theme===3){if(this.beat%4===2){this.tone(170,this.next,.07,.035,'triangle',90);this.noise(this.next,.07,.02,850);}if(this.beat%8===0){this.noise(this.next,1.1,.012,600);this.tone(frequency*2,this.next+.04,.37,.012,'sine');}}
   this.beat++;this.next+=this.theme===1?.23:this.theme===2?.31:.29;
  }
 };
 play(theme:number){this.stopTimer();this.stopVoices();this.theme=Math.max(1,Math.min(3,theme));this.playing=true;this.paused=false;this.beat=0;void this.resume();}
 async resume(){this.paused=false;if(!this.enabled||!this.playing)return;try{await this.unlock();if(this.paused||!this.enabled)return;this.next=this.context.currentTime+.035;this.stopTimer();this.schedule();this.timer=setInterval(this.schedule,100);}catch{/* The player can enable sound again from its control. */}}
 pause(){this.paused=true;this.stopTimer();void this.context.suspend().catch(()=>{});}
 private stopTimer(){if(this.timer){clearInterval(this.timer);this.timer=null;}}
 private stopVoices(){for(const voice of this.voices){try{voice.stop();}catch{/* Already ended. */}}this.voices.clear();}
 effect(sound:GameSound){
  if(!this.enabled||this.paused||this.context.state!=='running')return;
  const t=this.context.currentTime;
  if(sound==='step'){this.noise(t,.055,this.theme===3?.026:.017,this.theme===3?1200:650);return;}
  if(sound==='fire'){this.noise(t,.3,.13,1500);this.tone(360,t,.2,.07,'triangle',70);return;}
  if(sound==='rasengan'){this.noise(t,.65,.1,2300);[420,630,840].forEach((f,i)=>this.tone(f,t+i*.035,.45,.05,'sine',f*1.4));return;}
  if(sound==='lightning'){for(let i=0;i<4;i++){this.noise(t+i*.055,.07,.13,4200);this.tone(1500+i*270,t+i*.04,.09,.035,'sawtooth',350);}return;}
  if(sound==='nimbus'){this.noise(t,.7,.04,900);[440,660,880].forEach((f,i)=>this.tone(f,t+i*.11,.35,.06));return;}
  if(sound==='enemy'){this.tone(this.theme===1?190:this.theme===2?95:1250,t,.15,.045,this.theme===3?'triangle':'sawtooth',this.theme===3?500:55);return;}
  if(sound==='jump')this.tone(this.theme===3?340:210,t,.17,.12,'triangle',this.theme===2?680:460);
  else if(sound==='coin'){this.tone(this.theme===1?880:this.theme===2?660:1046.5,t,.12,.11,'sine');this.tone(this.theme===1?1318.5:this.theme===2?990:1568,t+.07,.18,.085,'sine');}
  else if(sound==='power'||sound==='super')this.tone(sound==='super'?90:this.theme===2?140:this.theme===3?760:330,t,sound==='super'?.6:.22,.13,this.theme===2?'sawtooth':'triangle',sound==='super'?900:this.theme===3?160:65);
  else if(sound==='block'){this.tone(640,t,.24,.1,'sine',260);this.tone(960,t,.18,.05);}
  else if(sound==='hit'||sound==='fall')this.tone(sound==='hit'?160:290,t,.32,.1,'triangle',55);
  else if(sound==='complete'){[0,4,7,12].forEach((step,i)=>this.tone(261.63*2**(step/12),t+i*.13,.35,.1,'triangle'));}
  else if(sound==='transform'){this.noise(t,1.1,.16,1800);this.tone(55,t,1,.12,'sawtooth',220);[110,220,440,880].forEach((f,i)=>this.tone(f,t+i*.1,.6,.07,'sine',f*1.25));}
  else {[523.25,659.25,783.99].forEach((f,i)=>this.tone(f,t+i*.06,.22,.07,'sine'));}
 }
 end(sound:GameSound){this.stopTimer();this.stopVoices();this.paused=false;this.effect(sound);this.playing=false;}
 destroy(){this.stopTimer();this.stopVoices();void this.context.close().catch(()=>{});}
}
