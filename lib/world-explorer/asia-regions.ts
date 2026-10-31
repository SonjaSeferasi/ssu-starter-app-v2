export const asiaRegions=[
 {id:'east',name:'East Asia',codes:['CHN','JPN','MNG','PRK','KOR']},
 {id:'southeast',name:'Southeast Asia',codes:['BRN','KHM','IDN','LAO','MYS','MMR','PHL','SGP','THA','TLS','VNM']},
 {id:'south',name:'South Asia',codes:['AFG','BGD','BTN','IND','IRN','MDV','NPL','PAK','LKA']},
 {id:'central',name:'Central Asia',codes:['KAZ','KGZ','TJK','TKM','UZB']},
 {id:'west',name:'West Asia',codes:['ARM','AZE','BHR','CYP','GEO','IRQ','ISR','JOR','KWT','LBN','OMN','QAT','SAU','SYR','TUR','ARE','YEM']},
] as const;
export type AsiaRegionId=typeof asiaRegions[number]['id'];
export function asiaRegionFor(code:string){return asiaRegions.find(region=>(region.codes as readonly string[]).includes(code));}
