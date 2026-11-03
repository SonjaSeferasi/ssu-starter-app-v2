import React from 'react';
import {Snowflake} from 'lucide-react';
import {countries} from '../../lib/world-explorer/catalog';

const countryCodes = new Set(countries.map(country=>country.iso2));
export function countryFlagPath(iso2:string):string|null {
  const code=typeof iso2==='string'?iso2.toUpperCase():'';
  return countryCodes.has(code)?`/world-explorer/flags/${code.toLowerCase()}.svg`:null;
}

/** Local artwork works on Windows, which can display flag emoji as letters.
 * Antarctica receives a neutral expedition symbol, never a fictional flag. */
export function CountryFlag({iso2,name,size=32}:{iso2:string;name:string;size?:number}) {
  const width=Number.isFinite(size)?Math.max(12,Math.min(160,size)):32;
  const path=countryFlagPath(iso2);
  if(!path)return <span role="img" aria-label={name==='Antarctica'?'Antarctica expedition':`${name} destination`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width,height:width*.75,flexShrink:0}}><Snowflake size={width*.72} aria-hidden="true"/></span>;
  const note=iso2.toUpperCase()==='AF'?'Diplomatic tricolor used in this atlas; Afghanistan’s de facto authorities use a different flag.':undefined;
  return <img src={path} alt={`${name} flag`} title={note} width={width} height={iso2.toUpperCase()==='CH'?width:width*.75} loading="lazy" decoding="async" style={{display:'inline-block',objectFit:'contain',verticalAlign:'middle',flexShrink:0}}/>;
}
