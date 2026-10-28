import {countryByCode} from '../../../../../lib/world-explorer/catalog';
import {fetchCountryFacts,fetchCountriesDevFacts} from '../../../../../lib/world-explorer/providers';

/** Public reference facts; account progress never travels through this route. */
export async function GET(_request:Request,{params}:{params:{code:string}}){
 const code=typeof params.code==='string'?params.code.toUpperCase():'';
 const country=/^[A-Z]{3}$/.test(code)?countryByCode(code):undefined;
 if(!country)return Response.json({error:'Choose one of the 193 UN member-state country levels.'},{status:404});
 let live:Awaited<ReturnType<typeof fetchCountryFacts>>=null;
 let countryApi:Awaited<ReturnType<typeof fetchCountriesDevFacts>>=null;
 // Independent services run concurrently; either outage preserves the bundled
 // country and the other provider. No upstream list expands our 193 members.
 const results=await Promise.allSettled([fetchCountryFacts(code),fetchCountriesDevFacts(code)]);
 if(results[0].status==='fulfilled')live=results[0].value;
 if(results[1].status==='fulfilled')countryApi=results[1].value;
 return Response.json({country,live,countryApi,source:live?'world-bank':'bundled',snapshotDate:'2026-10-27'},{headers:{'Cache-Control':'public, max-age=600, s-maxage=86400, stale-while-revalidate=86400'}});
}
