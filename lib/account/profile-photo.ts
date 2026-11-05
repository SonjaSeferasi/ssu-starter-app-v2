// Leave ample room below Vercel's request limit, including multipart form fields.
export const PROFILE_UPLOAD_MAX_BYTES = 1_000_000;
export const PROFILE_PHOTO_MAX_EDGE = 1200;

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
    if (extension === 'heic' && file.size <= PROFILE_UPLOAD_MAX_BYTES) return file;
    throw new Error('This browser could not open that photo. Export it as JPG or PNG and try again.');
  }
  try {
    if (extension !== 'heic' && file.size <= PROFILE_UPLOAD_MAX_BYTES && Math.max(width, height) <= PROFILE_PHOTO_MAX_EDGE) return file;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare your photo. Try another browser.');
    // Some detailed PNGs remain large after one conversion. Reduce quality first,
    // then dimensions, always drawing from the original to avoid repeated JPEG loss.
    for (const edge of [PROFILE_PHOTO_MAX_EDGE, 900, 675, 500, 350]) {
      const scale = Math.min(1, edge / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Unable to resize this photo.')), 'image/jpeg', quality));
        if (blob.type !== 'image/jpeg') throw new Error('This browser could not prepare a JPG. Export your photo as JPG and try again.');
        if (blob.size && blob.size <= PROFILE_UPLOAD_MAX_BYTES) {
          return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
        }
      }
    }
    throw new Error('Unable to make this photo small enough. Export it as a smaller JPG and try again.');
  } finally { release(); }
}
