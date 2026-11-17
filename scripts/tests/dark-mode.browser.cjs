// Actual local UI in Edge, with intercepted API fixtures. No hosted account/data writes.
const { chromium } = require(process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SOCIALU_TEST_URL || 'http://127.0.0.1:3038';
const output = process.env.SOCIALU_EVIDENCE_DIR || 'tmp/appearance-evidence';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.SOCIALU_BROWSER_EXECUTABLE });
  const writes = [], presenceWrites = [];
  const themes = { alice: 'dark', bob: 'light' };
  let failSave = false, failLoad = false;
  const room = { appearance: { outfitId: '1', faceId: '1', avatarId: 'campus-v4-female-1-1-natural' }, outfits: [{ id: '1', name: 'Campus', assetKey: 'sample-campus' }], faces: [{ id: '1', assetKey: 'sample-smile', initial: true }], activities: [] };
  async function setup(context) {
    await context.addInitScript(() => { if (!localStorage.getItem('access_token')) localStorage.setItem('access_token', 'alice'); });
    await context.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      let status = 200, data = { personality: {answers: [], interests: [], spotifyUrl: ''}, memories: [], friends: [], members: [], posts: [], events: [], students: [], conversations: [], notifications: [], requests: [], groups: [], confessions: [], highlights: [], hasMore: false };
      if (path === '/api/preferences/appearance') {
        const owner = req.headers().authorization?.replace('Bearer ', '');
        if (req.method() === 'PUT') {
          const theme = req.postDataJSON().theme; writes.push({ owner, theme });
          if (failSave) status = 503; else themes[owner] = theme;
        } else if (failLoad) status = 503;
        data = status === 200 ? { theme: themes[owner] || 'light' } : { error: 'Deliberate fixture failure' };
      } else if (path === '/api/auth/session') data = { community: { name: 'Local QA fixture' } };
      else if (path === '/api/preferences') data = { position: 'side' };
      else if (path === '/api/preferences/screen-theme') data = { backgroundTheme: null, headerTheme: null };
      else if (path.startsWith('/api/posts/feed/')) data={posts:[{postId:99,authorId:2,authorName:'Test classmate',authorUsername:'classmate',authorPhotoUrl:null,textContent:'A sample campus post to check readable text, menus and reaction controls.',visibility:'public',publishedAt:'2026-11-17T12:00:00Z',editedAt:null,photos:[],mentions:[],isRepost:false,repostOf:null,likeCount:0,isLikedByViewer:false,reactionCounts:{},myReaction:null,commentCount:0}]};
      else if (path === '/api/profiles/corner') data={corner:{vibe:null,goals:[],poll:null,plan:null},available:true};
      else if (path === '/api/profiles/social') data={follower_count:0,following_count:0,following:false};
      else if (path === '/api/profiles/space') data = {look:{palette:'sage',frame:'rounded',cover:'meadow',layout:'about-first',stickers:[]},notes:[],available:true};
      else if (path === '/api/game-room') data = room;
      else if (path === '/api/jumpyland') data = { completed: [], balance: 0 };
      else if (path === '/api/message-notifications') data = { notifications: [] };
      else if (path.includes('invitations')) data = { invitations: [] };
      else if (path === '/api/notifications') data = { unread: 0, notifications: [] };
      else if (path === '/api/points') data = { balance: 0 };
      else if ((path === '/api/profile' || path === '/api/profiles')) data = { profile: {id:'1',is_own:true,username:'local_qa',full_name:'Local QA Student',name:'Local QA Student',display_name:null,university:'Salem State University',major:'Computer Science',class_year:'Senior',bio:'Checking that profile text stays readable in both appearances.',photo_url:null,setup_completed:true,post_count:0,friend_count:0,is_friend:false,friend_request:null}, defaults: { fullName: 'Local QA Fixture', username: 'local_qa' } };
      else if (path === '/api/game-participation') data = { count: 0, qualifiedToday: false, forgivenRemaining: 3, rewardPoints: 10, earnedPointsToday: 0, leaderboards: {} };
    if (path === '/api/game-room/presence') {
      if (!['GET','HEAD'].includes(req.method())) presenceWrites.push({method:req.method(),path});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({friends:[],visible:true})});return;
    }
      if (!['GET', 'HEAD'].includes(req.method()) && path !== '/api/preferences/appearance') writes.push({ unexpected: path });
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
  }


const context=await browser.newContext({viewport:{width:1440,height:1000}}); await setup(context); const page=await context.newPage();page.setDefaultTimeout(60000);
const report=[];
for(const path of ['/', '/events', '/messages', '/profile', '/friends','/game-room','/profile/settings/customize','/profile/edit','/events/new']) {
 const pageErrors=[]; const onError=e=>pageErrors.push(e.message);page.on('pageerror',onError);
 await page.goto(base+path,{timeout:90000});await page.waitForFunction(()=>document.documentElement.dataset.appearance==='dark');
 if(path==='/profile')await page.waitForTimeout(5000);
 await page.waitForTimeout(1500);
 const contrast=await page.evaluate(()=>{
  const rgb=v=>{const m=v.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0]};
  const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const results=[];
  for(const el of document.querySelectorAll('main *, [data-navigation] input')) {
   if(el.namespaceURI!=='http://www.w3.org/1999/xhtml'||!el.checkVisibility()||el.closest('button:disabled')||!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))continue;
   const st=getComputedStyle(el);if(Number(st.opacity)<1)continue;
   let p=el,bg=null;while(p){const c=getComputedStyle(p);if(c.backgroundImage!=='none'){bg=null;break;}const b=rgb(c.backgroundColor);if(b.length===3||b[3]===1){bg=b;break;}if(b[3]>0){bg=null;break;}p=p.parentElement;}
   if(!bg)continue;const fg=rgb(st.color);const l1=lum(fg),l2=lum(bg);const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);const large=parseFloat(st.fontSize)>=24||(parseFloat(st.fontSize)>=18.66&&Number(st.fontWeight)>=700);
   if(ratio<(large?3:4.5))results.push({text:el.textContent.trim().slice(0,65),class:el.className,ratio:+ratio.toFixed(2),color:st.color,background:bg});
  }return results;
 });
 await page.screenshot({path:output+'/'+(path.replaceAll('/','-')||'home')+'.png',fullPage:true});
 report.push({path,pageErrors,contrast});console.log(path,JSON.stringify({pageErrors,contrast}));page.off('pageerror',onError);
}
await page.goto(base+'/');await page.getByRole('button',{name:'Preferences',exact:true}).click();await page.getByRole('button',{name:'☀ Light',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.appearance==='light');
await page.waitForTimeout(1000);
assert.equal(await page.locator('[data-navigation]').getAttribute('data-theme-dark'),null);await page.screenshot({path:output+'/light-restored.png'});
await page.getByRole('button',{name:'☾ Dark',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.appearance==='dark');
await page.waitForTimeout(1000);
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:output+'/dark-mobile.png',fullPage:true});
fs.writeFileSync(output+'/contrast.json',JSON.stringify(report,null,2));await browser.close();assert.equal(report.flatMap(r=>r.pageErrors).length,0,'No fixture-page runtime errors');
assert.equal(report.flatMap(r=>r.contrast).length,0,'Readable text on checked solid surfaces');
})();
