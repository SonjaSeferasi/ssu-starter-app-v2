# Japan visual and gameplay correction

This iteration applies the supplied correction brief to the existing Three.js game.

## Code and asset changes

- `game-camera.ts` and `country-scene.ts`: closer player framing (9–12% projected viewport height), left-third look-ahead, a jump dead zone, eased climb tracking, and a separate full-course camera.
- `japan-terrain.ts`: original closed fractured island shells, asymmetric tapered undersides, compact visible depth independent of stable colliders, safe broad caps and fewer repeated decoration meshes. The thin first bonus ledge preserves lower-route headroom. Scenic banks retain their separate depth.
- `platform-surface.ts`, simulation and wooden deck: one shared 0.22-unit sag curve for bridge collision and actual sloped planks, ropes and posts. The raised bridge connects to the lower exit and checkpoint.
- Japan manifest and patrol rendering: safe lower and ascending optional routes, a 1.25-unit original red warden with a stationary TURN interval, aligned visual/collision size, and deliberate collectible lines and jump arcs.
- `japan-water.ts`, environment and vista: original GPU flowing water ribbons using one shared 256² cached noise map, feeder channels, foam, mist, noise ripples, three scenic depth bands, distant ridged Fuji, soft cloud alpha assets, and a smaller background pagoda. Ray tests keep three temple tiers free of scenic occluders.
- Preferences and HUD: smaller desktop banner and counters; large controls appear automatically on touch devices or through an explicit setting. Statistics and overview are behind Developer view (or the explicit review URL).

The new geometry and small procedural textures are code-native original assets. Existing local CC0 rock maps are reused. No generated full-scene backdrop, new paid service or new package was introduced. Previous screenshots and Sprint 2 evidence remain separate.

## Verification

- Complete bounded-worker suite before the final water-cache patch: **926 tests / 92 files passed**.
- Production build, including TypeScript: passed after final scenic correction.
- Input-driven runs at all four difficulty settings finish both routes with three hearts and visit every main/bonus route platform.
- All 30 coin IDs are reachable across separate complete main/bonus runs; all three stars are reached on the bonus run. This is not a claim that one forward run follows both branches.
- Tests cover one-time collectible awards, block underside reward and safe landing, both checkpoints, damage, invulnerability, respawn, bounded patrol/turning and jumping over the enemy.
- Dense real Three.js raycasts verify plank/collider agreement before and after batching/dressing, lower-route overhead clearance and full-width island landing surfaces.
- Projected camera tests cover portrait and landscape aspect ratios. These are geometry checks, not real-device mobile validation.
- Sixteen focused environment/vista/water tests passed after the final ridge/river and cached-noise changes.

Browser review confirmed that the normal desktop view hides touch/debug overlays, and the pause/settings/Developer view flow exposes the overview. Before the final cached-noise optimization, an opening-view sample showed about **384,462 rendered triangles and 367 draw calls**, versus the earlier roughly 660,000 triangles. A single live sample in this session showed **21–22 FPS**; the 60-FPS desktop target is **not established**. After caching noise and enabling single-pass sheets, another opening sample showed **382,184 triangles / 363 draws / 23 FPS**. This does not establish the 60-FPS target. No same-condition sustained comparison or representative mobile benchmark was performed.

## Captures and remaining review

`japan-gameplay.png` and `japan-overview.png` show the actual local production build. Browser chrome is cropped; gameplay pixels are not painted or retouched. The overview pauses gameplay intentionally.

The scene is still a stylized procedural interpretation of the cinematic reference. Real-device mobile controls/performance and sustained representative hardware benchmarking remain unverified. Tests, a successful build and screenshots do not establish an exact art match or production release approval.
