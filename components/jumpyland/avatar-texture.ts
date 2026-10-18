import { animateAvatar } from './avatar-animation';
// Capture the *same* SVG rendered by AvatarPreview, including its tint filters.
// Embed sheet images before rasterization; SVG-as-image cannot fetch external images.
export async function avatarTexture(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '256'); clone.setAttribute('height', '384');
  clone.removeAttribute('class'); clone.removeAttribute('style');
  const images = Array.from(clone.querySelectorAll('image'));
  const sources = new Map<string, string>();
  for (const image of images) {
    const href = image.getAttribute('href');
    if (!href) continue;
    if (!sources.has(href)) {
      const response = await fetch(href);
      if (!response.ok) throw new Error('Your avatar artwork could not be loaded. Please retry.');
      const blob = await response.blob();
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
      });
      sources.set(href, value);
    }
    image.setAttribute('href', sources.get(href)!);
  }
  const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = source; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 384;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Avatar rendering is unavailable.');
    context.drawImage(image, 0, 0, 256, 384);
    return await animateAvatar(canvas.toDataURL('image/png'));
  } finally { URL.revokeObjectURL(source); }
}
