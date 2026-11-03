# South America acceptance checklist — all twelve countries

**Status: all twelve countries are at TESTING. None is RELEASED.**

A country moves to RELEASED only when every human item in Part B is signed for it, and its country-specific items in Part C are settled. Automated checks (Part A) are necessary but do not count as acceptance.

Part A is filled in from recorded evidence. Parts B and C are for people: tick a box only after doing the check yourself, and write your name, the date and the device in the sign-off columns.

## How to play the build

- **Desktop:** `http://localhost:3100/world-explorer?country=<CODE>&play=1` on the machine running the review build (`SOCIALU_BUILD_TARGET=review npx next build`, then `SOCIALU_BUILD_TARGET=review npx next start -p 3100 -H 0.0.0.0`).
- **Phone (same Wi-Fi):** `http://<laptop-LAN-IP>:3100/world-explorer?country=<CODE>&play=1&review=1`. With `review=1` the corner panel shows live FPS, draw calls and triangles.
- **Codes:** BRA, BOL, URY, PER, ARG, CHL, COL, ECU, GUY, PRY, SUR, VEN.
- Clear site data before a first-play check, so the cold start (first load in a fresh browser) is tested.

---

## Part A — Automated checks (machine evidence, not acceptance)

| Check | Scope | Result | Evidence |
| --- | --- | --- | --- |
| Level validator incl. physics at every timing | all 12 | pass | `__tests__/world-explorer-south-america.test.ts`, `followup-production/scoped-tests.log` |
| Zero damage on the critical route at every challenge setting, incl. runtime difficulty and Explorer assist | all 12 | pass | same |
| Every coin and star without damage at runtime difficulty, both routes, start delays 0 / 1.8 / 3.6 s | all 12 | pass | same |
| Untidy play (backtracking, pausing at checkpoints) | all 12 | pass | same |
| Environment builds, walking caps at collision height, sculpted visual depth | all 12 | pass | same |
| 24-timing sweep, critical/main/bonus (72 runs per country) | Batch B, Batch C | Batch B 0 damaged of 360. Batch C: Paraguay, Peru, Uruguay 0 of 72 each; **Suriname 2 damaged of 72** (see C4) | `acceptance/timing-sweep-batch-b.json`, `acceptance/timing-sweep-batch-c.json` |
| Production playthroughs: two completion routes + hazard respawn, saved progress, keyboard, emulated touch | all 12 | pass | `followup-production/replays-stage-a-batch-b/`, `batch-c/playthroughs/` |
| Country guide shows the level's own place, landscape and photo; capitals unchanged | all 12 | pass | `guide-fix/guide-check.json`, `__tests__/world-explorer-guide-destination.test.ts` |
| Cold-start shader preparation (no shader-program link after the level is ready) | all 12 + 14 levels in four other regions | pass: 35 → 0 links after ready; median worst frame after ready 309 → 108 ms. **Shared code change awaiting the shared-scene team's agreement.** | `shader-prep/README.md` |
| Start-up timeout paths (late, failed and very late textures; slow and non-parallel shader preparation) | Ecuador, Japan, Italy | no shader link after ready, **except when surface maps arrive after the 3 s wait: 1–2 links, 156–195 ms frame** (known gap) | `shader-prep/timeouts/`, `shader-prep/README.md` |
| Same look and play with that change (reduced motion, paused, canvas only) | same 26 levels | pass: pixel-identical in all 26; jump and run in both builds; no page errors | `shader-prep/compare-builds.json` |
| South American route replays on that build (36 recorded scripts, saved progress, keyboard, touch) | all 12 | pass: every replay reached its recorded outcome | `shader-prep/replays/` |
| Full unit suite, isolated checkout (HEAD `9f4dcc0` + this work only) | whole app | 1120 / 1120 pass | `shader-prep/README.md` |
| Full unit suite, shared working tree (includes other teams' uncommitted work) | whole app | 1291 / 1291 pass | `shader-prep/README.md` |
| Laptop frame rate (120 Hz cap), desktop and 844×390 phone viewport | all 12 | 119–120 FPS average | `followup-production/captures/capture-results.json`, `art-polish/` |

Automated checks run headless Microsoft Edge on the development laptop, and touch is Chromium emulation. **None of them is a person, a real phone or a judgement of fairness or looks.**

---

## Part B — Human acceptance, every country

For each country a reviewer completes all of the following:

1. **Design approval.** Read the brief in `SOUTH-AMERICA.md` and play the level. Approve that the route, signature mechanic and tier fit the place.
2. **Desktop play.** Finish both routes (main and bonus) with keyboard. Note anything confusing, unfair or broken: falls you could not read, hits you could not avoid, a camera that hides the next landing.
3. **Real-phone play.** On a physical phone, in landscape, finish the main route with the on-screen buttons. Then fill in the phone performance row below.
4. **Visual sign-off.** The scenery reads as the real place, platforms read as solid ground, landing edges are clear, and nothing floats, tears or flickers.
5. **Country guide.** Open "Country guide" and confirm the place, landscape and photo match the level and the capital is right.

### B1. Sign-off table

| Country | Design approved | Desktop: both routes | Real phone: main route | Visuals signed off | Guide checked | Reviewer · date |
| --- | --- | --- | --- | --- | --- | --- |
| 🇧🇷 Brazil | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇧🇴 Bolivia | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇺🇾 Uruguay | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇵🇪 Peru | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇦🇷 Argentina | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇨🇱 Chile | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇨🇴 Colombia | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇪🇨 Ecuador | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇬🇾 Guyana | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇵🇾 Paraguay | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇸🇷 Suriname | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 🇻🇪 Venezuela | ☐ | ☐ | ☐ | ☐ | ☐ | |

### B2. Real-phone performance (every country)

Use a mid-range phone, not a flagship. Record the model, the browser and how warm the phone gets. Read FPS from the `review=1` panel after about 30 s of play.

**Pass:**

- the steady FPS is at least 30
- no stutter is noticeable during play
- the first load is under 10 s on Wi-Fi
- the phone is no more than warm to the touch after one full run

Record the measured value, not only pass or fail.

| Country | Phone model · browser | Load (s) | Steady FPS | Lowest FPS seen | Stutter? | Heat after one run | Pass ☐ | Reviewer · date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 🇧🇷 Brazil | | | | | | | ☐ | |
| 🇧🇴 Bolivia | | | | | | | ☐ | |
| 🇺🇾 Uruguay | | | | | | | ☐ | |
| 🇵🇪 Peru | | | | | | | ☐ | |
| 🇦🇷 Argentina | | | | | | | ☐ | |
| 🇨🇱 Chile | | | | | | | ☐ | |
| 🇨🇴 Colombia (see C2) | | | | | | | ☐ | |
| 🇪🇨 Ecuador | | | | | | | ☐ | |
| 🇬🇾 Guyana | | | | | | | ☐ | |
| 🇵🇾 Paraguay | | | | | | | ☐ | |
| 🇸🇷 Suriname | | | | | | | ☐ | |
| 🇻🇪 Venezuela | | | | | | | ☐ | |

---

## Part C — Country-specific judgements

### C1. Bolivia — landing-edge readability

Landing edges on the salt flat have a stained rim so they stand out against the white salt and its mirror. Evidence: `acceptance/bolivia-edges/`.

- ☐ On desktop, every landing edge on both routes can be judged before jumping.
- ☐ On a real phone, in daylight-level screen brightness, the same holds.
- ☐ No landing was missed because the edge was unreadable (write down any that were, with the platform's place in the level).

Reviewer · date · device: ______

### C2. Colombia — scene cost on a real phone

Colombia is the heaviest South American scene, at 285k triangles and 88 draw calls (laptop). Most of the cost is the ringed wax-palm trunks. On the laptop it holds 120 FPS on desktop and in the phone viewport; that is not a phone result.

- ☐ Played on a mid-range phone; the B2 row is filled in.
- ☐ The palm grove near the summit (the densest view) holds the B2 pass level.
- ☐ Decision recorded: **keep** the palm count, or **reduce** it (for example fewer distant palms or simpler trunks on low-power devices).

Decision · reviewer · date: ______

### C3. Brazil — far-bank patrol fairness

At difficulty 2, the coin on the far bank is guarded by a river-pod patrol. In 2 of 32 sweep timings the test bot was hit there; the trace shows a bot timing miss after the pod's alert pause (`acceptance/patrol-timings.json`, `acceptance/README.md`). Mechanics are unchanged.

- ☐ A person can see the pod's pause and judge a jump over it to the coin.
- ☐ Over several attempts, the reviewer was never hit without being able to see why.
- ☐ Verdict: **fair**, or **needs change** (describe).

Verdict · reviewer · date: ______

### C4. Suriname — market patrol fairness

At difficulty 1, after the drop from the waterkant onto the market square, the mango beetle patrols x 38.4–42.6 on `sr-market`. In the 24-timing sweep, 2 of 72 runs took one hit there:

| Route | Start delay | Hit at | Platform |
| --- | --- | --- | --- |
| main | 1.13 s | x 41.52 | `sr-market` |
| critical | 2.25 s | x 41.64 | `sr-market` |

The trace shows the bot making short hops behind the beetle instead of jumping it, and the beetle turning back into it. Mechanics are unchanged, and these two timings stay documented until a person has judged them. Evidence: `acceptance/timing-sweep-batch-c.json` and `batch-c/README.md`.

- ☐ After the drop, the beetle is visible early enough to wait or jump.
- ☐ Over several attempts, including dropping right behind the beetle, the reviewer was never hit without being able to see why.
- ☐ Verdict: **fair**, or **needs change** (describe).

Verdict · reviewer · date: ______

### C5. Argentina — Fitz Roy snow

The flat white snow discs around the Fitz Roy needles were replaced with snow caps on the summits and shoulders that follow the rock. Evidence: `argentina-snow/`.

- ☐ The needles read as granite peaks with snow lying on them, and nothing looks like a ring or a plate.

Reviewer · date: ______

### C6. Ecuador — cold start

Ecuador's level used to stall for about 300 ms a few seconds after starting in a fresh browser. The shared scene now prepares every shader before the first frame (`shader-prep/README.md`).

- ☐ On a real phone, with site data cleared, the first 10 s of play have no visible freeze.
- ☐ Once more on a slow mobile connection (not Wi-Fi). A short freeze when the rock textures appear a few seconds into play is the known late-texture case (`shader-prep/README.md`, "Timeout paths"). Note whether it happens and how long it feels.
- ☐ On the slowest phone available, how long the loading screen stays frozen before play starts (the warm-up draw).

Reviewer · date · device: ______

---

## Release record

| Country | Part B complete | Part C items settled | Released by · date |
| --- | --- | --- | --- |
| 🇧🇷 Brazil | ☐ | C3 ☐ | |
| 🇧🇴 Bolivia | ☐ | C1 ☐ | |
| 🇺🇾 Uruguay | ☐ | — | |
| 🇵🇪 Peru | ☐ | — | |
| 🇦🇷 Argentina | ☐ | C5 ☐ | |
| 🇨🇱 Chile | ☐ | — | |
| 🇨🇴 Colombia | ☐ | C2 ☐ | |
| 🇪🇨 Ecuador | ☐ | C6 ☐ | |
| 🇬🇾 Guyana | ☐ | — | |
| 🇵🇾 Paraguay | ☐ | — | |
| 🇸🇷 Suriname | ☐ | C4 ☐ | |
| 🇻🇪 Venezuela | ☐ | — | |

Until a row is complete, that country stays at **TESTING** in `SOUTH-AMERICA.md` and `lib/world-explorer/south-america.ts`.
