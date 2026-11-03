/** This batch refines four existing prototypes. TESTING is a review state,
 * not a release approval or a claim of human/device/account verification. */
export const melanesiaCodes=['FJI','PNG','SLB','VUT'] as const;
export type MelanesiaCode=typeof melanesiaCodes[number];
export const isMelanesiaCode=(code:string):code is MelanesiaCode=>(melanesiaCodes as readonly string[]).includes(code);
export const melanesiaReviewStatus='TESTING' as const;
export const melanesiaArt={
 FJI:{sky:'#71b2d5',horizon:'#e0e8d4',background:'#c1dcdf',sun:'#fff0c8',intensity:3,water:'#65bdbb',deep:'#327e96',top:'#91a96a',alt:'#b2ba8a',face:'#acb39e',dark:'#687e68',map:'coastal-rock',plants:true,material:'weatherboard-harbour'},
 PNG:{sky:'#789caa',horizon:'#c9d7cb',background:'#b7cdca',sun:'#e4ecda',intensity:2.2,water:'#809679',deep:'#4b6b55',top:'#68854b',alt:'#90a563',face:'#77735b',dark:'#3d5740',map:'mossy-rock',plants:true,material:'cultivated-highland-soil'},
 SLB:{sky:'#8ab2be',horizon:'#d6e1d4',background:'#bfd4d5',sun:'#eef0d6',intensity:2.5,water:'#6eaaa2',deep:'#396f70',top:'#7a995b',alt:'#a7b478',face:'#c1bea4',dark:'#737d68',map:'coastal-rock',plants:true,material:'raised-coral-limestone'},
 VUT:{sky:'#89a7c9',horizon:'#e6d7be',background:'#c9d3d2',sun:'#ffe4b4',intensity:2.8,water:'#5aadb9',deep:'#346d8d',top:'#83a16a',alt:'#aab98a',face:'#8b8f78',dark:'#506a58',map:'coastal-rock',plants:true,material:'coastal-volcanic-and-coral-rock'},
} as const;
