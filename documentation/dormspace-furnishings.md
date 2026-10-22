# Included DormSpace furniture

The October 19 collection adds eight free items to each dorm owner's decorating inventory:

| Item | Floor footprint | Behavior |
| --- | --- | --- |
| Sofa | 3 × 2 | Sit by clicking/tapping or pressing E nearby |
| Armchair | 2 × 1 | Sit by clicking/tapping or pressing E nearby |
| Bookshelf | 2 × 1 | Storage decoration; blocks walking |
| Wardrobe | 2 × 1 | Storage decoration; blocks walking |
| Coffee table | 2 × 1 | Blocks walking |
| Nightstand | 1 × 1 | Blocks walking |
| Plant | 1 × 1 | Blocks walking |
| Rug | 3 × 2 | Walkable; fits underneath floor furniture |

Use **Decorate** to place inventory items. Select covered items through **Placed furniture** to move or return them. E, the interaction button, or moving stands up from a seat. The existing bed, chair, window and desk continue to work.

## Database setup

Apply `supabase/migrations/20261020013144_dormspace_furnishings.sql` to the same Supabase project used by the local app, after the existing DormSpace and starter ownership migrations. Frontend changes alone do not add items to the hosted catalog or ownership records.

The migration adds catalog entries, footprints and explicit rug overlap pairs, grants the collection to existing dorm owners, and installs an internal trigger for future dorm creation. It preserves room placements, appearances, save versions and point transactions. It can be rerun safely and does not expose a public grant endpoint. Its brief transaction locks accounts before rooms to avoid deadlocks with concurrent dorm saves.

## Verification

`npm test` covers ownership backfill, future owners, reruns, saved layouts, placement validation, visitor access, collision rules and seat interactions. `npm run build` checks the production bundle.

`scripts/tests/dormspace-furnishings.browser.ts` tests the real local UI/API against an isolated PostgreSQL database. Run it with `npx vitest run --config vitest.dormspace-furnishings.config.ts`. Set `SOCIALU_PLAYWRIGHT_MODULE` to an installed Playwright module and `DORMSPACE_BROWSER_EXECUTABLE` to Chrome when no bundled browser is available. The browser suite uses synthetic accounts and never modifies hosted Supabase data.
