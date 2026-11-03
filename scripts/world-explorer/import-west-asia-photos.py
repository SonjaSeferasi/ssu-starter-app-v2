"""Fetch fixed, attributed Commons reference photos. No unreviewed fallback image."""
import json,re,time,urllib.request,urllib.parse,html
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[2]
places=json.loads((ROOT/'documentation/world-explorer/review/asia/west-asia/settings.json').read_text(encoding='utf-8'))
folder=ROOT/'public/world-explorer/photos/west-asia';folder.mkdir(parents=True,exist_ok=True)
def clean(s):return html.unescape(re.sub('<[^>]+>','',str(s))).strip()
def get(url):
 for attempt in range(3):
  try:return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'SocialUWorldExplorer/1.0 (educational project; Commons licensed reference photographs)'}),timeout=40).read()
  except Exception:
   if attempt==2:raise
   time.sleep(2+attempt)
def photo(p):
 cache=ROOT/('tmp/tools/asia-review/west-photo-'+p['code']+'.json')
 if cache.exists():return json.loads(cache.read_text(encoding='utf-8'))
 overrides={'KWT':'Kuwait Towers','IRQ':'intitle:"Marshes" Iraq','ISR':'intitle:Masada','QAT':'Doha Corniche','ARE':'intitle:Burj intitle:Khalifa skyline',"SAU":"Mada'in Salih",'TUR':'intitle:Cappadocia','OMN':'intitle:Shab','YEM':'intitle:Socotra'}
 if p['code'] in overrides:p={**p,'mediaSearch':overrides[p['code']]}
 params=dict(action='query',format='json',formatversion=2,generator='search',gsrnamespace=6,gsrlimit=8,gsrsearch=p['mediaSearch']+' filetype:bitmap',prop='imageinfo',iiprop='url|mime|extmetadata',iiurlwidth=640)
 data=json.loads(get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)))
 candidates=[]
 for page in data.get('query',{}).get('pages',[]):
  info=page.get('imageinfo',[{}])[0];m=info.get('extmetadata',{});title=page['title'].removeprefix('File:')
  lic=clean(m.get('LicenseShortName',{}).get('value',''));artist=clean(m.get('Artist',{}).get('value',''));licenseUrl=clean(m.get('LicenseUrl',{}).get('value',''))
  if info.get('mime')!='image/jpeg' or not artist or not re.match(r'^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$',lic,re.I) or not licenseUrl:continue
  if any(w in title.lower() for w in ['map','stamp','logo','portrait','panorama 360','drawing',' girl',' boy','hegramo','2007','2008','2009']):continue
  required={'ARM':['garni'],'AZE':['gobustan'],'BHR':['bahrain'],'CYP':['troodos'],'GEO':['svaneti','ushguli'],'IRQ':['marsh'],'ISR':['masada'],'JOR':['petra'],'KWT':['kuwait'],'LBN':['qadisha'],'OMN':['shab'],'QAT':['doha'],'SAU':['hegra','hijr','salih','saleh'],'SYR':['palmyra'],'TUR':['cappadocia','goreme'],'ARE':['dubai'],'YEM':['socotra']}
  if not any(word in title.lower() for word in required[p['code']]):continue
  candidates.append((page,info,lic,artist,licenseUrl))
 if not candidates:raise RuntimeError('No suitable licensed image: '+p['code'])
 page,info,lic,artist,licenseUrl=candidates[0];url=info.get('thumburl',info['url']);data=get(url)
 file=p['iso2'].lower()+'.jpg';(folder/file).write_bytes(data)
 result={'code':p['code'],'setting':p['landmark'],'subject':p['photoSubject'],'reviewStatus':'DEVELOPER_REVIEW_REQUIRED','originalUrl':url,'image':{'title':page['title'].removeprefix('File:'),'url':'/world-explorer/photos/west-asia/'+file,'pageUrl':info['descriptionurl'],'author':artist,'license':lic,'licenseUrl':licenseUrl.replace('http://creativecommons.org','https://creativecommons.org'),'retrievedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}}
 cache.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(p['code'],result['image']['title'],lic,flush=True);return result
records=list(ThreadPoolExecutor(max_workers=3).map(photo,places))
(ROOT/'public/world-explorer/data/west-asia-media.json').write_text(json.dumps({'method':'Fixed Commons photographs; individual file attribution retained. Developer verifies subject against playable setting.','records':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
