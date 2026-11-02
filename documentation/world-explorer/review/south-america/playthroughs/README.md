# Stage A playthroughs — Bolivia, Brazil, Venezuela

Complete desktop playthroughs of the three Stage A levels, run in the **production build** (`SOCIALU_BUILD_TARGET=review next build`, served by `next start`) in headless Microsoft Edge with hardware WebGL. Every screenshot is a capture of the running game.

**Status: all three stay at TESTING.** These runs are automated. A person still needs to play each level on desktop and on a real phone (see [Real-phone checklist](#real-phone-checklist)) before acceptance.

## How the runs work

1. `stage-a-playthrough.run.ts` plays each level with the same input-driven bot as the test suite, at the difficulty the game itself uses, and records the input of every fixed 1/60 s step on the real simulation, with the outcome it reached:
   - **complete-bonus:** the optional route, collecting coins and stars
   - **complete-main:** the main route, collecting coins
   - **hazard:** the main route to the first checkpoint, then running on without jumping until a hazard or fall costs a heart
2. `playthrough.mjs` opens each level in the browser with `?review=1&autoplay=1`. The run holds at its start until the script arrives, then the page replays it one fixed step at a time through its own simulation, rendering as normal. The driver:
   - clicks the discovery dialog's **Continue adventure** button, as a player would
   - waits for the result screen and its save message
   - compares the page's outcome (status, hearts, coins and their ids, stars, discovery, event counts) with the recorded run
3. It then checks real input: keyboard events on the canvas, and the on-screen touch buttons in an 844×390 touch viewport (Chromium touch emulation, not a phone).
4. Last, it reads the saved passport from `localStorage` and reloads each country card.

Re-run with the production server on port 3100:

```
npx vitest run --config scripts/world-explorer/playthrough.vitest.config.mjs
node --experimental-websocket scripts/world-explorer/playthrough.mjs --codes BOL,BRA,VEN --base http://localhost:3100
```

## Results

Run on 1 November 2026 against the production build, in Microsoft Edge 156 (headless, ANGLE Direct3D 11), on the development laptop. Full data: `playthrough-results.json` (page outcomes and every check), `scripts-summary.json` (recorded outcomes), and the input scripts `<code>-{complete-bonus,complete-main,hazard}.json`.

**All 9 scripted playthroughs passed.** In every run the page reached exactly the recorded outcome: status, hearts, coins and their ids, stars, discovery, and event counts.

| Level (difficulty in game) | Complete, bonus route | Complete, main route | Hazard and respawn | Coins and stars across both routes |
| --- | --- | --- | --- | --- |
| Bolivia (1) | 28.4 s · 31 coins · 3 stars · 3 hearts | 33.4 s · 33 coins · 3 stars · 3 hearts | lost 1 heart, respawned at `bo-flat-3` checkpoint | 33/33 · 3/3 |
| Brazil (2) | 25.7 s · 22 coins · 3 stars · 3 hearts | 30.7 s · 25 coins · 1 star · **2 hearts** | lost 1 heart, respawned at `br-canopy-3` checkpoint | 29/29 · 3/3 |
| Venezuela (3) | 31.5 s · 21 coins · 3 stars · 3 hearts | 32.1 s · 22 coins · 2 stars · 3 hearts | lost 1 heart, respawned at `ve-terrace-1` checkpoint | **23/24** · 3/3 |

What each part covered:

- **Hazards:** each hazard run ended with one heart lost and a respawn exactly on the first checkpoint's position. The completion runs also passed the levels' mechanics, each screenshotted the first time it happened:
  - Bolivia: switch-raised salt blocks
  - Brazil: the bromeliad bounce
  - Venezuela: crumbling blocks, gusts and climbs
- **Checkpoints:** both checkpoints activated in every completion run (`*-checkpoint-1.jpg`, `*-checkpoint-2.jpg`).
- **Collectibles:** the collected coin and star ids matched the recording one for one.
- **Discovery and completion:** the discovery dialog appeared and was continued with its button. The result screen showed the passport stamp, stars, coins, time and the save message (*"Progress stays on this device. Sign in to sync your passport."*, as no account was signed in).
- **Saved progress:** `localStorage` held each country as completed, with best coins, stars earned, best time and the discovery. After a fresh load, each country card read **Completed** (`*-card-after-reload.jpg`). South America showed 3 of 12.
- **Keyboard:** holding → moved the player about 14 units and Space jumped 1.94 units, in all three levels.
- **Touch (emulated):** the on-screen jump button raised the player 1.93–1.95 units and holding → moved it about 4.7–4.8 units, in all three levels.
- **Load time to ready (production build):** Brazil 1.2–2.2 s, Venezuela 1.7–1.9 s and Bolivia 6.8–7.9 s during these runs. The machine was loaded at the time by headless browsers left running from earlier capture runs, since stopped. On a quiet machine Bolivia is ready in 4.4 s on a cold first load and 1.7 s after (see `../art-polish/README.md`); most of the difference is its procedural salt-crust texture, generated once at start-up.
- **Page errors:** none, apart from a missing `/favicon.ico` (404), which is unrelated to World Explorer.

Findings for review:

1. **Brazil's main route loses a heart.** At difficulty 2, which the game uses for Brazil, patrols are 10% faster, and the bot, detouring for coins, is caught once by the seed pod on `br-far-bank`. The bonus route passes the same patrol without damage, and the critical-route test at difficulties 1, 2 and 4 takes none. This is a bot timing miss rather than a blocked section, but a person should check that the far-bank patrol feels fair.
2. **One Venezuela coin was not collected by the bot.** `ve-coin-01` sits just past the summit toad's patrol. At difficulty 3 (toad 20% faster) the bot jumps the toad and does not stop for it. At difficulty 1 it collects it, so it is reachable.
3. **The emulated touch check had two harness problems, both fixed in the script.**
   - Headless touch emulation sometimes stopped delivering touches to a tab that had had several, so each touch check now runs in a new tab.
   - The first version jumped after running right, and in Venezuela that jump hit the "?" block and the summit toad. It now jumps in place first.
4. **Falling view in Venezuela.** When the camera follows a fall (`ven-hazard-damage-1.jpg`), the darkened joints of the escarpment read as heavy black shards up close. Softening the joint and stain colours is a small follow-up; it was not changed after testing so that these results stay valid for the tested build.

## Real-phone checklist

Not done: real-phone play is outside what this machine can test. To run it, start the production server with `-H 0.0.0.0` on this laptop and open `http://<laptop LAN address>:3100/world-explorer` on a phone on the same Wi-Fi, in landscape. For each of Bolivia, Brazil and Venezuela:

- [ ] The level loads within a reasonable time and holds a steady frame rate (note the phone model and the review overlay's FPS with `?review=1`).
- [ ] The on-screen left, right and jump buttons respond, including holding right and jumping together.
- [ ] **Hazards:** fall into a gap or a hazard once; one heart is lost and the player respawns at the last checkpoint.
- [ ] **Checkpoints:** both checkpoint banners activate; a respawn after the second returns there.
- [ ] **Collectibles:** coins and stars collect, and the counters update.
- [ ] **Discovery:** the discovery dialog appears and **Continue adventure** resumes play.
- [ ] **Completion:** the result screen shows stars, coins, time and the save message.
- [ ] **Saved progress:** after closing and reopening the browser, the country card reads Completed.
- [ ] Readability: landing edges in Bolivia, platform edges in Brazil, the drop and cloud sea in Venezuela.
