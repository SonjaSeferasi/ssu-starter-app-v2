import westEvidence from '../../public/world-explorer/data/west-asia-evidence.json';
import {westAsiaPlaces,type WestAsiaCode} from './west-asia';
import {countries} from './catalog';
import {authoredLevels} from './authored-levels';
import {countryProfile} from './profiles';
import {eastAsiaPlaces,type NewEastAsiaCode} from './east-asia';
import evidence from '../../public/world-explorer/data/east-asia-evidence.json';
import centralEvidence from '../../public/world-explorer/data/central-asia-evidence.json';
import {centralAsiaPlaces,type CentralAsiaCode} from './central-asia';
import {southAsiaArtPass} from './south-asia-art-review';
import southEvidence from '../../public/world-explorer/data/south-asia-evidence.json';
import {southAsiaPlaces,type SouthAsiaCode} from './south-asia';
import {southeastAsiaArtPass} from './asia-art-review';
import southeastEvidence from '../../public/world-explorer/data/southeast-asia-evidence.json';
import {southeastAsiaPlaces,type SoutheastAsiaCode} from './southeast-asia';
import specification from '../../public/world-explorer/data/asia-specification.json';
import {asiaRegions} from './asia-regions';
export {asiaRegions,asiaRegionFor,type AsiaRegionId} from './asia-regions';

export const asiaProductionStates=['PROPOSED','DESIGN APPROVED','BLOCKOUT','GAMEPLAY IMPLEMENTED','ART INTEGRATION','TESTING','RELEASED'] as const;
const eastGaps=['Human visual and gameplay approval remain pending.','Live account-save and physical-phone verification remain pending at the user’s request.'];

/** A requested design is separate from the existing playable implementation.
 * Source/visual/human approval never follows automatically from a card, mesh,
 * test result or target difficulty. Regional prototypes never imply release. */
export function asiaProductionManifest(){
 return asiaRegions.flatMap(region=>region.codes.map(code=>{
  const country=countries.find(c=>c.code===code)!,target=specification.countries.find(c=>c.iso2===country.iso2)!;
  const east=eastAsiaPlaces[code as NewEastAsiaCode],southeast=southeastAsiaPlaces[code as SoutheastAsiaCode],south=southAsiaPlaces[code as SouthAsiaCode],central=centralAsiaPlaces[code as CentralAsiaCode],west=westAsiaPlaces[code as WestAsiaCode],profile=countryProfile(code),level=authoredLevels[code],implemented=!!level;
  const automated=evidence.records.find(record=>record.code===code),seaEvidence=southeastEvidence.records.find(record=>record.code===code),southRecord=southEvidence.records.find(record=>record.code===code),centralRecord=centralEvidence.records.find(record=>record.code===code),westRecord=westEvidence.records.find(record=>record.code===code),japan=code==='JPN'&&evidence.japanAudit.automatedPassed;
  const pairs=evidence.eastAsiaSimilarity.filter(pair=>pair.a===level?.id||pair.b===level?.id),isEast=region.id==='east';
  const actualTier=automated?.difficulty.measuredTier||seaEvidence?.difficulty.measuredTier||southRecord?.difficulty.measuredTier||centralRecord?.difficulty.measuredTier||westRecord?.difficulty.measuredTier||(code==='JPN'?evidence.japanAudit.difficulty.measuredTier:level?.difficultyTier as number|undefined),inBatch=isEast||!!southeast||!!south||!!central||!!west;
  return{code,name:country.name,iso2:country.iso2,region:region.id,setting:target.location,levelTitle:target.title.split(' — ').slice(1).join(' — '),mainRoute:target.mainRoute,optionalRoute:target.optionalRoute,mainLayout:target.layout,signatureMechanic:target.signatureMechanic,visualEnvironment:target.environment,
   proposedTier:target.targetTier,targetDifficultyTier:target.targetTier,implementedDifficultyTier:actualTier??null,difficultyCalibrated:actualTier===target.targetTier,
   source:east?.source||southeast?.source||south?.source||central?.source||west?.source||(code==='JPN'?profile?.sourceUrl:'')||'',previousProfileSource:profile?.sourceUrl||'',sourceCheckedInBatch:!!east||!!southeast||!!south||!!central||!!west,geographicSourceStatus:east||southeast||south||central||west?'source-reviewed':'pending-individual-source-review',
   productionState:inBatch?'TESTING':'PROPOSED',designApprovalStatus:'pending',gameplayImplementationStatus:isEast?'revised-mechanics-implemented':southeast||south||central||west?'regional-mechanics-implemented':implemented?'legacy-template':'not-implemented',artCompletionStatus:southeast?'focused-pass-planned':south?'visual-refinements-planned':inBatch?'review-candidate':'not-started',artReviewTasks:[...southeastAsiaArtPass,...southAsiaArtPass].filter(task=>task.countries.includes(code)).map(task=>task.id),
   stages:{proposed:true,designed:inBatch,implemented,tested:!!automated?.automatedPassed||!!japan||!!seaEvidence?.automatedPassed||!!southRecord?.automatedPassed||!!centralRecord?.automatedPassed||!!westRecord?.automatedPassed,visuallyCompleted:false,released:false},humanReview:'pending' as const,visualReview:isEast?'changes-required':southeast||south||central||west?'review-candidate':'not-run',humanPlaytest:'not-run' as const,humanCompletionSeconds:null,mobileDeviceTest:'not-run' as const,
   automatedStatus:automated?.automatedPassed||japan?'revised-route-passed':seaEvidence?.automatedPassed||southRecord?.automatedPassed||centralRecord?.automatedPassed||westRecord?.automatedPassed?'regional-route-passed':'not-run',maximumEastAsiaSimilarity:pairs.length?Math.max(...pairs.map(pair=>pair.score)):null,
   screenshots:inBatch?['start','mechanic','landmark','overview'].map(view=>`documentation/world-explorer/review/asia/${isEast?'phase-a-revision-2':west?'west-asia':central?'central-asia':south?'south-asia':'southeast-asia'}/${code.toLowerCase()}-${view}.png`):[],
   specificationGaps:inBatch?[...eastGaps,'60 FPS remains unverified until measured in a confirmed 60+ Hz browser environment.']:['Design the new specified setting, then validate geography, geometry, gameplay and all release gates.'],
   notes:isEast?'Frozen Phase A testing candidate: commit 1c7ed65 / revision 2. Human playtests remain queued, starting with Japan beginner.':west?'West Asia TESTING prototype; all acceptance gates remain pending.':central?'Central Asia testing candidate; return this batch before West Asia development.':south?'South Asia TESTING candidate preserved; remaining visual refinements are tracked separately.':southeast?'Southeast Asia candidate preserved; focused art tasks are planned separately and must not change collisions or mechanics.':'Regional proposal from the supplied specification. An older template, where present, does not complete this new design.'};
 }));
}
