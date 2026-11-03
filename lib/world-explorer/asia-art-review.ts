/** Planned art work, separate from gameplay implementation or acceptance.
 * Revalidate the immutable collision caps before and after every art pass. */
export const southeastAsiaArtPass=[
 {id:'SEA-ART-01',countries:['BRN','KHM','IDN','LAO','MYS','MMR','PHL','SGP','THA','TLS','VNM'],focus:'Repeated platform bodies',acceptance:'Vary the silhouette, stratification and connection to the scenery by setting. Preserve every walking cap, landing edge, collider and mechanic; compare side-by-side captures.'},
 {id:'SEA-ART-02',countries:['LAO'],focus:'Kuang Si pools',acceptance:'Replace rectangular pool presentation with convincing terraced limestone basins and clear water lips. Keep the lift, bridge and all collision surfaces unchanged.'},
 {id:'SEA-ART-03',countries:['PHL'],focus:'Ifugao terraces',acceptance:'Make the curved retaining walls, irrigation and planted paddies read as contour-following terraces with believable ground transitions. Do not alter route elevations or the sluice puzzle.'},
 {id:'SEA-ART-04',countries:['KHM'],focus:'Angkor temple forms',acceptance:'Refine lotus-tower silhouettes, galleries, stone detail and forest sightlines using the linked heritage source. Sacred landmarks remain non-destructible background scenery.'},
 {id:'SEA-ART-05',countries:['MMR'],focus:'Bagan temple forms',acceptance:'Differentiate brick temple, stupa and spire forms; improve their presence in the river-plain composition. Keep the fictional market lift and gallery gate separate from sacred buildings.'},
 {id:'SEA-ART-06',countries:['VNM'],focus:'Ha Long cave opening',acceptance:'Replace the rectangular-looking cave facade with an organic limestone opening, darker interior and a readable climb exit. Preserve the collision volume, headroom and optional return path.'},
].map(task=>({...task,status:'IMPLEMENTED_REVIEW_PENDING' as const,collisionChangesAllowed:false,released:false}));
