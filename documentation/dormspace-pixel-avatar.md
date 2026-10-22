# Saved Game Room avatar in DormSpace

DormSpace loads the signed-in player's saved appearance from the existing authenticated `/api/game-room` route. Account-specific face/outfit IDs are resolved through the returned asset keys. The same look appears in the hall, the player's dorm, and friends' dorms, including walking, running, sitting and sleeping in all furniture orientations. Unsaved Game Room previews never transfer.

The Game Room route explicitly disables upstream fetch caching. Without this, the installed Next.js version could serve an earlier account RPC response after a successful save. No database migration, new ownership grant or avatar storage format is needed.

## Pixel pieces

`components/dormspace/avatar-pieces.ts` draws transparent, aligned 24×44 pixel layers using the existing native pixel painter. These are original pixel drawings, rather than filters or reduced photographs. Layers are hair behind the body, exposed skin, pants, shoes, shirt, backpack, head, front hair, and face details. The head shown above the sleeping quilt uses the same saved hair and face details, with closed eyes.

Supported Game Room choices:

- Male/female presentation as selected through the Game Room hairstyle catalog.
- Short waves, full curls, crew cut, side part, locs, long waves, high ponytail and curly bob. The legacy waves-with-glasses face maps to short waves and square glasses unless an explicit face detail overrides it.
- Campus hoodie, Study day sweater and Weekend sweater, when those outfits are available to the account.
- Natural, round glasses, square glasses, freckles and glasses with freckles.
- All six shirt colors and all six pants colors. Shirts and pants tint independently; hair and skin are preserved.

The runtime composes pieces once per appearance and retains at most 64 appearances. Walking uses cached image frames with the existing CSS cadence; sitting and sleeping compose the same pieces with furniture foreground occlusion. Resting sprite caches are weakly keyed by the avatar sprite set so one player's clothes cannot leak into another player's pose. The original 1.5× running speed and movement/collision geometry are unchanged.

## Loading and compatibility

A returning browser tab reloads the saved appearance without resetting the room or rest pose. Failed reads keep the last loaded appearance, or an explicit default on initial failure, with a retry button. Loading does not write the player's appearance. A missing avatar uses the catalog's initial face and first available outfit with the same legacy color defaults as Game Room. Unsupported future asset keys and saved photo faces display a notice and retain supported clothing/details with default pixel pieces. Photo faces have no selectable preview in the existing Game Room UI and no pixel conversion is introduced here.

## Sprite exports and verification

`scripts/tests/dormspace-avatar.browser.ts` exports 73 transparent individual PNG/SVG sheets, a JSON cell manifest, and reference sheets for every option and rotated resting pose. Each piece sheet has four rows (down, up, left, right) and five columns (walk frame 0, walk frame 1, sit frame 0, sit frame 1, sleeping head). Pieces share the same origin and layer order. Clothing is covered by the bed quilt while sleeping, so sleeping clothing cells are transparent. Runtime sprites remain code-native and use the same drawing source as the exports.

Run `npm test` for the unit/API/database suite. Run the browser checks with `node_modules/.bin/vitest run --config vitest.dormspace-avatar.config.ts`, setting `SOCIALU_PLAYWRIGHT_MODULE` and `DORMSPACE_BROWSER_EXECUTABLE` for the local Playwright installation and Chrome executable. Browser tests use a disposable PostgreSQL-compatible database and local Auth/Storage/PostgREST transport; no hosted account is changed. Extra Study day/Weekend ownership is confined to these test fixtures. Exported assets go to `tmp/dormspace-pixel-avatar` or `DORMSPACE_EVIDENCE_DIR`.
