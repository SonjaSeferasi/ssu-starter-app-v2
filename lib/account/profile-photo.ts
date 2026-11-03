// Keep uploads within the existing server/storage policy while accepting large camera photos.
export async function prepareProfilePhoto(file: File): Promise<File> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'heic'].includes(extension ?? '')) {
    throw new Error('Choose a JPG, JPEG, PNG, or HEIC photo.');
  }
  if (!file.size) throw new Error('That photo is empty. Choose another photo.');
  let bitmap: CanvasImageSource;
  let width: number;
  let height: number;
  let release = () => {};
  try {
    try {
      const decoded = await createImageBitmap(file);
      bitmap = decoded;
      width = decoded.width;
      height = decoded.height;
      release = () => decoded.close();
    } catch {
      // Safari can display some photos that its bitmap decoder cannot open.
      const objectUrl = URL.createObjectURL(file);
      try {
        const decoded = new Image();
        await new Promise<void>((resolve, reject) => {
          decoded.onload = () => resolve();
          decoded.onerror = () => reject(new Error('Unsupported photo'));
          decoded.src = objectUrl;
        });
        bitmap = decoded;
        width = decoded.naturalWidth;
        height = decoded.naturalHeight;
        release = () => URL.revokeObjectURL(objectUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
      }
    }
  }
  catch {
    // Some browsers cannot decode HEIC, but the server still accepts small HEIC files.
    if (extension === 'heic' && file.size <= 10_000_000) return file;
    throw new Error('This browser could not open that photo. Export it as JPG or PNG and try again.');
  }
  try {
    if (extension !== 'heic' && file.size <= 10_000_000 && Math.max(width, height) <= 1600) return file;
    const scale = Math.min(1, 1600 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare your photo. Try another browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Unable to resize this photo.')), 'image/jpeg', 0.88));
    if (blob.size > 10_000_000) throw new Error('Unable to make this photo small enough. Try a different photo.');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally { release(); }
}
