# East Asia revision 2 — human playtest queue

**Status: pending at user request (NOT_RUN).** No human participant observations have been received. Existing automated runs are supporting evidence, not human findings or release approval. Revision 2 remains the testing candidate with the Mongolia presentation patch.

Use [human-playtests.csv](human-playtests.csv) to record each session. Leave outcomes blank until someone actually plays. Use an anonymous tester code; no personal details are required.

## Session order

| Priority | Country | Route | Tier | Main observation |
|---|---|---|---:|---|
| 1 | Japan | Main / lower | 1 | First-time beginner readability, wooden bridge, exit stairs, enemy visibility |
| 2 | Japan | Bonus / upper | 1 | Optional-path recognition, all three stars, safe return to the lower route |
| 3 | North Korea | Main | 4 | Loose-rock warning, ridge wind, collapsing shelf, next landing visible |
| 4 | North Korea | Bonus | 4 | Optional ledge, return path, warning readability while collecting |
| 5 | China | Main | 5 | Lift timing, exposed-ridge wind warning, collapsing ledge, camera on ascent |
| 6 | China | Bonus | 5 | Narrow upper ledges, star placement, readable reconnection |
| 7 | South Korea | Main | 3 | Lift exit, pressure switch and timed skywalk, gate/camera clarity |
| 8 | South Korea | Bonus | 3 | Planted service lift, optional star, rejoining the main route |
| 9 | Mongolia | Main | 2 | Riverbank seam in motion, ferry, wind signal, gaps still readable |
| 10 | Mongolia | Bonus | 2 | Optional ledge recognition, river crossing and rewards |

## Setup

Open the normal level URL, without `review` or `autoplay` parameters. Keep graphics, assist and reduced-motion preferences constant during a run; record the chosen settings and any changes. A first-time player should try Japan's lower route before receiving coaching. One person may cover all ten sessions; label repeat experience honestly.

- [Japan](http://127.0.0.1:3011/world-explorer?country=JPN&play=1)
- [North Korea](http://127.0.0.1:3011/world-explorer?country=PRK&play=1)
- [China](http://127.0.0.1:3011/world-explorer?country=CHN&play=1)
- [South Korea](http://127.0.0.1:3011/world-explorer?country=KOR&play=1)
- [Mongolia](http://127.0.0.1:3011/world-explorer?country=MNG&play=1)

The player chooses the main or bonus path in the level itself. The route is not selected by the URL. Main routes can finish without collecting the optional opening star; a missing optional star alone is not a failure of the main route.

## Observe without coaching the first attempt

1. **Route and difficulty:** Can the player identify where to go? Record attempts, completion or where they stopped, active HUD time and any help. Ask Japan's first-time player whether the lower route felt like a beginner course; do not infer that answer from tier 1.
2. **Warnings:** On China and Paektu, ask whether the player noticed and understood the wind/rock warning before danger. On Seoul, ask whether the switch, opening window and closing gate were understandable. Record exact location and what the person saw/heard; use `not encountered` when appropriate.
3. **Camera:** Record any required landing, hazard or return path that was hidden before the player committed to it. Note unexpected camera movement, HUD obstruction and direction of travel. Separate an intentional optional challenge from an unseen mandatory landing.
4. **Checkpoints and recovery:** After activating a checkpoint, make one deliberate missed landing in a separate recovery attempt. Record respawn location, hearts, retained coins/stars and whether the route remains understandable. Label this controlled attempt separately from the first completion run.
5. **Rewards:** Record the observed coin/star counters and earned stars. Confirm a repeated contact does not award the same pickup twice. For the bonus route, try to collect all three stars and finish. Distinguish a missed pickup from a visible pickup that failed to award.
6. **Pause/discovery:** Pause once, wait, resume and check control/camera continuity. Close a discovery panel through the UI and continue. Record any confusing focus or input behavior.
7. **Mongolia seam:** At the start, river crossing and far bank, inspect the terrain join while walking and jumping. Confirm the pale slit is absent and the foreground does not hide a landing or make a non-walkable surface appear to be the required route.

After each session ask: “What was unclear?”, “Was any failure unexpected?” and “What felt too easy or too hard?” Record the person's words or a faithful summary, without filling in answers for them.

## Finding format

For each observed problem record: country and route; location/checkpoint; input and settings; steps; actual behavior; expected behavior; impact; whether it repeats. A facilitator may propose a fix only after recording the observation. A human report can be inconclusive; do not force a pass/fail result.

## Boundaries

- Live account-save and physical-phone checks stay pending. Emulated phone captures are visual layout evidence only.
- 60 FPS remains unverified until measured in a confirmed 60+ Hz browser environment. Do not repeat or relabel the earlier 30 Hz observations as a 60 FPS pass.
- Preserve the art, mechanics, collisions and calibrated tiers while collecting feedback.
- All release flags remain false, and the other 42 Asia countries remain proposed designs. Human sessions do not automatically release a country or start the next region.

## Findings received

None yet. All ten rows in the session sheet remain `NOT_RUN`; completion, warnings, camera, checkpoints and reward observations are unscored.
