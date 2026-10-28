import snapshot from '../public/world-explorer/data/discoveries.json';
import {countryByCode} from './world-explorer/catalog';

export type Discovery={
 title:string;landmark:string;text:string;sourceUrl:string;
 challengeQuestion:string;answer:string;
 kind:'heritage'|'capital'|'showcase'|'expedition';shared?:boolean;
};

/** The descriptions below are original, short teaching notes checked against
 * the linked primary sources. They describe places, not national stereotypes. */
const showcases:Record<string,Discovery>={
 USA:{title:'A gift across the Atlantic',landmark:'Statue of Liberty',text:'The Statue of Liberty in New York Harbor was a gift from the people of France to the people of the United States. It was dedicated on October 28, 1886.',sourceUrl:'https://www.nps.gov/npnh/learn/news/fact-sheet-stli.htm',challengeQuestion:'Which country gave the Statue of Liberty to the United States?',answer:'France',kind:'showcase'},
 BRA:{title:'Forests shaped by rivers',landmark:'Central Amazon Conservation Complex',text:'Brazil\'s Central Amazon Conservation Complex protects a mosaic of forests, lakes and river channels. Some of its forests are seasonally flooded; other areas contain dryland forest.',sourceUrl:'https://whc.unesco.org/en/list/998/',challengeQuestion:'What happens seasonally to some forests in the Central Amazon?',answer:'They are flooded by rising water.',kind:'showcase'},
 FRA:{title:'Built for a world exhibition',landmark:'Eiffel Tower',text:'The Eiffel Tower was completed in Paris in 1889 for the World\'s Fair. Its iron structure became one of the city\'s best-known landmarks.',sourceUrl:'https://www.toureiffel.paris/en/news/history-and-culture/133-years-and-1083-feet',challengeQuestion:'In which year was the Eiffel Tower completed?',answer:'1889',kind:'showcase'},
 EGY:{title:'The pyramid fields of ancient Egypt',landmark:'Pyramids of Giza',text:'The Giza pyramids belong to the Memphis and its Necropolis World Heritage property, which includes pyramid fields from Giza to Dahshur. The Great Pyramid of Khufu is the surviving monument from the ancient Seven Wonders.',sourceUrl:'https://whc.unesco.org/en/list/86/',challengeQuestion:'Which ancient wonder survives at Giza?',answer:'The Great Pyramid of Khufu.',kind:'showcase'},
 JPN:{title:'A mountain that inspired artists',landmark:'Mount Fuji',text:'Mount Fuji is a 3,776-metre stratovolcano. UNESCO\'s Fujisan property includes sites connected with pilgrimage and artistic traditions, so its importance includes both its landscape and its cultural history.',sourceUrl:'https://whc.unesco.org/en/list/1418/',challengeQuestion:'What kind of mountain is Mount Fuji?',answer:'A stratovolcano.',kind:'showcase'},
 AUS:{title:'Architecture beside the harbour',landmark:'Sydney Opera House',text:'The Sydney Opera House is a performing arts centre beside Sydney Harbour. Its distinctive roof forms are part of the architectural achievement recognised when it entered the World Heritage List in 2007.',sourceUrl:'https://whc.unesco.org/en/list/166/',challengeQuestion:'In which year did the Sydney Opera House enter the World Heritage List?',answer:'2007',kind:'showcase'},
 ANTARCTICA:{title:'A continent for peace and science',landmark:'Antarctic research expedition',text:'Antarctica has no sovereign countries. The Antarctic Treaty system supports peaceful activity and scientific cooperation while setting aside the question of territorial claims. This expedition is separate from the 193-country passport.',sourceUrl:'https://www.dfat.gov.au/international-relations/antarctic-treaty-system',challengeQuestion:'What two purposes are central to the Antarctic Treaty system?',answer:'Peaceful activity and scientific research.',kind:'expedition'},
};

const discoveries=new Map<string,Discovery>(snapshot.records.map(row=>[row.code,{...row,kind:row.kind as Discovery['kind']}]));
export const discoverySnapshotDate=snapshot.reviewed;
export const discoveryAttribution='UNESCO World Heritage Centre via UNESCO Datahub (CC BY-SA 4.0); country reference metadata from Mohammed Le Doze and contributors (ODbL 1.0); government, tourism, monument-operator and scientific sources linked individually. Teaching notes are newly written factual summaries.';

export function discoveryFor(code:string):Discovery|undefined{
 const key=code.toUpperCase();
 if(showcases[key])return showcases[key];
 return countryByCode(key)?discoveries.get(key):undefined;
}
