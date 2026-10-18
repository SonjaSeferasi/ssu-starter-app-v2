// Runtime cutout animation: every frame comes from the saved AvatarPreview image.
// No replacement face, outfit, or skin palette is introduced by the game.
export const AVATAR_FRAME_WIDTH = 256;
export const AVATAR_FRAME_HEIGHT = 384;
export const RUN_FRAMES = 8;
export const JUMP_FRAME = 9;
export const FALL_FRAME = 10;

export async function animateAvatar(source: string): Promise<string> {
  const image = new Image(); image.src = source; await image.decode();
  const base = document.createElement('canvas'); base.width = 256; base.height = 384;
  const ctx = base.getContext('2d');
  if (!ctx) throw new Error('Character animation is unavailable.');
  ctx.drawImage(image, 0, 0, 256, 384);
  const pixels = ctx.getImageData(0, 0, 256, 384).data;
  let left = 256, right = 0, top = 384, bottom = 0;
  for (let y = 0; y < 384; y++) for (let x = 0; x < 256; x++) {
    if (pixels[(y * 256 + x) * 4 + 3] > 32) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  if (left >= right || top >= bottom) throw new Error('The saved avatar image is empty.');
  // Common feet baseline across all hairstyles and body presets.
  const scale = Math.min(206 / (right - left + 1), 360 / (bottom - top + 1));
  const width = (right - left + 1) * scale, height = (bottom - top + 1) * scale;
  ctx.clearRect(0, 0, 256, 384);
  ctx.drawImage(image, left, top, right - left + 1, bottom - top + 1, 128 - width / 2, 370 - height, width, height);
  const sheet = document.createElement('canvas'); sheet.width = 256 * 11; sheet.height = 384;
  const out = sheet.getContext('2d'); if (!out) throw new Error('Character animation is unavailable.');
  const hip = 224, knee = 296;
  // Split at the trouser gap. The saved artwork's transparent pixels keep the
  // original fabric outline and shoes instead of drawing generic replacement legs.
  const leg = (side: number, angle: number, bend: number) => {
    const start = side ? 128 : 0;
    const pivot = side ? 147 : 109;
    out.save(); out.translate(pivot, hip); out.rotate(angle); out.translate(-pivot, -hip);
    out.drawImage(base, start, hip, 128, knee - hip + 2, start, hip, 128, knee - hip + 2);
    out.translate(pivot, knee); out.rotate(bend); out.translate(-pivot, -knee);
    out.drawImage(base, start, knee, 128, 384 - knee, start, knee, 128, 384 - knee);
    out.restore();
  };
  for (let frame = 0; frame < 11; frame++) {
    out.save(); out.translate(frame * 256, 0);
    if (!frame) out.drawImage(base, 0, 0);
    else {
      const run = frame <= RUN_FRAMES;
      const phase = ((frame - 1) / RUN_FRAMES) * Math.PI * 2;
      const swing = run ? Math.sin(phase) * .34 : frame === JUMP_FRAME ? -.42 : .16;
      const bob = run ? -Math.abs(Math.cos(phase)) * 4 : -2;
      out.translate(0, bob);
      leg(0, swing, run ? Math.max(0, -Math.sin(phase)) * .42 : .48);
      leg(1, -swing, run ? Math.max(0, Math.sin(phase)) * .42 : -.22);
      // Torso overlaps the hip joint; hair, face, glasses, shirt and hands remain intact.
      out.drawImage(base, 0, 0, 256, hip + 5, 0, 0, 256, hip + 5);
    }
    out.restore();
  }
  return sheet.toDataURL('image/png');
}
