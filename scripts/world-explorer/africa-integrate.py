"""Wire the Africa levels into shared files. Idempotent; anchors on stable lines.
Usage: python3 scripts/world-explorer/africa-integrate.py <repo-root>"""
import sys,re,pathlib
root=pathlib.Path(sys.argv[1]);ok=True
def patch(rel,pairs):
    global ok
    p=root/rel;raw=p.read_bytes().decode('utf-8');crlf='\r\n' in raw;s=raw.replace('\r\n','\n');orig=s
    for marker,anchor,new in pairs:
        if marker in s: continue
        if anchor not in s: print('ANCHOR MISSING',rel,anchor[:60]);ok=False;continue
        s=s.replace(anchor,new,1)
    if s!=orig: p.write_bytes((s.replace('\n','\r\n') if crlf else s).encode('utf-8'));print('patched',rel)
    else: print('unchanged',rel)
patch('lib/world-explorer/authored-levels.ts',[
 ("levels/africa'","import {centralAsiaLevels} from './levels/central-asia';","import {centralAsiaLevels} from './levels/central-asia';\nimport {africaLevels} from './levels/africa';"),
 ("...africaLevels"," ...westAsiaLevels,\n"," ...westAsiaLevels,\n ...africaLevels as Record<string,{id:string;countryId:string;title:string}&Record<string,unknown>>,\n"),
])
patch('lib/world-explorer/profiles.ts',[
 ("africaPlaces","import {westAsiaPlaces,type WestAsiaCode} from './west-asia';","import {westAsiaPlaces,type WestAsiaCode} from './west-asia';\nimport {africaPlaces,type AfricaCode} from './africa';\nimport {africaLevels} from './levels/africa';"),
 ("const africa=africaPlaces"," const southeast=southeastAsiaPlaces[key as SoutheastAsiaCode];"," const africa=africaPlaces[key as AfricaCode];\n if(base&&africa&&africaLevels[key as AfricaCode])return{...base,levelTitle:africa.title,landmarkName:africa.landmark,landmarkKind:africa.kind,sourceUrl:africa.source,mediaSearch:africa.mediaSearch,referenceFile:undefined,features:base.features,biome:africa.biome};\n const southeast=southeastAsiaPlaces[key as SoutheastAsiaCode];"),
])
# Built Africa levels keep the profile's own sourced features (at most three).
patch('lib/world-explorer/profiles.ts',[
 ("features:base.features","features:[...africa.landscape],biome:africa.biome};","features:base.features,biome:africa.biome};"),
])
# Kenya is now built, so the tier-lock test needs a country that is still under development.
patch('__tests__/world-explorer-level-design.test.ts',[
 ("cardStatus('NRU',new Set())).toBe('under-development')","expect(cardStatus('KEN',new Set())).toBe('under-development');","expect(cardStatus('NRU',new Set())).toBe('under-development');"),
])
patch('lib/world-explorer/guide-destination.ts',[
 ("africaPlaces","import {westAsiaPlaces,type WestAsiaCode} from './west-asia';","import {westAsiaPlaces,type WestAsiaCode} from './west-asia';\nimport {africaPlaces,type AfricaCode} from './africa';\nimport {africaLevels} from './levels/africa';"),
 ("const africa=africaPlaces"," const west=westAsiaPlaces[code.toUpperCase() as WestAsiaCode];"," const africa=africaPlaces[code.toUpperCase() as AfricaCode];\n if(africa&&africaLevels[code.toUpperCase() as AfricaCode])return{place:africa.landmark,landscape:[...africa.landscape],mediaSearch:africa.mediaSearch,photoSubject:africa.photoSubject,sourceUrl:africa.source,fromLevel:true};\n const west=westAsiaPlaces[code.toUpperCase() as WestAsiaCode];"),
])
patch('lib/world-explorer-discoveries.ts',[
 ("africaPlaces","import {westAsiaPlaces,type WestAsiaCode} from './world-explorer/west-asia';","import {westAsiaPlaces,type WestAsiaCode} from './world-explorer/west-asia';\nimport {africaPlaces,type AfricaCode} from './world-explorer/africa';\nimport {africaLevels} from './world-explorer/levels/africa';"),
 ("const africa=africaPlaces"," const east=eastAsiaPlaces[key as NewEastAsiaCode];"," const africa=africaPlaces[key as AfricaCode];\n if(africa&&africaLevels[key as AfricaCode])return{title:africa.landmark,landmark:africa.landmark,text:africa.fact,sourceUrl:africa.source,challengeQuestion:africa.question,answer:africa.answer,kind:'showcase'};\n const east=eastAsiaPlaces[key as NewEastAsiaCode];"),
])
patch('components/world-explorer/country-run.tsx',[
 ("africaPlaces","import {northAmericaPlaces,type NorthAmericaCode} from '../../lib/world-explorer/north-america';","import {northAmericaPlaces,type NorthAmericaCode} from '../../lib/world-explorer/north-america';\nimport {africaPlaces,type AfricaCode} from '../../lib/world-explorer/africa';"),
 ("africaPlaces[country.code","{northAmericaPlaces[country.code as NorthAmericaCode]&&<p><strong>Trail tip: </strong>{northAmericaPlaces[country.code as NorthAmericaCode].hint}</p>}","{northAmericaPlaces[country.code as NorthAmericaCode]&&<p><strong>Trail tip: </strong>{northAmericaPlaces[country.code as NorthAmericaCode].hint}</p>}{africaPlaces[country.code as AfricaCode]&&<p><strong>Trail tip: </strong>{africaPlaces[country.code as AfricaCode].hint}</p>}"),
])
AFRICA_REGISTRY=" // Africa (individually designed levels; see documentation/world-explorer/AFRICA.md).\n 'africa-ma':()=>import('./africa/morocco'),\n 'africa-dz':()=>import('./africa/algeria'),\n 'africa-tn':()=>import('./africa/tunisia'),\n 'africa-ly':()=>import('./africa/libya'),\n 'africa-sd':()=>import('./africa/sudan'),\n 'africa-ml':()=>import('./africa/mali'),\n 'africa-ne':()=>import('./africa/niger'),\n 'africa-mr':()=>import('./africa/mauritania'),\n 'africa-sn':()=>import('./africa/senegal'),\n 'africa-gm':()=>import('./africa/gambia'),\n 'africa-gw':()=>import('./africa/guinea-bissau'),\n 'africa-gn':()=>import('./africa/guinea'),\n 'africa-sl':()=>import('./africa/sierra-leone'),\n 'africa-lr':()=>import('./africa/liberia'),\n 'africa-ci':()=>import('./africa/cote-divoire'),\n 'africa-gh':()=>import('./africa/ghana'),\n 'africa-tg':()=>import('./africa/togo'),\n 'africa-bj':()=>import('./africa/benin'),\n 'africa-bf':()=>import('./africa/burkina-faso'),\n 'africa-ng':()=>import('./africa/nigeria'),\n 'africa-cv':()=>import('./africa/cabo-verde'),\n 'africa-cm':()=>import('./africa/cameroon'),\n 'africa-cf':()=>import('./africa/central-african-republic'),\n 'africa-td':()=>import('./africa/chad'),\n 'africa-cd':()=>import('./africa/dr-congo'),\n 'africa-cg':()=>import('./africa/congo'),\n 'africa-ga':()=>import('./africa/gabon'),\n 'africa-gq':()=>import('./africa/equatorial-guinea'),\n 'africa-st':()=>import('./africa/sao-tome'),\n 'africa-ao':()=>import('./africa/angola'),\n 'africa-ke':()=>import('./africa/kenya'),\n 'africa-tz':()=>import('./africa/tanzania'),\n 'africa-et':()=>import('./africa/ethiopia'),\n 'africa-er':()=>import('./africa/eritrea'),\n 'africa-dj':()=>import('./africa/djibouti'),\n 'africa-so':()=>import('./africa/somalia'),\n 'africa-ss':()=>import('./africa/south-sudan'),\n 'africa-ug':()=>import('./africa/uganda'),\n 'africa-rw':()=>import('./africa/rwanda'),\n 'africa-bi':()=>import('./africa/burundi'),\n 'africa-mw':()=>import('./africa/malawi'),\n 'africa-mz':()=>import('./africa/mozambique'),\n 'africa-mg':()=>import('./africa/madagascar'),\n 'africa-mu':()=>import('./africa/mauritius'),\n 'africa-sc':()=>import('./africa/seychelles'),\n 'africa-km':()=>import('./africa/comoros'),\n 'africa-zm':()=>import('./africa/zambia'),\n 'africa-zw':()=>import('./africa/zimbabwe'),\n 'africa-na':()=>import('./africa/namibia'),\n 'africa-bw':()=>import('./africa/botswana'),\n 'africa-ls':()=>import('./africa/lesotho'),\n 'africa-sz':()=>import('./africa/eswatini'),\n"
patch('components/world-explorer/countries/registry.ts',[
 ("'africa-ma'"," 'west-asia-ye':()=>import('./yemen'),\n"," 'west-asia-ye':()=>import('./yemen'),\n"+AFRICA_REGISTRY),
])
print('OK' if ok else 'INCOMPLETE')
