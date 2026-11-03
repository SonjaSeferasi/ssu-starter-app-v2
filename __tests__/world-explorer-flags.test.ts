import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {countries} from '../lib/world-explorer/catalog';
import {countryFlagPath,CountryFlag} from '../components/world-explorer/country-flag';
import flagManifest from '../public/world-explorer/flags/manifest.json';

const flagDirectory=resolve(__dirname,'../public/world-explorer/flags');
describe('Local country flag collection',()=>{
  it('has one self-contained SVG for every member and retains the MIT notice',()=>{
    expect(readdirSync(flagDirectory).filter(file=>file.endsWith('.svg'))).toHaveLength(193);
    expect(flagManifest.flags.map(flag=>flag.iso2).sort()).toEqual(countries.map(country=>country.iso2).sort());
    for(const country of countries){
      const svg=readFileSync(resolve(flagDirectory,country.iso2.toLowerCase()+'.svg'),'utf8');
      const record=flagManifest.flags.find(flag=>flag.iso2===country.iso2)!;
      expect(record.code).toBe(country.code);
      expect(record.source).toBe(`https://raw.githubusercontent.com/lipis/flag-icons/${flagManifest.release}/flags/${country.iso2==='CH'?'1x1':'4x3'}/${country.iso2.toLowerCase()}.svg`);
      expect(createHash('sha256').update(svg).digest('hex')).toBe(record.sha256);
      const visibleFlag=CountryFlag({iso2:country.iso2,name:country.name,size:40});
      expect(visibleFlag.props.src).toBe(`/world-explorer/flags/${country.iso2.toLowerCase()}.svg`);
      expect(visibleFlag.props.alt).toBe(country.name+' flag');
      expect(svg).toContain('<svg');expect(svg).toMatch(/<\/svg>\s*$/);
      expect(svg).not.toMatch(/<(?:script|foreignObject|image|iframe|object|embed)\b|<!DOCTYPE|<!ENTITY|\bon\w+\s*=/i);
      for(const match of svg.matchAll(/(?:\b(?:xlink:)?href\s*=\s*['"]([^'"]*)['"]|\burl\(\s*['"]?([^)'"\s]+))/gi))expect((match[1]||match[2]).startsWith('#')).toBe(true);
    }
    expect(readFileSync(resolve(flagDirectory,'LICENSE.txt'),'utf8')).toContain('Panayiotis Lipiridis');
  });
  it('uses local allowlisted paths and a neutral symbol for Antarctica',()=>{
    expect(countryFlagPath('JP')).toBe('/world-explorer/flags/jp.svg');
    expect(countryFlagPath('us')).toBe('/world-explorer/flags/us.svg');
    expect(countryFlagPath('../us')).toBeNull();expect(countryFlagPath('AQ')).toBeNull();expect(countryFlagPath('VA')).toBeNull();
    const flag=CountryFlag({iso2:'JP',name:'Japan',size:48});expect(flag.type).toBe('img');expect(flag.props.src).toBe('/world-explorer/flags/jp.svg');expect(flag.props.alt).toBe('Japan flag');
    const expedition=CountryFlag({iso2:'',name:'Antarctica'});expect(expedition.type).toBe('span');expect(expedition.props['aria-label']).toBe('Antarctica expedition');
    expect(CountryFlag({iso2:'CH',name:'Switzerland',size:40}).props.height).toBe(40);
    expect(CountryFlag({iso2:'AF',name:'Afghanistan'}).props.title).toContain('Diplomatic tricolor');
    const syria=readFileSync(resolve(flagDirectory,'sy.svg'),'utf8');
    expect(syria).toContain('#007a3d');expect(syria).toContain('#ce1126');
    expect(syria).toMatch(/m101 300.*M461 300.*M281 300/);
  });
});

afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
describe('countries.dev optional integration',()=>{
  it('requires matching ISO identifiers, ignores unversioned population and caches facts',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({alpha2Code:'JP',alpha3Code:'JPN',capital:'Tokyo',languages:[{name:'Japanese'}],population:123456789,flags:{svg:'https://untrusted.example/flag.svg'}})));
    vi.stubGlobal('fetch',fetcher);const{fetchCountriesDevFacts}=await import('../lib/world-explorer/providers');
    const facts=await fetchCountriesDevFacts('jpn');expect(facts).toMatchObject({code:'JPN',capital:'Tokyo',languages:['Japanese'],flagPath:'/world-explorer/flags/jp.svg',provider:'countries.dev'});
    expect(facts).not.toHaveProperty('population');expect(facts).not.toHaveProperty('currencies');
    await fetchCountriesDevFacts('JPN');expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).toBe('https://countries.dev/alpha/JP');
  });
  it('falls back on unknown members, mismatched identities, malformed responses and network failures',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({alpha2Code:'US',alpha3Code:'USA',capital:'Washington'}))).mockResolvedValueOnce(new Response('[]')).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch',fetcher);const{fetchCountriesDevFacts}=await import('../lib/world-explorer/providers');
    expect(await fetchCountriesDevFacts('PSE')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
    expect(await fetchCountriesDevFacts('JPN')).toBeNull();expect(await fetchCountriesDevFacts('JPN')).toBeNull();expect(await fetchCountriesDevFacts('JPN')).toBeNull();expect(countries).toHaveLength(193);
  });
});
