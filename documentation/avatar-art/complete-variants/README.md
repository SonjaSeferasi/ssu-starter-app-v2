# Hair, face and outfit variants

The complete collection now has separate Hair, Face and Outfit sections. Each of the six outfits in the Male, Female and Hijab groups supports three hair/wrap choices and two face details (Natural and Round glasses): 108 complete painted figures. The original 18 ids remain valid and retain their original artwork.

Hair and Face selections retain the outfit. Outfit selections retain the selected hair/wrap and face-detail setting. Each outfit retains its illustrated base identity and skin tone; the Face section changes glasses, not facial anatomy or skin tone. These are complete figures, never heads attached to separate clothing layers.

The 18 transparent PNG atlases in `public/avatars/v4/` total 26,789,406 bytes (25.55 MiB). Previews share cached atlases. The picker requests only the sheets displayed by its current section. `scripts/avatar_atlas_metadata.cjs` reads alpha to locate transparent gaps and writes the viewport metadata in `lib/avatar-atlases.json`; it does not modify the image pixels.

Generation used the built-in image-generation tool and the original v3 sheets as references. All prompts are in `prompts.json`. Apply `supabase/migrations/20261022030000_avatar_variants.sql` before publishing: it extends the allowed ids while preserving old selections and all ownership checks in the existing RPC.

Verification includes every catalog combination, its file and dimensions, SQL save/readback for all 126 ids, invalid-id rejection, and account ownership isolation. Browser evidence covers the separate sections and retaining hair/glasses while changing outfits. Hosted checks use rollback transactions so student selections are not permanently changed.

Hosted rollout completed October 22, 2026: all 10 existing records passed the preservation check. Saving and reloading `campus-v4-female-4-2-glasses` through the service-role RPC succeeded, then the test transaction was rolled back. Signed-in UI saving was not exercised. The full local suite passed 660 tests.

## Skin and body choices

The editor also has **Skin** (As painted, plus 12 tones from Ivory to Deep) and **Body** (Slim, Average, Broad, Plus size) sections. These are not new paintings: `lib/avatar-figure.ts` adjusts the chosen figure's pixels in the browser, so the 108 figures need no extra artwork or downloads.

- **Body shape** widens or narrows each row of the figure below the neck about the torso's centre, easing in across the shoulders and partly back out at the shoes. The head is never scaled.
- **Skin colour** finds the face from its centre and grows through connected skin-coloured pixels, then moves them to the new tone in Lab space, keeping the painted shading. Blush and lips inside the face outline follow; eyebrows and lashes are darkened with a deeper tone; hands are matched strictly in the pocket band. Hijabs, hair and clothing (including khaki and cream) are left alone. Each swatch is the median face colour of the result.

`__tests__/avatar-figure.test.ts` runs both adjustments on all 108 painted figures. Thumbnails are processed at half resolution; results are cached as object URLs. Jumpyland captures the adjusted preview, and its 3D rig widens the body (not the head) to match.

Both choices are optional fields (`bodyShape`, `skinColor`) next to `avatarId`; the defaults are not stored. Apply `supabase/migrations/20261027000100_avatar_body_skin.sql` before publishing. Until then, saving a look with these choices shows the existing "needs its database update" message, and the preview is kept.
