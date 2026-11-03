from pathlib import Path
import json,html,hashlib,shutil
root=Path(__file__).resolve().parents[2];run=root/'tmp/north-america-complete';out=root/'documentation/world-explorer/review/north-america/revision-1'
places=json.loads((run/'places.json').read_text());codes=set(places)
reports={name:json.loads((out/(name+'.json')).read_text()) for name in ['routes','mobile-routes','controls','art']}
routes=reports['routes']['records'];mobile=reports['mobile-routes']['records'];controls=reports['controls']['records']
assert len(routes)==51 and len(mobile)==17 and len(controls)==17
assert {r['code'] for r in routes}==codes=={r['code'] for r in controls}=={r['code'] for r in mobile}
for code in codes:
 assert {(r['route'],r['mobile']) for r in routes if r['code']==code}=={('main',False),('bonus',False),('main',True)}
for r in routes+mobile:
 assert r['passed'] and r['actual']['status']=='completed' and r['actual']['hearts']==3 and not r['errors']
 assert r['actual']['tally'].get('damage',0)==0
 assert r['devicePassport']['saved']==r['devicePassport']['restored'] and r['devicePassport']['replayButtonVisible']
for r in controls:
 assert r['passed'] and not r['errors'] and r['pauseFreezesClock']
 for orientation in ['portrait','landscape']:assert all(b['inViewport'] and b['width']>=44 and b['height']>=44 for b in r[orientation]['controls'])
build=(root/'tmp/tools/north-america-build/.next/BUILD_ID').read_text().strip()
assert '195 passed' in (run/'review-all-tests.txt').read_text()
assert '22 passed' in (run/'review-final-art-tests.txt').read_text()
assert 'prerendered as static content' in (run/'review-final-build.txt').read_text()
summary={'productionBuildId':build,'focusedTestsPassed':195,'finalGeometryRechecksPassed':22,'uniqueRenderedRoutesPassed':51,'finalMobileReplayRechecksPassed':17,'touchChecksPassed':17,'layoutOrientationsPerCountry':2,'devicePassportReloadsPassed':51,'runtimeErrors':sum(len(r['errors']) for r in routes+mobile+controls),'photoEvidence':'Exact wrong-destination regression payloads rejected; valid named aliases accepted. This does not establish that wrong photos were served live.','broaderTests':{'passed':33,'failed':1,'failure':'Unmodified world-explorer-progress.test.ts expects Nauru discovery text to mention no officially designated capital; current Buada Lagoon teaching text does not include that statement.'},'humanDifficultyReview':'pending','physicalPhoneTesting':'pending','hardwarePerformance':'not-measured','signedInAccountSync':'not-tested','published':False}
(out/'verification-summary.json').write_text(json.dumps(summary,indent=2))
for name in ['review-all-tests.txt','review-final-art-tests.txt','review-fix-tests.txt','review-guide-progress-tests.txt','review-final-build.txt']:
 shutil.copy2(run/name,out/name)
sourcePaths=['lib/world-explorer/media.ts','lib/world-explorer/guide-destination.ts','components/world-explorer/countries/north-america-remaining.ts','components/world-explorer/countries/north-america-island-landmarks.ts','components/world-explorer/countries/north-america-island-art.ts','components/world-explorer/countries/north-america-forest.ts','components/world-explorer/world-explorer.module.css','__tests__/world-explorer-north-america-remaining.test.ts','__tests__/world-explorer-north-america.test.ts','__tests__/world-explorer-destination-photo.test.ts','__tests__/world-explorer-island-art.test.ts','__tests__/world-explorer-north-america-tapes.test.ts','scripts/world-explorer/review-north-america.cjs']
(out/'source-receipt.json').write_text(json.dumps([{'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in sourcePaths],indent=2))
readme=f'''# North America review corrections

## Changes

1. Photo matching now requires every meaningful token in a destination name, using token boundaries and accent folding. Saint Lucia uses explicit Gros Piton, Petit Piton and Pitons Saint Lucia aliases; Trinidad uses Caroni Swamp and Caroni Bird Sanctuary. The reproduced Tanzania/Kenya payloads are regression fixtures; no live-photo mismatch is inferred from them.
2. The full mountain study is instantiated once. Saint Lucia and Nicaragua each contain exactly two actual peak meshes. Secondary geometry is bay water, lake water or an ash bank, rather than another full mountain model.
3. Dominica, Saint Lucia, Nicaragua, Saint Vincent and Trinidad have separate sky/light, water, ground-cap, body-map and vegetation treatments. Trinidad uses mangroves and mud; Saint Vincent has sparse ash and rock; Nicaragua has dry volcanic ground; Dominica has a cleared lake foreground and humid forest; Saint Lucia has bright coastal light and a bay.
4. Dense radial mountain geometry adds irregular ridges, displaced silhouettes, elevation shading and crater interiors. Dominica's near lake is kept out of forest occlusion and its obsolete distant basin was removed. Panama uses shallow rendered quays, exposing canal buildings, cargo and machinery while retaining all authored colliders. Long country names fit mobile title areas.
5. Both North America collectible suites now assert `damaged` is empty and every recorded timing run has zero damage. A clean run at one phase cannot hide damage at another phase.
6. Browser evidence now covers rendered completion, responsive layouts, actual emulated touch controls and device-passport reloads.

## What was actually checked

- 195 focused tests passed: all 23 North American routes/collectibles, all 17 new environments, peak counts, lake sightline, shallow-quay rendering, photo reproductions, valid photo aliases and input-tape recording. A final 22 geometry checks passed after the last visual refinements.
- 51 unique rendered completions: main and bonus routes on desktop, plus the main route in mobile portrait for each of 17 countries. Each finished with three hearts, no damage, exact recorded coin/star IDs, a real discovery dialog, a real completion UI and the app's result callback.
- 17 final mobile main replays repeated after the title-fit correction.
- 17 touch checks use CDP touchStart/touchEnd on the real rendered buttons: right, left, simultaneous right+jump, releasing jump while preserving movement, releasing all controls, landing and pause. Portrait 390x844 and landscape 844x390 check visible 44px-or-larger buttons, no horizontal overflow, a visible canvas and non-overflowing country titles.
- For each completed run, the real anonymous result was saved by the application. After navigation and a full reload, the device passport matched the saved completed/coin/star/discovery values and the UI offered Replay level. No account or progress APIs were mocked, and no saved progress was injected.
- Production build `{build}` passed, including type checking.

Route playback uses the existing opt-in review controller with recorded simulation inputs. Playwright's virtual time advances existing animation frames in 250ms steps. Simulation inputs remain ordered and the renderer, discovery UI, result UI and save callbacks execute. This is accelerated automated replay, not a human touch playthrough, a 60-FPS benchmark or a physical-device test. Actual touch input checks are separate from the route tapes. The screenshots retain the review HUD; its FPS is not evidence of device performance.

## Remaining limits and unrelated failure

Human difficulty/engagement review and physical-phone testing remain pending. Signed-in account sync and representative-hardware performance are unverified. The models remain stylized destination studies, with visual acceptance left to the user.

The broader guide/progress run had 33 passes and one unrelated failure. An existing Nauru discovery assertion expects the phrase `no officially designated capital`; its current Buada Lagoon teaching text does not include that capital statement. Neither the Nauru discovery data nor that test was changed in this repair. See `review-guide-progress-tests.txt` for the exact result.

## Evidence and reproduction

[Gallery](index.html) · [Summary](verification-summary.json) · [Rendered routes](routes.json) · [Final mobile replays](mobile-routes.json) · [Touch/layout checks](controls.json) · [Source hashes](source-receipt.json)

```powershell
node node_modules/vitest/vitest.mjs run __tests__/world-explorer-north-america-tapes.test.ts --maxWorkers=1 --minWorkers=1
# Start the normal isolated source preview on port 3016.
node scripts/world-explorer/preview-north-america.cjs
# In a separate terminal, use MODE=routes, controls, mobile-routes, or art:
$env:MODE='routes'
node scripts/world-explorer/review-north-america.cjs
# COUNTRY and WORKERS optionally limit a review run. Art uses standard
# graphics; route and touch runs use low graphics. No new app dependency.
python scripts/world-explorer/package-north-america-review.py
```
'''
(out/'README.md').write_text(readme,encoding='utf-8')
esc=html.escape
art=''.join(f'<figure><img loading="lazy" src="{c.lower()}-art.png" alt="{esc(places[c]["name"])} revised scenery"><figcaption>{esc(places[c]["name"])}</figcaption></figure>' for c in ['DMA','LCA','NIC','VCT','TTO','PAN'])
cards=[]
for code,p in places.items():
 images=[('Desktop main completion',f'{code.lower()}-main-desktop-complete.png'),('Desktop bonus completion',f'{code.lower()}-bonus-desktop-complete.png'),('Mobile main route in progress',f'{code.lower()}-main-mobile-playing.png'),('Mobile passport after reload',f'{code.lower()}-main-mobile-reloaded.png'),('Portrait touch check',f'{code.lower()}-touch-portrait.png'),('Landscape touch check',f'{code.lower()}-touch-landscape.png')]
 for _,name in images:assert (out/name).exists(),name
 cards.append(f'<article><h2>{esc(p["name"])}</h2><p>Desktop main + bonus, mobile main, touch controls, both layouts and device passport reload: passed.</p><div class="grid">'+''.join(f'<figure><a href="{name}"><img loading="lazy" src="{name}" alt="{esc(p["name"])} {esc(label)}"></a><figcaption>{esc(label)}</figcaption></figure>' for label,name in images)+'</div></article>')
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>North America — corrected scenes and rendered checks</title><style>body{margin:0;background:#102b31;color:#edf3eb;font:16px/1.55 system-ui}main{max-width:1400px;margin:auto;padding:28px}a{color:#a4e3d2}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.art{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}article{background:#193b40;border:1px solid #40615d;border-radius:16px;padding:20px;margin:24px 0}figure{margin:0;background:#0c2028;border-radius:8px;overflow:hidden}img{display:block;width:100%;max-height:300px;object-fit:contain}figcaption{padding:10px}.art img{max-height:none}@media(max-width:800px){.grid,.art{grid-template-columns:1fr}}</style><main><h1>North America review corrections</h1><p>195 focused tests · 51 rendered completions · 17 touch checks in two orientations · device passport verified after reload · production build passed.</p><p>Human difficulty review, physical phones, signed-in account sync and hardware performance remain pending. The broader progress suite has one unrelated Nauru fact-text assertion failure. Accelerated recorded-input replay is separate from the actual emulated-touch checks.</p><p><a href="README.md">Methods and limits</a> · <a href="verification-summary.json">Verification summary</a> · <a href="routes.json">Rendered routes</a> · <a href="controls.json">Touch/layout evidence</a></p><h2>Revised scenery</h2><div class="art">'''+art+'</div>'+''.join(cards)+'</main></html>',encoding='utf-8')
doc=root/'documentation/world-explorer/NORTH-AMERICA-REMAINING.md';text=doc.read_text();note='> Current correction review: [rendered routes, mobile controls and revised scenery](review/north-america/revision-1/README.md). The older paused-scene package below is historical evidence.\n\n'
if note not in text:doc.write_text(note+text,encoding='utf-8')
for name in ['routes','controls','art','mobile-routes']:
 failure=out/(name+'-failure.txt')
 if failure.exists():failure.rename(out/(name+'-resolved-earlier-failure.txt'))
print(json.dumps(summary,indent=2))
