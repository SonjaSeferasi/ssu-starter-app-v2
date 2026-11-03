# North America review corrections

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
- Production build `suVaEK2KQ-0evIoC_gCzS` passed, including type checking.

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
