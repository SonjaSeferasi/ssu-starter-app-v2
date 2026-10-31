import {countries} from './catalog';
import {authoredLevels} from './authored-levels';
import {countryProfile} from './profiles';
import {eastAsiaPlaces,type NewEastAsiaCode} from './east-asia';
import evidence from '../../public/world-explorer/data/east-asia-evidence.json';
import specification from '../../public/world-explorer/data/asia-specification.json';
import {asiaRegions} from './asia-regions';
export {asiaRegions,asiaRegionFor,type AsiaRegionId} from './asia-regions';

export const asiaProductionStates=['PROPOSED','DESIGN APPROVED','BLOCKOUT','GAMEPLAY IMPLEMENTED','ART INTEGRATION','TESTING','RELEASED'] as const;
const eastGaps:Record<string,string[]>={
 CHN:['Requested tier 5; current route measures tier 4.','Add and test exposed-ledge wind before approving the new target design.'],
 JPN:['Requested beginner tier 1; preserved route measures tier 2.','Review lower-route steps without weakening the optional star route.'],
 MNG:['Requested tier 2; current route measures tier 1.','Add and test the wooden river platform in the next gameplay pass.'],
 PRK:['Requested tier 4; current route measures tier 3.','Replace steam timing with warned loose-rock and ridge-wind traversal for the revised brief.'],
 KOR:['Requested tier 3; current route measures tier 2.','Extend the optional rooftop garden and timed urban crossing for the revised brief.'],
};

/** A requested design is separate from the existing playable implementation.
 * Source/visual/human approval never follows automatically from a card, mesh,
 * test result or target difficulty. East Asia remains the active review gate. */
export function asiaProductionManifest(){
 return asiaRegions.flatMap(region=>region.codes.map(code=>{
  const country=countries.find(c=>c.code===code)!,target=specification.countries.find(c=>c.iso2===country.iso2)!;
  const east=eastAsiaPlaces[code as NewEastAsiaCode],profile=countryProfile(code),level=authoredLevels[code],implemented=!!level;
  const automated=evidence.records.find(record=>record.code===code),japan=code==='JPN'&&evidence.japanAudit.automatedPassed;
  const pairs=evidence.eastAsiaSimilarity.filter(pair=>pair.a===level?.id||pair.b===level?.id),isEast=region.id==='east';
  const actualTier=automated?.difficulty.measuredTier||(code==='JPN'?2:level?.difficultyTier as number|undefined);
  return{code,name:country.name,iso2:country.iso2,region:region.id,setting:target.location,levelTitle:target.title.split(' — ').slice(1).join(' — '),mainRoute:target.mainRoute,optionalRoute:target.optionalRoute,mainLayout:target.layout,signatureMechanic:target.signatureMechanic,visualEnvironment:target.environment,
   proposedTier:target.targetTier,targetDifficultyTier:target.targetTier,implementedDifficultyTier:actualTier??null,difficultyCalibrated:actualTier===target.targetTier,
   source:east?.source||(code==='JPN'?profile?.sourceUrl:'')||'',previousProfileSource:profile?.sourceUrl||'',sourceCheckedInBatch:!!east,geographicSourceStatus:east?'source-reviewed':'pending-individual-source-review',
   productionState:isEast?'ART INTEGRATION':'PROPOSED',designApprovalStatus:'pending',gameplayImplementationStatus:isEast?'existing-prototype':implemented?'legacy-template':'not-implemented',artCompletionStatus:isEast?'in-progress':'not-started',
   stages:{proposed:true,designed:isEast,implemented,tested:!!automated?.automatedPassed||!!japan,visuallyCompleted:false,released:false},humanReview:'pending' as const,visualReview:isEast?'changes-required':'not-run',humanPlaytest:'not-run' as const,humanCompletionSeconds:null,mobileDeviceTest:'not-run' as const,
   automatedStatus:automated?.automatedPassed||japan?'existing-route-passed':'not-run',maximumEastAsiaSimilarity:pairs.length?Math.max(...pairs.map(pair=>pair.score)):null,
   screenshots:isEast?['start','mechanic','landmark','overview'].map(view=>`documentation/world-explorer/review/asia/phase-a/${code.toLowerCase()}-${view}.png`):[],
   specificationGaps:eastGaps[code]||['Design the new specified setting, then validate geography, geometry, gameplay and all release gates.'],
   notes:isEast?'Active Phase A. Preserve the working route while art and revised mechanics are reviewed. Automated evidence describes the existing route, not approval of the new target specification.':'Regional proposal from the supplied specification. The next production batch is gated on East Asia review. An older template, where present, does not complete this new design.'};
 }));
}
