# Collectible acceptance at runtime difficulty

The game plays each built level at the difficulty its own data names (`authoredDifficulty`), not at difficulty 1. For South America:

- difficulty 1: Bolivia, Uruguay, Guyana, Paraguay, Suriname
- difficulty 2: Brazil, Argentina, Ecuador (patrols 10% faster)
- difficulty 3: Peru, Chile, Colombia, Venezuela (patrols 20% faster)

For route-graph levels a higher difficulty only speeds up patrols; no jump changes.

## The acceptance test

`lib/world-explorer/collectible-acceptance.ts`, used by `__tests__/world-explorer-south-america.test.ts` and by the report script, plays each level at its runtime difficulty:

- on the main route (collecting coins) and the bonus route (collecting coins and stars)
- at start delays of 0, 1.8 and 3.6 s; a delay shifts every patrol, gust and hazard phase

It requires that:

- every run finishes
- runs without damage, taken together, collect every coin and all three stars
- each route has at least one run without damage

One coin is reached by stepping back after a jump, which the forward-moving bot does not do on its own. Argentina's `ar-coin-20` is played with a one-second step back on `ar-moraine` (`stepBack` in the module). The zero-damage critical-route test now also runs at each level's runtime difficulty, in addition to 1, 2 and 4.

**Result:** all 12 countries pass (24 tests).

## Stage A findings

Data: `patrol-timings.json`, from `scripts/world-explorer/patrol-timings.run.ts`.

### Venezuela: `ve-coin-01` at difficulty 3

The coin sits just past the summit toad's patrol (offsets 9–12.6 on `ve-summit`, coin at 14.4). At difficulty 3 the toad moves at 1.44 instead of 1.2. Over 16 start timings spanning one full patrol cycle (5.8 s), the bot collects the coin with no damage in 11 of 16 timings on each route. When it misses, it has jumped the toad from further back and carried past the coin. **The coin is reachable at difficulty 3. No change is needed.**

### Brazil: the far-bank coin detour at difficulty 2

The seed pod patrols offsets 5.5–10.5 on `br-far-bank`. `br-coin-19` hangs at height 2.2 above its path and is meant to be taken by jumping over the pod.

Over 32 start timings across one patrol cycle (9.1 s), on the main route:

| | Collecting coins | Without the coin detour |
| --- | --- | --- |
| Difficulty 1 | 0 hits | 0 hits |
| Difficulty 2 (runtime) | 2 hits (both at x 86.67, mid-patrol) | 0 hits |

The bonus route takes no hits at any timing.

The frames before a hit show what goes wrong:

1. The bot jumps from x 81 while the pod, at x 86.4, walks right.
2. In mid-air the pod notices the player, stops and turns (its alert pause).
3. The pod walks on, and the bot lands 0.76 behind it, then reverses into it while still sliding.

A player sees the pause and can jump over the pod to the coin, and 30 of 32 timings are clean for the bot as well. **This is a bot timing miss, not an unfair section. The mechanics were left unchanged.**

## Stage B and C findings (not addressed: Stage B has not started)

From an eight-timing sweep (0–6.3 s) of all twelve countries at runtime difficulty (`timing-sweep.json`):

- **Guyana (difficulty 1).** At a 3.4 s start delay the bonus route fails: three falls at x 81.4 into the gorge. The bot lands on the slick spray ledge `gy-ledge-3` during a falls gust and stops to jump for the star there. Ice and the gust slide it off the edge, and it never jumps. The main route crosses the same ledge at the same timing without damage. At 4.5 s the bonus route takes one hit. This is worth a design look when Guyana's Stage B work starts: a star on a narrow ice ledge in a gust zone, in a tier 2 level.
- **Ecuador (difficulty 2).** At 2.7 s the critical route takes one hit.
- **Suriname (difficulty 1).** At 1.7 s the main route takes one hit (on `sr-market`).
- **Argentina (difficulty 2).** `ar-coin-20` needs a step back (see above).

None of these stop a level from being finished, and each passes the acceptance test. They are tracked in `SOUTH-AMERICA.md` for Stage B.
