export const themes = [
  {name:'Mushroom Meadows',inspiration:'Mario-inspired',description:'Meadows, pipe caverns, and a fortress with patrolling mushroom minions.',collectible:'gold coins',power:'Fire shot',villain:'mushroom minion',sky:['#58b9ed','#bdeeff','#e6f7c2'],grass:0x65bd35,rock:0xa76137,coin:0xffd34d,hazard:0xb64534,flag:0xe85643},
  {name:'Skybound Planet',inspiration:'Dragon Ball Z-inspired',description:'Mountain valleys, Planet Namek, and a stormy battle arena.',collectible:'Dragon Balls',power:'Ki blast',villain:'alien raider',sky:['#25968c','#94debc','#dbedb4'],grass:0x62ac9b,rock:0xa66d69,coin:0xffae43,hazard:0xa465bd,flag:0xee9949},
  {name:'Hidden Leaf Trail',inspiration:'Naruto Shippuden-inspired',description:'Konoha, forest treetops, Hidden Sand, and Hidden Cloud.',collectible:'chakra scrolls',power:'Shuriken',villain:'rogue shinobi',sky:['#709eab','#d1debd','#efe2bd'],grass:0x729052,rock:0x837459,coin:0xf1bd72,hazard:0xa95645,flag:0xc76543},
] as const;
export function themeFor(level:number){return themes[level-1]||themes[0];}

export function worldArtwork(level:number){return '/jumpyland/world-'+level+(level===3?'-v2.png':'-v1.png');}
