import {remainingNorthAmericaPlaces,type RemainingNorthAmericaCode} from './north-america-remaining';
import {westAsiaPlaces,type WestAsiaCode} from './west-asia';
import {africaPlaces,type AfricaCode} from './africa';
import {africaLevels} from './levels/africa';
import {northAmericaPlaces,type NorthAmericaCode} from './north-america';
import {countryProfile} from './profiles';
import {europePlaces,type EuropeCode} from './europe';
import {oceaniaPlaces,type OceaniaCode} from './oceania';
import {southAmericaEntry} from './south-america';
import verifiedPhotos from './verified-photos.json';

/** What a country guide shows as the destination: the place, its landscape,
 * and the Commons search and subject for its reference photograph. */
export type GuideDestination={place:string;landscape:string[];mediaSearch:string;photoSubject:string;photoAliases?:readonly string[];photoFile?:string;sourceUrl?:string;fromLevel:boolean};
type VerifiedPhoto={file:string;aliases:string[];why?:string;verified:string};
const pinned=verifiedPhotos.photos as Record<string,VerifiedPhoto>;

/** The playable South American levels describe their own destination, which
 * is often not the country's general profile (Chile's level is El Tatio, not
 * Rapa Nui; Ecuador's is a Galápagos coast, not Quito). Capital facts come from
 * the catalogue and are unaffected. `photoSubject` words must appear in the
 * Commons file title, so a photo of another place is never shown. */
const southAmericanGuides:Record<string,{landscape:string[];mediaSearch:string;photoSubject:string}>={
 BRA:{landscape:['Flooded várzea forest','Kapok trees and açaí palms','Amazon river channels'],mediaSearch:'Anavilhanas',photoSubject:'Anavilhanas'},
 BOL:{landscape:['Salt-flat crust','Salt mirror','Isla Incahuasi cacti'],mediaSearch:'Salar de Uyuni',photoSubject:'Salar Uyuni'},
 URY:{landscape:['Cobbled colonial quarter','Lighthouse and convent ruins','Río de la Plata waterfront'],mediaSearch:'Colonia del Sacramento lighthouse',photoSubject:'Colonia Sacramento'},
 PER:{landscape:['Inca terraces','Stone stairways','Cloud-forest ridges'],mediaSearch:'Machu Picchu',photoSubject:'Machu Picchu'},
 ARG:{landscape:['Glacier front on Lago Argentino','Lenga beech forest','Fitz Roy granite skyline'],mediaSearch:'Perito Moreno Glacier',photoSubject:'Perito Moreno'},
 CHL:{landscape:['High Andean geyser field','Sinter terraces and boiling pools','Volcanoes around the basin'],mediaSearch:'El Tatio geyser field',photoSubject:'Tatio'},
 COL:{landscape:['Quindío wax palms','Cloud-forest ridges','Pasture valley'],mediaSearch:'Valle de Cocora palmas de cera',photoSubject:'Valle Cocora'},
 ECU:{landscape:['Black lava shoreline','Tuff cones','Pacific surf and tide pools'],mediaSearch:'Galápagos pahoehoe lava flow',photoSubject:'Pahoehoe Galápagos'},
 GUY:{landscape:['Single-drop waterfall','Sandstone gorge','Giant tank bromeliads'],mediaSearch:'Kaieteur Falls',photoSubject:'Kaieteur Falls'},
 PRY:{landscape:['Red-earth countryside','Jesuit mission ruins','Flowering lapacho trees'],mediaSearch:'Santísima Trinidad de Paraná',photoSubject:'Trinidad Paraná'},
 SUR:{landscape:['Timber colonial waterfront','Suriname River','Fort Zeelandia'],mediaSearch:'Fort Zeelandia Paramaribo',photoSubject:'Paramaribo Zeelandia'},
 VEN:{landscape:['Tepui escarpment','Angel Falls','Cloud-filled valley'],mediaSearch:'Salto Ángel',photoSubject:'Salto Ángel'},
};

/** A verified photo (verified-photos.json) replaces the search: its file is
 * fetched by title and its aliases are the names its title must carry. */
export function guideDestination(code:string):GuideDestination|undefined{
 const destination=regionDestination(code),pin=pinned[code.toUpperCase()];
 return destination&&pin?{...destination,photoFile:pin.file,photoAliases:[...pin.aliases,...(destination.photoAliases??[destination.photoSubject])]}:destination;
}
function regionDestination(code:string):GuideDestination|undefined{
 const remaining=remainingNorthAmericaPlaces[code.toUpperCase() as RemainingNorthAmericaCode];
 if(remaining)return{place:remaining.landmark,landscape:remaining.features.map(f=>f.replace(/-/g,' ')),mediaSearch:remaining.landmark,photoSubject:remaining.landmark,photoAliases:code.toUpperCase()==='LCA'?['Gros Piton','Petit Piton','Pitons Saint Lucia']:code.toUpperCase()==='TTO'?['Caroni Swamp','Caroni Bird Sanctuary']:undefined,sourceUrl:remaining.source,fromLevel:true};
 const north=northAmericaPlaces[code.toUpperCase() as NorthAmericaCode];
 if(north)return{place:north.landmark,landscape:north.features.map(f=>f.replace(/-/g,' ')),mediaSearch:north.landmark,photoSubject:north.landmark,sourceUrl:north.source,fromLevel:true};
 const oceania=oceaniaPlaces[code.toUpperCase() as OceaniaCode];
 if(oceania)return{place:oceania.landmark,landscape:[...oceania.features],mediaSearch:oceania.mediaSearch,photoSubject:oceania.photoSubject,sourceUrl:oceania.source,fromLevel:true};
 const europe=europePlaces[code.toUpperCase() as EuropeCode];
 if(europe)return{place:europe.landmark,landscape:[...europe.features],mediaSearch:europe.mediaSearch,photoSubject:europe.photoSubject,sourceUrl:europe.source,fromLevel:true};
 const africa=africaPlaces[code.toUpperCase() as AfricaCode];
 if(africa&&africaLevels[code.toUpperCase() as AfricaCode])return{place:africa.landmark,landscape:[...africa.landscape],mediaSearch:africa.mediaSearch,photoSubject:africa.photoSubject,photoAliases:(africa as {photoAliases?:string[]}).photoAliases,sourceUrl:africa.source,fromLevel:true};
 const west=westAsiaPlaces[code.toUpperCase() as WestAsiaCode];
 if(west)return{place:west.landmark,landscape:[...west.features],mediaSearch:west.mediaSearch,photoSubject:west.photoSubject,sourceUrl:west.source,fromLevel:true};
 const entry=southAmericaEntry(code),guide=entry?southAmericanGuides[entry.code]:undefined;
 // A location that already begins with the landmark name is not repeated.
 if(entry?.levelBuilt&&guide)return{place:entry.locationName.startsWith(entry.featuredLandmark.name)?entry.locationName:`${entry.featuredLandmark.name} · ${entry.locationName}`,landscape:guide.landscape,mediaSearch:guide.mediaSearch,photoSubject:guide.photoSubject,fromLevel:true};
 const profile=countryProfile(code);
 return profile?{place:profile.landmarkName,landscape:profile.features,mediaSearch:profile.mediaSearch,photoSubject:profile.landmarkName,sourceUrl:profile.sourceUrl,fromLevel:false}:undefined;
}
