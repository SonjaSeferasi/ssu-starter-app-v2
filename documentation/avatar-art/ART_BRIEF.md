# SocialU avatar art brief (v2: inclusive, layered)

## Current implementation (2026-10-22)

The four-sheet test batch and the full 24-sheet collection are generated and imported: **17 head styles, 4 tops and 3 pants styles**, with six painted variants each (**144 transparent pieces**).

- Source sheets: `public/avatars/v2/raw/` (magenta fallback backgrounds).
- Transparent runtime pieces and manifest: `public/avatars/v2/`.
- Measured neck/collar anchors, face scale and individual eye positions: `public/avatars/v2/overrides.json`.
- Built-in imagegen prompts: `documentation/avatar-art/GENERATION_PROMPTS.json`.
- Assembled review images: `output/avatar-art/hairstyles-1.png`, `hairstyles-2.png`, `hijabs.png`, and `outfits.png`.

Open Game Room and choose **Try the new avatar collection**. Existing saved avatars stay in the original collection until the user explicitly changes and saves their look. **Use original collection** switches back. The development-only preview is `/dev/game-room`; it never saves sample selections to an account.

The local database regression test verifies saving, reloading, ownership checks and returning to the original collection. Hosted Supabase still needs `supabase/migrations/20261018020000_avatar_layers.sql` if it has not already been applied. Generating/importing art does not apply a database migration.

The Game Room avatar is moving from one painted picture that the code recolors to **separate painted layers that stack**. Every color, skin tone and head covering is painted by the image generator, so nothing is recolored in code and colors stay exact.

## How the layers stack

| Order | Layer | One sheet holds | Visible skin? |
|---|---|---|---|
| 1 (back) | **Pants + shoes** | one pants style in 6 colors | none |
| 2 | **Top** | one top style in 6 colors | none (hands tucked into pockets or sleeves) |
| 3 (front) | **Head** | one hairstyle (or one hijab color) in 6 skin tones | face and neck only |

Because skin appears only on the head layer, any head works with any outfit.

## Rules for every sheet

These rules keep the layers lined up. Please keep them in every prompt.

- **Size:** 1536 × 1024 (landscape).
- **Grid:** 3 columns × 2 rows = 6 cells, all the same size. Each item is centered in its cell with empty space around it, and nothing crosses into another cell.
- **Background:** transparent. If the tool can't do transparent, use flat, pure magenta (#FF00FF) with no shadow, gradient or floor. Magenta is used because no clothing, skin or hair color is close to it, so the import step can remove it cleanly. Don't use white or gray: white sneakers would be erased with it.
- **Same in all 6 cells:** pose, size, camera angle and lighting. Only the skin tone (heads) or the color (clothes) changes.
- **Style** (matches the reference sheet): premium stylized 3D-painted character art, soft studio light from the upper left, friendly and natural, the same style across every sheet.
- **None of these:** text, logos, brand marks (for example, no sneaker logos), watermarks or extra people.
- **File names:** use the names in the tables below. Put the files in `public/avatars/v2/raw/`.

### Skin tone order (head sheets)

Always in this order, left to right, top row then bottom row:

1. very light (porcelain)  2. light  3. light-medium (olive)
4. medium (tan)  5. brown  6. deep brown

### Color palettes (clothes sheets)

Always in this order, left to right, top row then bottom row.

- **Tops:** navy #263B65, forest green #397359, burgundy #984654, cream #E8D5B5, lavender purple #8563AF, charcoal #333740
- **Pants:** light-wash denim #8AA9C9, dark-wash denim #2F4566, black #2B2D33, khaki #B39D76, olive #6E7B55, warm brown #7A5C48

After you import the art, the color buttons in the Game Room use colors sampled from the real images, so the buttons always match what you see.

## Test batch (generate these 4 first)

### 1. `head-long-waves.png`
> Character art sprite sheet, 1536×1024, 3 columns × 2 rows, transparent background. Six copies of the same young adult university student's head and neck. Long dark wavy hair past the shoulders, friendly closed-mouth smile, small gold hoop earrings, head turned very slightly to the viewer's left, eyes looking at the viewer. Each copy is identical except skin tone, in this order: very light porcelain, light, light-medium olive, medium tan, brown, deep brown. Show the head and neck only; the neck ends in a clean horizontal edge just above the collarbones, with no shoulders and no clothing. Same size, position, angle and lighting in every cell. Premium stylized 3D-painted character art, soft studio light from the upper left. No text, no logos, no watermark.

### 2. `head-hijab-black.png`
> Character art sprite sheet, 1536×1024, 3 columns × 2 rows, transparent background. Six copies of the same young adult university student wearing a neatly wrapped black jersey hijab that fully covers the hair, ears and neck and drapes softly onto the upper chest and shoulders. Face fully visible, friendly closed-mouth smile, head turned very slightly to the viewer's left, eyes looking at the viewer. Each copy is identical except skin tone, in this order: very light porcelain, light, light-medium olive, medium tan, brown, deep brown. Show the head and hijab only, no other clothing; the hijab drape ends in a soft rounded edge at upper-chest height. Same size, position, angle and lighting in every cell. Premium stylized 3D-painted character art, soft studio light from the upper left. Respectful, modest, natural. No text, no logos, no watermark.

### 3. `top-hoodie.png`
> Clothing sprite sheet, 1536×1024, 3 columns × 2 rows, transparent background. Six copies of the same relaxed-fit pullover hoodie worn by an invisible person (front view, standing straight, arms relaxed down with both hands tucked fully into the front pocket so no hands are visible). The hood lies flat behind the neck, and the neck opening is empty. Shoulders to hip length, with drawstrings. Each copy is identical except fabric color, in this order: navy #263B65, forest green #397359, burgundy #984654, cream #E8D5B5, lavender purple #8563AF, charcoal #333740. Soft cotton fleece texture. No head, no neck, no skin, no backpack, no logos or text. Same size, position and lighting in every cell. Premium stylized 3D-painted character art, soft studio light from the upper left.

### 4. `pants-straight-jeans.png`
> Clothing sprite sheet, 1536×1024, 3 columns × 2 rows, transparent background. Six copies of the same relaxed straight-leg trousers with plain white low-top sneakers, worn by an invisible person (front view, standing straight, feet slightly apart). Show from the waistband down to the shoes; the waistband is a clean horizontal edge. Each copy is identical except trouser color, in this order: light-wash denim #8AA9C9, dark-wash denim #2F4566, black #2B2D33, khaki #B39D76, olive #6E7B55, warm brown #7A5C48. No top, no skin, no logos on the sneakers, no text. Same size, position and lighting in every cell. Premium stylized 3D-painted character art, soft studio light from the upper left.

## Full set (after the test batch lines up)

Reuse the matching test prompt and change only the described item.

**Heads: hairstyles** (6 skin tones each)

| File | Hair |
|---|---|
| `head-short-waves.png` | short dark wavy hair |
| `head-curls.png` | full dark curls |
| `head-coils.png` | short natural coily hair / small afro |
| `head-locs.png` | shoulder-length locs |
| `head-fade.png` | short fade / crew cut |
| `head-long-waves.png` | long dark waves (test batch) |
| `head-ponytail.png` | high ponytail |
| `head-curly-bob.png` | curly chin-length bob |
| `head-bob-bangs.png` | straight black bob with bangs |
| `head-braids.png` | long box braids |
| `head-auburn-waves.png` | shoulder-length auburn waves |

**Heads: hijab** (6 skin tones each; change only the hijab color)

`head-hijab-black.png` (test batch), `head-hijab-navy.png`, `head-hijab-sage.png`, `head-hijab-dusty-rose.png`, `head-hijab-cream.png`, `head-hijab-burgundy.png`

**Tops** (6 colors each, using the top palette)

| File | Style |
|---|---|
| `top-hoodie.png` | pullover hoodie (test batch) |
| `top-crewneck.png` | crewneck sweatshirt |
| `top-zip-jacket.png` | zip jacket, open, over a plain white tee (jacket in the 6 colors) |
| `top-cardigan.png` | button cardigan, open, over a cream knit top (cardigan in the 6 colors) |

**Pants** (6 colors each, using the pants palette)

| File | Style |
|---|---|
| `pants-straight-jeans.png` | straight-leg (test batch) |
| `pants-wide-leg.png` | wide-leg |
| `pants-chinos.png` | slim chinos |

Total: 11 hair + 6 hijab + 4 tops + 3 pants = **24 images**.

## Importing the art

1. Put the sheets in `public/avatars/v2/raw/`.
2. Install the import tools once: `pip install pillow numpy`
3. Run: `python scripts/avatar_import.py`

The script cuts each sheet into 6 pieces, removes a magenta background if there is one, finds where each piece attaches (neck, collar, waistband), samples the painted colors, and writes `public/avatars/v2/manifest.json`. A valid manifest makes the new collection available in Game Room. Only explicitly selected layered looks use the new artwork in avatar previews, including Jumpyland. Existing saved avatars keep their current appearance.

The importer requires exactly 1536 x 1024 source sheets. It preserves existing alpha, removes only the specified magenta fallback and refuses opaque white/gray/painted backgrounds, protecting white shoes and light clothing.

Calibration may use `coordinateSpace: "cell"` to record coordinates in each original 512 x 512 cell. `cells` provides per-variant `anchor` and `eyes` overrides. Heads also have `faceWidth` to normalize face scale independently of hair volume; tops can override `size` and `hem`. The importer converts cell coordinates into the trimmed piece coordinates stored in the manifest.

**Glasses and freckles** need each head's eye positions. Open a cut head file (for example `public/avatars/v2/head-long-waves-1.png`), note the pixel position of the center of each eye, and add them to `public/avatars/v2/overrides.json`:

```json
{ "heads": { "long-waves": { "eyes": [66, 130, 122, 130] } } }
```

The values are left-eye x, left-eye y, right-eye x, right-eye y. Use one set if all 6 skin tones line up (they should), or a list of 6. Then run the import again. Heads without eye positions don't offer glasses or freckles.

**Database:** run `supabase/migrations/20261018020000_avatar_layers.sql` once, so the new options can be saved.

## What happens after you add images

1. An import step cuts each sheet into its 6 cells, trims the empty space, and records where each piece attaches: the neck for heads, the collar and hem for tops, the waistband for pants.
2. The Game Room stacks pants → top → head, using those attachment points.
3. The color and skin-tone buttons are built from the imported art.
