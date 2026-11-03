import {countryByCode} from '../../../../../lib/world-explorer/catalog';
import {landmarkImage} from '../../../../../lib/world-explorer/media';

export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:{code:string}}){
 const country=countryByCode(params.code);
 if(!country)return Response.json({error:'Choose a country in the explorer catalogue.'},{status:404});
 return Response.json({countryCode:country.code,image:await landmarkImage(country.code),provider:'Wikimedia Commons'},{headers:{'Cache-Control':'public, max-age=3600'}});
}
