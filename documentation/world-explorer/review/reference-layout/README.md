# Japan — reference-layout revision

This revision follows the supplied **Exact Visual Layout, 3D Platform Design,
Enemy Behavior, and Gameplay Implementation** brief and its Japan screenshot.
Earlier review and Sprint 2 evidence is preserved separately.

The opening is composed around a broad grassy left cliff and overhanging pink
canopy, a torii and lantern, a long lower suspension bridge, ascending optional
rock terraces and a glowing star. Fuji is centered above the valley, with the
dominant pagoda farther right. Large repeated terrace rows and the flat green
backdrop strips have been removed. Woodland and cliff greenery is attached to
actual terrain surfaces.

The HUD uses the wooden country banner and flag, a portrait/star/destination
progress ribbon, live counters and large circular movement/jump controls.

The 107-unit authored course has 15 platforms, two moving ledges, 30 coins, three
stars and two safe checkpoints. Input-driven tests finish the main route without
using the upper branch; another route collects all three stars and finishes.
The 1.83-unit player model and collider use the same height. The original small
hooded enemy patrols within its platform and causes damage/checkpoint respawn.
The beveled discovery block responds only to a first underside hit; its fact
dialog waits for a safe landing. The enemy remains active after respawning.

## Captures

- `japan-gameplay.png`: actual production build, normal opening camera.
- `japan-overview.png`: actual full-course overview, simulation paused.

Only browser chrome and window borders are cropped. No gameplay pixels are
painted, generated or retouched. These images are review evidence, not an art
acceptance sign-off. The scene remains stylized and still differs from the
reference's rendered detail, lighting and vegetation. Real-device mobile testing
and sustained performance validation remain pending. Other countries keep their
preview status until their own scenery and gameplay receive equivalent work.

Validation: **789 tests in 87 files passed**, with the production build and
TypeScript checks passing. After the final starting-position adjustment, all 21 targeted route, simulation and vista tests passed again. Browser sampling reached roughly
82 to 104 FPS at the opening view; this is not a sustained device benchmark.
