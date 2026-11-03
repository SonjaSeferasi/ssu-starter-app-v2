# World Explorer stabilization pass (2026-11-03)

New features are paused. This pass fixes known failures across all 193 countries and re-runs one checklist on a single fixed review snapshot, so edits made during testing cannot change the results. Every country stays at **TESTING**.

This note is for every team working in this tree. Please read the "Requests to other teams" section before your next edit.

## Fixed review snapshot

- The whole working tree (tracked and untracked files, `.gitignore` respected) is staged into a private temporary git index. Its tree hash is the snapshot ID. Your own index, branch and files are not touched, and no commit is made.
- The tree is exported to a scratch folder, which is built and tested there.
- Every result in `review/acceptance-all/` from this pass names the snapshot it came from. A later edit in the working tree does not change those results; it needs a new snapshot.

## Decisions by the project owner

- **Difficulty distribution: the original 39/39/39/38/38 quota stays the target.** The tier test in `__tests__/world-explorer-level-design.test.ts` is unchanged. This pass changes no level's tier.
- A `tierTarget` constant appeared in `lib/world-explorer/design-manifest.ts` for a few minutes, between about 09:40 and 09:47. It recorded the built tiers while the owner's first answer stood. The owner then chose the quota, and the constant was removed.
  - The Africa batch's 09:55 rewrite and `AFRICA.md` (09:58–10:03) cite that removed `tierTarget` as the owner's choice. **That reference is out of date.**
  - With the Africa levels back at their blockout tiers, the 193 levels measure T1 32, T2 56, T3 47, T4 28, T5 30. The quota test fails until levels are re-tiered to the quota.
  - Before the rewrite, the Africa re-tier had reached 37/42/38/38/38, three levels from the quota.

## What this pass changed, and why

| Area | File | Change | Reason |
| --- | --- | --- | --- |
| Route bot | `lib/world-explorer/level-analysis.ts` | A coin-collecting running jump must land and then stay safe for 14 frames, like the other jumps. | Brazil (main, 0 s): the bot landed beside the turning seed-pod patrol and was hit on the next frame. |
| Route bot | same | A retreat from a timed hazard goes to the side the look-ahead proves safe. | Mozambique (bonus, 3.6 s): the bot always retreated left, into the wave behind it. |
| Route bot | same | A run-up step back happens only over ground the look-ahead proves safe. | DR Congo (main, 1.8 s): the bot backed into the geyser behind it. |
| Acceptance | `lib/world-explorer/collectible-acceptance.ts` | Japan's `jp-descent` added to the existing one-second step-back table (the method already used for Argentina). | jp-coin-13: the jump down from the star terrace lands past the coin on a 1.7 m ledge. A player steps back for it. |
| Level (Africa batch) | `lib/world-explorer/levels/africa/sle.ts` | Second checkpoint moved from offset 1.5 to 0.5 on `sl-boulder-3`. | It sat past the point where every route jumps on, so no player reached it. **Your 09:55 rewrite undid this; it has been re-applied.** |
| Phone HUD | `components/world-explorer/world-explorer.module.css` | A final phone-only block sets an 11 px floor for run, dialog and country-card text. A rule for every viewport gives text buttons in dialogs a 36 px minimum height ("Restore defaults" measured 27 px, also on tablet). | Earlier regional rules set 6–9 px. No other rule was edited. |
| Photo credits | same | One rule for every viewport keeps the guide's photo credit (title, author, licence) at 10 px or more. | It measured 8 px on laptop and tablet. |
| Guide photos | `lib/world-explorer/media.ts` | Public-domain files are accepted when credited (Artist, or Credit for agencies), with the Commons file page as the licence link. | These files carry no licence URL, so they were always rejected. |
| Guide photos | same | Busy answers are retried: HTTP 429/503, `maxlag` and `cirrussearch-too-busy-error`, up to twice, honouring `Retry-After`. | Rate limits were reported as "no photo". |
| Guide photos | same | Lookups are paced to at most four a second. | Avoids bursts that trigger rate limits. |
| Guide photos | same | A busy or failed lookup is cached for 2 minutes instead of an hour. The API route sends `max-age=120` when there is no photo. | A later visit retries instead of reusing the failure. |
| Guide photos | `lib/world-explorer/verified-photos.json`, `guide-destination.ts`, `media.ts` | 39 photos are pinned by Commons file title. Each pin's aliases are added to the destination's own aliases. | Each pinned image was viewed and its title or description checked. The `why` field says how its name relates to the destination. A pinned file is fetched by title, so search ranking cannot change it, and it still passes the licence and attribution checks. |
| Type error (Africa batch line) | `lib/world-explorer/guide-destination.ts` | `photoAliases:(africa as {photoAliases?:string[]}).photoAliases`. | `africaPlaces` is an untyped literal, so `africa.photoAliases` failed `tsc` and would fail the production build. |
| Tests | `__tests__/world-explorer-level-design.test.ts` | The card test checks that every member state's card opens; a code outside the catalogue stays under development. | Nauru was the "unbuilt" example. All 193 are now built. |
| Tests | same | The template-similarity test uses the original six templates minus those since redesigned (Canada, United States). | Redesigned levels are no longer templates. |
| Tests | `__tests__/world-explorer-districts.test.ts` | The budget test runs over current profiles plus the original `profiles.json` fixtures, so every district family is still built. It also checks that at least 15 current destinations draw a district (17 today). | This uses the same fixture method already in the file. |
| Tests | `__tests__/world-explorer-country-environments.test.ts` | Registry timeout raised from 30 s to 120 s. | It imports all 193 environments in turn: about 9 s alone, over 30 s under the full suite. |
| Tests | `__tests__/world-explorer-media.test.ts` | New coverage: public-domain acceptance and refusal, retry when busy, and pinned-file lookup for every pin. | Covers the media changes above. |
| Checks | `scripts/world-explorer/layout-check.mjs` | Adds the level heading (not clipped), counters and hearts, 44 px touch targets, and the Country guide and pause dialogs, in every viewport. | Requested coverage. |
| Checks | `scripts/world-explorer/destination-check.mjs` | A photo name check also passes when the guide shows exactly the pinned file. The result names the pin's reason. | |

Copies of every shared file as it was before this pass are kept outside the repository by the reviewing session. Ask if you need one.

## Requests to other teams

1. **Africa batch.**
   - Keep the `sl-boulder-3` checkpoint at offset 0.5. The level flaw exists at both tiers.
   - Your generator should not overwrite it.
   - Correct the difficulty note in `AFRICA.md`: the owner's decision is the 39/39/39/38/38 quota.
2. **Any team editing `guide-destination.ts` or `media.ts`:** keep the pinned-photo path. A destination with a pin is fetched by file title.
3. **New guide photos:** add a pin only after looking at the image. Write the reason in `why`. Never pin a photo that only shares a word with the place.

## Still open (not fixed in this pass)

- The difficulty distribution against the quota (see above).
- Late-texture upload stalls. A texture arriving after loading still costs one 70–115 ms frame (`review/south-america/shader-prep/README.md`). It stays under investigation.
- Level-similarity pairs flagged at 0.72 or above stay open for design review.
- Human checks for every country: desktop play, physical-phone testing, live account saving, source review and visual approval. These are not performed.
