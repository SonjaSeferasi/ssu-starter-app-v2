import {countries} from './catalog';
import {authoredLevels} from './authored-levels';
import {countryProfile} from './profiles';
import {eastAsiaPlaces,type NewEastAsiaCode} from './east-asia';
import evidence from '../../public/world-explorer/data/east-asia-evidence.json';
import specification from '../../public/world-explorer/data/asia-specification.json';
import {asiaRegions} from './asia-regions';
export {asiaRegions,asiaRegionFor,type AsiaRegionId} from './asia-regions';

export const asiaProductionStates=['PROPOSED','DESIGN APPROVED','BLOCKOUT','GAMEPLAY IMPLEMENTED','ART INTEGRATION','TESTING','RELEASED'] as const;
const eastGaps=['Human visual and gameplay approval remain pending.','Live account-save and physical-phone verification remain pending at the user’s request.'];

/** A requested design is separate from the existing playable implementation.
 * Source/visual/human approval never follows automatically from a card, mesh,
 * test result or target difficulty. East Asia remains the active review gate. */
export function asiaProductionManifest(){
 return asiaRegions.flatMap(region=>region.codes.map(code=>{
  const country=countries.find(c=>c.code===code)!,target=specification.countries.find(c=>c.iso2===country.iso2)!;
  const east=eastAsiaPlaces[code as NewEastAsiaCode],profile=countryProfile(code),level=authoredLevels[code],implemented=!!level;
  const automated=evidence.records.find(record=>record.code===code),japan=code==='JPN'&&evidence.japanAudit.automatedPassed;
  const pairs=evidence.eastAsiaSimilarity.filter(pair=>pair.a===level?.id||pair.b===level?.id),isEast=region.id==='east';
  const actualTier=automated?.difficulty.measuredTier||(code==='JPN'?evidence.japanAudit.difficulty.measuredTier:level?.difficultyTier as number|undefined);
  return{code,name:country.name,iso2:country.iso2,region:region.id,setting:target.location,levelTitle:target.title.split(' — ').slice(1).join(' — '),mainRoute:target.mainRoute,optionalRoute:target.optionalRoute,mainLayout:target.layout,signatureMechanic:target.signatureMechanic,visualEnvironment:target.environment,
   proposedTier:target.targetTier,targetDifficultyTier:target.targetTier,implementedDifficultyTier:actualTier??null,difficultyCalibrated:actualTier===target.targetTier,
   source:east?.source||(code==='JPN'?profile?.sourceUrl:'')||'',previousProfileSource:profile?.sourceUrl||'',sourceCheckedInBatch:!!east,geographicSourceStatus:east?'source-reviewed':'pending-individual-source-review',
   productionState:isEast?'TESTING':'PROPOSED',designApprovalStatus:'pending',gameplayImplementationStatus:isEast?'revised-mechanics-implemented':implemented?'legacy-template':'not-implemented',artCompletionStatus:isEast?'review-candidate':'not-started',
   stages:{proposed:true,designed:isEast,implemented,tested:!!automated?.automatedPassed||!!japan,visuallyCompleted:false,released:false},humanReview:'pending' as const,visualReview:isEast?'changes-required':'not-run',humanPlaytest:'not-run' as const,humanCompletionSeconds:null,mobileDeviceTest:'not-run' as const,
   automatedStatus:automated?.automatedPassed||japan?'revised-route-passed':'not-run',maximumEastAsiaSimilarity:pairs.length?Math.max(...pairs.map(pair=>pair.score)):null,
   screenshots:isEast?['start','mechanic','landmark','overview'].map(view=>`documentation/world-explorer/review/asia/phase-a-revision-2/${code.toLowerCase()}-${view}.png`):[],
   specificationGaps:isEast?eastGaps:['Design the new specified setting, then validate geography, geometry, gameplay and all release gates.'],
   notes:isEast?'Active Phase A review candidate. Revised routes measure at the requested tiers; automated evidence never substitutes for human approval.':'Regional proposal from the supplied specification. The next production batch is gated on East Asia review. An older template, where present, does not complete this new design.'};
 }));
}
