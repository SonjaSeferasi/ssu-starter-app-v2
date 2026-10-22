"""Cut the layered avatar sheets into pieces and write the manifest the app reads.

Usage (needs Python 3 with Pillow and numpy: `pip install pillow numpy`):
    python scripts/avatar_import.py                    # public/avatars/v2/raw -> public/avatars/v2
    python scripts/avatar_import.py RAW_DIR OUT_DIR

Sheets follow documentation/avatar-art/ART_BRIEF.md: 1536x1024, 3 columns x 2 rows.
  head-<id>.png   6 skin tones   (anchor: neck base, or drape base for hijab)
  top-<id>.png    6 top colours  (anchor: collar; also records the hem)
  pants-<id>.png  6 pant colours (anchor: waistband)

Optional hand fixes live in OUT_DIR/overrides.json and survive re-imports, e.g.
  {"heads": {"long-waves": {"eyes": [[210, 180, 260, 182], ...one per cell or a single value...]}}}
Eye positions are pixels inside the cut head file. Without them, glasses and freckles
are not offered for that head.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

COLS, ROWS = 3, 2
PREFIX = {'head': 'heads', 'top': 'tops', 'pants': 'bottoms'}


def remove_flat_background(rgba):
    """Keep real alpha, or key only the brief's magenta (never white shoes)."""
    if rgba[..., 3].min() < 250:
        return rgba
    rgb = rgba[..., :3].astype(float)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    background = np.median(border, axis=0)
    if not (background[0] > 235 and background[1] < 25 and background[2] > 235):
        raise ValueError('Opaque sheet needs a flat #FF00FF background; white, gray and painted backgrounds are not safe to remove.')
    chroma = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    alpha = np.clip((230 - chroma) / 130, 0, 1)
    out = rgba.copy()
    # Unmatte partially keyed edges, so fine hair has no magenta fringe.
    keyed = alpha < 1
    clean = (rgb - (1 - alpha[..., None]) * background) / np.maximum(alpha[..., None], .001)
    out[..., :3][keyed] = np.clip(clean[keyed], 0, 255).astype(np.uint8)
    interior = alpha > .8
    eroded = interior.copy()
    for _ in range(3):
        padded = np.pad(eroded, 1, constant_values=False)
        eroded = padded[1:-1, 1:-1] & padded[:-2, 1:-1] & padded[2:, 1:-1] & padded[1:-1, :-2] & padded[1:-1, 2:]
    edge = (alpha > 0) & ~eroded
    colors = out[..., :3].astype(float)
    spill = np.maximum(0, np.minimum(colors[..., 0], colors[..., 2]) - colors[..., 1] - 8)
    for channel in (0, 2):
        colors[..., channel][edge] -= spill[edge]
    out[..., :3] = np.clip(colors, 0, 255).astype(np.uint8)
    out[..., 3] = (alpha * 255).astype(np.uint8)
    return out


def rows_with_ink(mask):
    return np.nonzero(mask.any(1))[0]


def run_width(mask_row):
    xs = np.nonzero(mask_row)[0]
    return (xs.min(), xs.max()) if len(xs) else None


def geometry(kind, sheet_id, mask):
    h, w = mask.shape
    ys = rows_with_ink(mask)
    top, bottom = int(ys.min()), int(ys.max())
    if kind == 'head':
        if sheet_id.startswith('hijab'):
            row = top + int((bottom - top) * 0.4)
            a, b = run_width(mask[row])
            return {'anchor': [round((a + b) / 2, 1), bottom], 'size': int(b - a)}
        widths, centres = [], []
        for y in range(max(top, bottom - 8), bottom + 1):
            span = run_width(mask[y])
            if span:
                widths.append(span[1] - span[0]); centres.append((span[0] + span[1]) / 2)
        return {'anchor': [round(float(np.median(centres)), 1), bottom], 'size': int(np.median(widths))}
    if kind == 'top':
        centres = [sum(run_width(mask[y])) / 2 for y in range(top, min(bottom, top + 6)) if run_width(mask[y])]
        shoulders = max((lambda s: s[1] - s[0])(run_width(mask[y])) for y in range(top, top + int((bottom - top) * 0.3)) if run_width(mask[y]))
        return {'anchor': [round(float(np.mean(centres)), 1), top], 'size': int(shoulders), 'hem': bottom}
    widths, centres = [], []
    for y in range(top, min(bottom, top + 6)):
        span = run_width(mask[y])
        if span:
            widths.append(span[1] - span[0]); centres.append((span[0] + span[1]) / 2)
    return {'anchor': [round(float(np.mean(centres)), 1), top], 'size': int(np.median(widths))}


def sample(cell, box):
    h, w = cell.shape[:2]
    x0, x1, y0, y1 = int(w * box[0]), int(w * box[1]), int(h * box[2]), int(h * box[3])
    region = cell[y0:y1, x0:x1]
    pixels = region[region[..., 3] > 200][:, :3]
    if not len(pixels):
        return None
    r, g, b = np.median(pixels, axis=0).astype(int)
    return f'#{r:02x}{g:02x}{b:02x}'


def main():
    root = Path(__file__).resolve().parent.parent
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'public/avatars/v2/raw'
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else root / 'public/avatars/v2'
    url_base = '/' + out.relative_to(root / 'public').as_posix() if (root / 'public') in out.resolve().parents else '/avatars/v2'
    out.mkdir(parents=True, exist_ok=True)
    overrides_path = out / 'overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    manifest = {'version': 1, 'heads': {}, 'tops': {}, 'bottoms': {}}
    skin = None
    for path in sorted(raw.glob('*.png')):
        kind, _, sheet_id = path.stem.partition('-')
        if kind not in PREFIX or not sheet_id:
            print(f'skip {path.name} (expected head-*, top-* or pants-*)'); continue
        sheet = remove_flat_background(np.asarray(Image.open(path).convert('RGBA')))
        H, W = sheet.shape[:2]
        if (W, H) != (1536, 1024):
            raise ValueError(f'{path.name}: expected 1536x1024 (3 columns x 2 rows), got {W}x{H}')
        cells = []
        for index in range(COLS * ROWS):
            r, c = divmod(index, COLS)
            cell = sheet[r * H // ROWS:(r + 1) * H // ROWS, c * W // COLS:(c + 1) * W // COLS]
            mask = cell[..., 3] > 128
            if not mask.any():
                print(f'  {path.name}: cell {index + 1} is empty'); cells.append(None); continue
            ys, xs = np.nonzero(cell[..., 3] > 20)
            pad = 4
            y0, y1 = max(0, ys.min() - pad), min(cell.shape[0], ys.max() + pad + 1)
            x0, x1 = max(0, xs.min() - pad), min(cell.shape[1], xs.max() + pad + 1)
            piece = cell[y0:y1, x0:x1]
            name = f'{kind}-{sheet_id}-{index + 1}.png'
            Image.fromarray(piece).save(out / name, optimize=True)
            info = {'file': f'{url_base}/{name}', 'width': int(piece.shape[1]), 'height': int(piece.shape[0])}
            info.update(geometry(kind, sheet_id, piece[..., 3] > 128))
            setting = overrides.get(PREFIX[kind], {}).get(sheet_id, {})
            per_cell = setting.get('cells', [])
            calibrated = {**setting, **(per_cell[index] if index < len(per_cell) else {})}
            for field in ('anchor', 'size', 'hem', 'faceWidth'):
                if field in calibrated:
                    info[field] = calibrated[field]
            eyes = calibrated.get('eyes')
            if eyes and isinstance(eyes[0], list):
                eyes = eyes[index]
            if kind == 'head':
                info['eyes'] = eyes or None
            if calibrated.get('coordinateSpace') == 'cell':
                if 'anchor' in calibrated:
                    info['anchor'] = [info['anchor'][0] - int(x0), info['anchor'][1] - int(y0)]
                if 'hem' in calibrated:
                    info['hem'] -= int(y0)
                if info.get('eyes'):
                    info['eyes'] = [n - (int(x0) if j % 2 == 0 else int(y0)) for j, n in enumerate(info['eyes'])]
            if info['size'] <= 0 or info.get('faceWidth', 1) <= 0:
                raise ValueError(f'{path.name}: cell {index + 1} has an invalid attachment width')
            if kind == 'top':
                info['color'] = sample(piece, (0.35, 0.65, 0.35, 0.7))
            elif kind == 'pants':
                info['color'] = sample(piece, (0.25, 0.75, 0.1, 0.4))
            cells.append(info)
        if kind == 'head':
            if skin is None and not sheet_id.startswith('hijab'):
                skin = [sample(np.asarray(Image.open(out / Path(info['file']).name)), (0.4, 0.6, 0.5, 0.62)) if info else None for info in cells]
        if any(cell is None for cell in cells):
            print(f'  {path.name}: skipped, every sheet needs all 6 cells'); continue
        manifest[PREFIX[kind]][sheet_id] = cells
        print(f'ok {path.name}')
    if skin and all(skin):
        manifest['skin'] = skin
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print(f'wrote {out / "manifest.json"}: {len(manifest["heads"])} heads, {len(manifest["tops"])} tops, {len(manifest["bottoms"])} pants')


if __name__ == '__main__':
    main()
