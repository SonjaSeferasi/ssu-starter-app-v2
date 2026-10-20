# DormSpace — modern campus rebuild

The previous DormSpace implementation is preserved in `components/dormspace-classic` and at `/game-room/dormspace/classic`. The current page links to it through **Compare original**. Both versions read the same saved arrangement and appearance, so the visual comparison uses the same account data. The original source and staged/unstaged diffs were also archived before this rebuild. No layout, avatar, friendship, ownership or points data is migrated or reset.

## What changed

The campus edition replaces the 24-pixel furniture and two-frame avatar presentation with raster furniture atlases, 64-pixel room tiles and 96×128 logical avatar canvases. Visible canvases use a 2× backing store and disable image smoothing. Room floor cells use a 0.65 vertical projection; movement compensates for it so horizontal and vertical screen distances stay consistent. Logical tile positions, collisions, doorway reservations, server validation and placement rotations remain the existing ones. Running remains 1.5× walking speed.

Furniture is newly generated modern-campus artwork with oak, teal, ivory and sage materials, a laptop desk, contemporary seats, bookcases, wardrobe, side tables, plant, rug and campus-view windows. Beds have a separate four-direction atlas so sleepers use the pillow end in every orientation. Atlas crop metadata defines each silhouette; Canvas bounds follow the existing collision footprint, but the visible furniture is scaled against the original player model. Every view uses one calibrated furniture height and preserves its source aspect ratio; rotating no longer stretches a sofa upward or changes an armchair’s size. Rugs rotate on the projected floor plane. Seats include transparent headroom, fitted pose anchors and furniture foreground occlusion. Sleeping keeps the saved head, glasses and hair above the duvet, closes the eyes and retains the existing breathing/nighttime interaction.

Avatar artwork uses the Universal LPC Spritesheet Character Generator's modular character layers: both body presentations, human heads, eight mapped hairstyles, shirts, pants, shoes and glasses. Nine-frame walk, eight-frame run and three-frame sit sources are included. Saved Game Room IDs still resolve through their account catalog asset keys; independent shirt/pants colors, face details and outfit choices carry over. Hair, glasses, freckles and clothing details compose separately. The existing explicit notice remains for legacy photo faces or unknown future asset keys.

Canvas rendering caches complete frames and tint layers. Movement still updates transforms outside React. Resting uses the cached two-frame composite strip. Image, tint and composition failures are tracked, and rejected image/composition promises are removed from caches so later mounts can retry.

## Art tools and source files

- The built-in image-generation tool produced the furniture and bed atlases. Prompts are saved in `public/dormspace/campus/generation-prompts.json`; these PNGs are the selected project assets.
- [Universal LPC Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) supplies consistent animated avatar layers. The 72 original PNG layers, SHA-256 provenance manifest, per-file credit CSV and selected-license JSON ship in `public/dormspace/campus/lpc`. Runtime color/clothing adaptations retain the corresponding source license. The in-game **Art credits** link lists all artists, licenses and original source links.
- [Aseprite's layered sprite-sheet and CLI workflow](https://www.aseprite.org/docs/cli/) was researched for future art editing. Aseprite is not installed or purchased by this change.
- [PixiJS](https://pixijs.com/8.x/guides/components/application/resize-plugin) was evaluated for rendering. The implementation uses native browser canvases and adds no rendering dependency.
- Canvas image smoothing follows [MDN's pixel-art guidance](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled).

The art studio at `/dev/dormspace-art` previews every furniture view, avatar option and resting pose without editing account data. It is a development gallery, like the existing `/dev/game-room` page.

## Verification

Run `npm test` for the repository suite. Run `node_modules/.bin/vitest run --config vitest.dormspace-campus.config.ts` with the configured local Playwright module and Chrome executable for browser checks. The browser harness uses a disposable PostgreSQL-compatible database and local provider transport; it never writes hosted account data. It checks visual references, the original comparison route, all rotated rest actions, clothing persistence, decorating, guestbook access, entry-strip collision, mobile visits, art attribution and a furnished-room performance sample with 4× CPU slowdown. Screenshots go to `tmp/dormspace-campus`.

## Furniture proportions and interaction directions

The standing player keeps its original 140% room frame and 125% hallway frame. Furniture is resized around that player: chairs stay below standing height, beds fit the character, and desks/armchairs no longer grow to fill an entire logical footprint. Placement positions, server collision footprints, saved layouts and the preserved classic page are unchanged. Narrow-seat pose placement keeps hands and shoes inside the frame without shrinking the character.

`campus-furniture.ts` defines the physical artwork dimensions separately from collision cells. Side-view seats at 90° show the backrest on the left, so their avatar faces right; 270° seats face left. Front and back remain down and up. Tests cover preserved image proportions and stable furniture height in every rotation, the original avatar sizing, all 16 furniture interactions, mobile visits and clear-floor collisions.
