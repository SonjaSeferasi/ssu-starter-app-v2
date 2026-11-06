import { Pixelify_Sans } from 'next/font/google';

// Pixel typeface for the legacy 2D DormSpace versions only (campus, classic, art credits).
// The default 3D DormSpace uses the app's sans-serif interface type.
export const pixelFont = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixel', display: 'swap' });
