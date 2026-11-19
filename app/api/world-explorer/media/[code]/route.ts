import {countryByCode} from '../../../../../lib/world-explorer/catalog';
import {landmarkImage} from '../../../../../lib/world-explorer/media';

export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{code:string}>}){
 // Next 16 hands params to the handler as a promise; reading it directly yields undefined.
 const {code}=await params;
 const country=countryByCode(code);
 if(!country)return Response.json({error:'Choose a country in the explorer catalogue.'},{status:404});
 const image=await landmarkImage(country.code);
 // A missing photo may be a busy Commons: let the browser ask again soon.
 return Response.json({countryCode:country.code,image,provider:'Wikimedia Commons'},{headers:{'Cache-Control':image?'public, max-age=3600':'public, max-age=120'}});
}
