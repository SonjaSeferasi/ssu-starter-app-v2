import {countries} from './catalog';
import {authoredLevels} from './authored-levels';
import {countryProfile} from './profiles';
import {eastAsiaPlaces,type NewEastAsiaCode} from './east-asia';
import evidence from '../../public/world-explorer/data/east-asia-evidence.json';

import {asiaRegions} from './asia-regions';
export {asiaRegions,asiaRegionFor,type AsiaRegionId} from './asia-regions';

/** Country-specific proposals, not automatically generated finished levels.
 * Only East Asia is in the current implementation/review batch. Sources for
 * later batches must be checked against these proposed settings before build. */
const concepts:Record<string,[setting:string,main:string,optional:string,mechanic:string,tier:1|2|3|4|5]>={
 CHN:['Wulingyuan sandstone ravines','Climb spurs, time a lift and cross a crumbling ridge','Take two higher spires and rejoin the lower descent','lift-to-crumbling-ridge',4],
 JPN:['Mount Fuji spring mountain gardens','Cross the lower suspension bridge and garden ledges','Ascend the blossom-island star route','ascending-bonus-and-lower-bridge',2],
 MNG:['Orkhon Valley pasture and riverbanks','Follow long grassy banks and sheltered stream stones','Jump to a higher stream rock before rejoining pasture','gust-shelter-long-traverse',1],
 PRK:['Mount Paektu volcanic highlands','Time warned steam vents and climb basalt terraces toward a caldera','Visit a higher basalt ledge and rejoin the ash bench','warned-steam-and-caldera-descent',3],
 KOR:['Seoul rooftops and Namsan skyline','Climb service stairs, ride rooftop lifts and cross a moving skybridge','Ride the lower service hoist for a reward','rooftop-lifts-and-skybridge',2],
 BRN:['Ulu Temburong forest','Climb canopy walks over humid ravines','Follow a quieter fern-bank detour','canopy-sway-and-rain-shelter',2],
 KHM:['Angkor archaeological landscape','Traverse causeways and fictional water-gate courts','Explore a side reservoir platform loop','reservoir-pressure-routing',3],
 IDN:['Bromo volcanic landscape','Ascend ash slopes between warned steam vents','Cross a short crater-rim reward spur','steam-warning-and-crumbling-ash',4],
 LAO:['Luang Prabang peninsula','Traverse riverside stairs and shaded courtyard passages','Follow a lower river landing loop','riverboat-and-stair-alley',2],
 MYS:['Gunung Mulu karst forest','Descend forested limestone paths and cave ledges','Enter a short illuminated side cavern','cave-lift-and-return-loop',4],
 MMR:['Bagan archaeological plain','Cross dry-ground lanes and fictional raised garden walks','Follow a side courtyard discovery path','ground-switch-and-shade-timing',2],
 PHL:['Banaue rice-terrace landscape','Follow interconnected contour steps and irrigation crossings','Take a higher terrace trail','irrigation-sluice-and-terrace-height',3],
 SGP:['Singapore urban gardens','Link elevated garden decks and mechanical lifts','Climb an optional observation deck','alternating-urban-lifts',3],
 THA:['Southern limestone coast','Cross shore ledges and tide-timed landings','Reach a sheltered cave beach','wave-window-and-coastal-drop',2],
 TLS:['Atauro coastal hills','Follow dry coastal slopes and short lagoon crossings','Visit an elevated lookout trail','current-dock-and-hillside-stairs',1],
 VNM:['Ha Long Bay','Travel through limestone islets on moving boats','Follow a higher cave balcony','moored-boat-transfer',3],
 AFG:['Bamiyan valley landscape','Traverse earthen terraces and cliffside paths','Climb a side ridge with a view over the valley','terrace-climb-and-ledge-rest',4],
 BGD:['Sundarbans waterways','Link mangrove banks and floating river platforms','Enter a narrow side-channel loop','tide-current-and-sheltered-raft',3],
 BTN:['Paro valley mountain paths','Climb zigzag paths beside distant monastery architecture','Take a steep optional lookout spur','switchback-climb-and-rest-ledges',4],
 IND:['Taj Mahal gardens in Agra','Traverse formal garden terraces and fountains','Visit an ornamental terrace loop','garden-stone-platform-timing',3],
 IRN:['Yazd historic urban landscape','Travel through earthen lanes, courtyards and roof passages','Explore a wind-tower courtyard','courtyard-gate-and-roof-return',3],
 MDV:['Coral-island lagoon','Cross beaches and floating docks over shallow water','Take a short lagoon platform loop','current-carried-dock',1],
 NPL:['Sagarmatha Himalayan landscape','Ascend switchbacks and suspended mountain crossings','Follow a high ridge reward trail','altitude-lift-and-warned-gusts',5],
 PAK:['Mohenjo-daro archaeological landscape','Explore brick street and water-court inspired routes','Follow a side granary-height puzzle','brick-stair-and-water-level-switch',3],
 LKA:['Sigiriya landscape','Climb garden paths and rocky stair approaches','Visit a side water-garden detour','rock-stair-and-fountain-timing',4],
 KAZ:['Charyn Canyon','Descend banded canyon terraces then traverse the river bank','Cross a higher rim trail','canyon-drop-and-gust-shelter',3],
 KGZ:['Tian Shan mountain pasture','Ascend broad pasture slopes and stream crossings','Visit a high meadow spur','slope-momentum-and-stream-step',2],
 TJK:['Pamir mountain valley','Cross rocky mountain shelves and a warned gust corridor','Climb an exposed optional ridge','precision-shelf-and-gust-window',5],
 TKM:['Merv archaeological oasis','Move through earthen ramparts and oasis gardens','Visit a courtyard mechanism loop','oasis-gate-and-earthen-steps',2],
 UZB:['Samarkand architectural courts','Cross tiled courtyards and pointed-arch passages','Solve a side courtyard switch sequence','paired-courtyard-switches',3],
 ARM:['Geghard valley','Follow a rocky ravine and monastery-adjacent paths','Climb a side rock shelf','carved-cliff-and-return-climb',4],
 AZE:['Icherisheher in Baku','Traverse stone streets and a tower-side roof course','Follow a lower courtyard loop','spiral-stair-and-roof-lift',3],
 BHR:['Qalat al-Bahrain landscape','Cross low fort-side paths and palm-edged ground','Visit a shoreline discovery loop','low-rampart-and-shore-timing',1],
 CYP:['Troodos mountain villages','Traverse stone alleys and forest slopes','Climb a roof garden spur','village-stair-and-forest-crossing',2],
 GEO:['Mtskheta valley','Climb wooded river slopes and stone terraces','Take a lookout ridge alternate','river-terrace-and-ascent-rests',3],
 IRQ:['Babylon archaeological landscape','Traverse earthen courts and fictional brick gate mechanisms','Explore a lower courtyard path','gate-sequence-and-earthen-causeway',2],
 ISR:['Masada landscape','Ascend desert switchbacks toward distant plateau remains','Follow an exposed optional cliff shelf','cliff-lift-and-heat-shelter',4],
 JOR:['Petra sandstone canyons','Follow narrow sandstone paths and carved-facade views','Enter a side canyon reward loop','canyon-switch-and-sandstone-shelves',3],
 KWT:['Kuwait waterfront','Cross urban promenade decks and harbor platforms','Climb a side observation deck','harbor-hoist-and-promenade',2],
 LBN:['Byblos coastal archaeology','Link stone lanes, harbor walls and coastal terraces','Explore a small seaside court','harbor-step-and-timed-quay',2],
 OMN:['Jebel Akhdar mountain wadis','Cross stone ledges, terraces and water channels','Follow a higher wadi rim','water-switch-and-mountain-terrace',4],
 QAT:['Al Zubarah archaeological coast','Traverse low town-wall and shore routes','Visit an optional courtyard puzzle','shore-gate-and-low-ruin-walk',1],
 SAU:['Hegra sandstone tomb landscape','Follow fictional paths outside the protected facades','Visit a narrow side ravine','sandstone-canyon-and-crumbling-spur',3],
 SYR:['Bosra historic city','Traverse basalt lanes and arcade-inspired courts','Explore a side courtyard circuit','basalt-steps-and-arcade-gate',3],
 TUR:['Cappadocia rock landscape','Climb volcanic-tuff formations and cave passages','Follow a higher cave-room route','cave-loop-and-vertical-hoist',4],
 ARE:['Dubai urban skyline','Cross rooftops and staggered mechanical lifts','Take a higher observation-platform route','multi-lift-rooftop-relay',5],
 YEM:['Shibam urban landscape','Traverse earthen tower-house lanes and elevated crossings','Climb a side roof stair','earthen-rooftop-and-vertical-gate',4],
};

export function asiaProductionManifest(){
 return asiaRegions.flatMap(region=>region.codes.map(code=>{
  const country=countries.find(c=>c.code===code)!,concept=concepts[code],east=eastAsiaPlaces[code as NewEastAsiaCode],profile=countryProfile(code),implemented=!!authoredLevels[code];
  const automated=evidence.records.find(record=>record.code===code),japan=code==='JPN'&&evidence.japanAudit.automatedPassed;
  const pairs=evidence.eastAsiaSimilarity.filter(pair=>pair.a===authoredLevels[code]?.id||pair.b===authoredLevels[code]?.id);
  return{code,name:country.name,iso2:country.iso2,region:region.id,setting:concept[0],mainRoute:concept[1],optionalRoute:concept[2],signatureMechanic:concept[3],proposedTier:concept[4],source:east?.source||profile?.sourceUrl||'',sourceCheckedInBatch:!!east,
   stages:{proposed:true,designed:region.id==='east',implemented,tested:!!automated?.automatedPassed||!!japan,visuallyCompleted:false,released:false},humanReview:'pending' as const,
   visualReview:region.id==='east'?'prototype-needs-art-review':'not-run',humanPlaytest:'not-run' as const,humanCompletionSeconds:null,mobileDeviceTest:'not-run' as const,
   automatedStatus:automated?.automatedPassed||japan?'passed':'not-run',maximumEastAsiaSimilarity:pairs.length?Math.max(...pairs.map(pair=>pair.score)):null,
   screenshots:region.id==='east'?['gameplay','overview','mechanic'].map(view=>`documentation/world-explorer/review/asia/east-asia/${code.toLowerCase()}-${view}.png`):[],
   notes:region.id==='east'?'Current implementation and automated validation batch. Human visual, gameplay and device approval still required.':'Proposal only. Individually check sources, design coordinates and test the real route in its regional batch before implementation.'};
 }));
}
