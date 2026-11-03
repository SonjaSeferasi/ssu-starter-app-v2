/** Separate developer art-review proposals, not human acceptance results. */
export const southAsiaArtPass=[
 {id:'SA-ART-01',countries:['AFG'],focus:'Band-e Amir basins and mineral shores',acceptance:'Refine irregular lake shorelines, travertine barriers and eroded platform connections; preserve the tested descent and bridge.'},
 {id:'SA-ART-02',countries:['BGD'],focus:'Mangrove roots and tidal banks',acceptance:'Vary root branching and canopy shapes, refine mud/water contact and observation-station detail. Keep the corrected station grounding and route heights.'},
 {id:'SA-ART-03',countries:['BTN'],focus:'Paro cliff and monastery study',acceptance:'Improve cliff relief, forest depth and architectural detailing, keeping the sacred landmark separate from colliders.'},
 {id:'SA-ART-04',countries:['IND'],focus:'Agra garden paving and transitions',acceptance:'Reduce the blocky tiled-ground appearance and refine garden edges, pavilion presentation and water transitions while retaining the existing Taj Mahal art.'},
 {id:'SA-ART-05',countries:['IRN'],focus:'Yazd facades and windcatchers',acceptance:'Vary courtyard facades, roof silhouettes and windcatcher louvers without moving rooftop caps, the lift or the airflow zone.'},
 {id:'SA-ART-06',countries:['MDV'],focus:'Lagoon shores, reef and dock presentation',acceptance:'Refine beach outlines, coral forms and the water contact of docks while preserving low elevations and gentle platform motion.'},
 {id:'SA-ART-07',countries:['NPL'],focus:'Khumbu snow, rock and trail detail',acceptance:'Refine mountain profiles, snow/rock transitions and suspended-trail dressing. Preserve grounded moraine/hut supports and climb headroom.'},
 {id:'SA-ART-08',countries:['PAK'],focus:'Passu skyline and riverbanks',acceptance:'Refine irregular spires, glacial riverbanks and terraced settlement detail without altering the long crossing or moving-rock mechanism.'},
 {id:'SA-ART-09',countries:['LKA'],focus:'Sigiriya rock and water-garden detail',acceptance:'Add more convincing rock-face relief, summit detail and garden tank edges while preserving the archaeological landmark and sluice puzzle.'},
].map(task=>({...task,status:'IMPLEMENTED_REVIEW_PENDING' as const,collisionChangesAllowed:false,released:false}));
