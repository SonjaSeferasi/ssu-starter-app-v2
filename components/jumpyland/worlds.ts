export type WorldDefinition={id:string;name:string;description:string;themeLevel:number;levels:number[];x:number;y:number};
// Themes contain course IDs; new authored worlds can add their own level lists.
export const worlds:WorldDefinition[]=[
 {id:'mushroom',name:'Mushroom Meadows',description:'Explore the meadows. Find your finish.',themeLevel:1,levels:[1],x:23,y:59},
 {id:'dragon',name:'Skybound Planet',description:'Ride the sky islands. Discover your power.',themeLevel:2,levels:[2],x:50.5,y:30.5},
 {id:'shinobi',name:'Hidden Leaf Trail',description:'Cross the canopy. Reach the hidden village.',themeLevel:3,levels:[3],x:76,y:57},
];
