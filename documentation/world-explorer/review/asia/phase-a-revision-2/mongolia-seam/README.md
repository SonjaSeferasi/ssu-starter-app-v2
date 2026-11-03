# Mongolia seam fix — revision 2 addendum

**Revision 2 remains the East Asia testing candidate.** This focused patch changes only Mongolia's decorative foreground apron. Calibrated tiers, mechanics, Japan's art and the other 42 proposed Asia designs are preserved. All release flags remain false.

[Before/after gallery](index.html) · [Human playtest priorities and instructions](HUMAN-PLAYTESTS.md) · [Ten-session recording sheet](human-playtests.csv) · [Validation](validation.json) · [Browser evidence](browser-evidence.json)

## Focused finding and correction

The foreground grass began at z=3 while the flared bank foot ended around z=2, exposing a pale strip of scene background. Its low rear edge also left a thin projected line beside the starting bank. The decorative apron now begins at z=1, overlaps beneath the bank foot, and slopes from a higher rear edge into the existing foreground grass. It remains outside the z=0 player lane. No colliders, platforms, physics, routes, warnings, rewards or difficulty values were changed.

Actual images were inspected at desktop 1600×900, portrait 390×844, small-phone 320×693 and landscape 844×390. The pale slit is closed at the reviewed positions. Additional desktop and portrait scans cover the river crossing and far bank. The bank edge, ferry, route gaps, heading and controls remain visible. The original revision 2 images are preserved, with two copied here for comparison; none are relabeled as new human evidence.

## Verification

- **37 focused tests passed across four files**, including two new terrain-coverage cases and the existing art/collision, route/mechanic and release-boundary checks.
- **Production build passed**, build ID `vYkkB-c3zNeg70POZnLAY`. The preview was checked against that exact build ID before capture.
- **8 new screenshots across four viewport sizes**, with zero uncaught scene exceptions, no horizontal overflow and fitting country headings.
- All five East Asia level JSON files, simulation, difficulty analyzer and Japan terrain module are **byte-equivalent after newline normalization to revision 2 commit 6b2a0ca**. Exact hashes are recorded in validation.json.
- The prior revision 2 full-suite result remains historical evidence. It is not relabeled as a new full-suite run for this small decorative patch.

## Human playtest findings

**Pending at user request. No human sessions have been run or reported; there are no human findings yet.** The sheet prioritizes Japan's first-time beginner/lower route, then its bonus route, followed by both routes in Paektu, China, Seoul and Mongolia. Each session records route comprehension, warnings, camera visibility, controlled checkpoint recovery, reward retention, counters and pause/discovery behavior. Automated route evidence remains separate.

Live account-save verification and physical-phone testing remain pending. 60 FPS remains unverified until measured in a confirmed 60+ Hz browser environment; this focused capture did not repeat performance measurements or reinterpret the earlier 30 Hz results. Human approval is also pending. No next Asia region was started.

## Preview and reproduction

- [Corrected Mongolia](http://127.0.0.1:3011/world-explorer?country=MNG&play=1)
- [Japan beginner playtest start](http://127.0.0.1:3011/world-explorer?country=JPN&play=1)

Use normal gameplay URLs for human testing, without review/autoplay parameters. Build and start with `SOCIALU_BUILD_TARGET=asia-phase-a`. Run `node scripts/world-explorer/capture-mongolia-seam.cjs` after verifying the preview build. This captures the current presentation but never changes simulation data or saved results. Phone views are browser emulation, not physical-phone tests.
