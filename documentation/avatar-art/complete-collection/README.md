# Complete campus avatars

18 coordinated full-body figures: six Male, six Female and six Hijab options. Each figure is a single generated illustration with its own face, clothing and shoes. Three transparent 3-by-2 atlases total 4,369,460 bytes (4.17 MiB). The browser downloads only the atlas groups it displays.

Artwork lives in `public/avatars/v3/`. The picker and previews use `lib/avatar-collection.ts`; existing saved avatars remain unchanged until the student explicitly chooses and saves a complete avatar. Each selection stores `avatarId` in the existing customization JSON. Original face and outfit ownership checks still apply. Apply `supabase/migrations/20261022020000_complete_avatars.sql` before deploying the picker.

Hosted rollout: applied on October 22, 2026. A transaction verified that all 10 existing avatar records were unchanged. A service-role save/readback of a complete avatar succeeded and was rolled back; no student's selected look was permanently altered. Browser preview checks cover all three groups and complete figure selection. Signed-in UI saving has not been exercised.

The new collection has no individual head, shirt or trouser controls. Jumpyland uses the same complete preview; themed costume replacement is disabled for these coordinated looks. Original collection avatars retain their existing controls and costumes.

Generated with the built-in image-generation tool. The three source prompts are recorded in `prompts.json`. Generated PNGs retain their original alpha and dimensions; SVG viewports select one complete figure without rewriting image pixels.
