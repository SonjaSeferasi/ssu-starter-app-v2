import { Pixelify_Sans } from 'next/font/google';

// Pixel typeface for DormSpace's 2D art style, scoped to this game.
const pixel = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixel', display: 'swap' });

export default function DormSpaceLayout({ children }: { children: React.ReactNode }) {
  return <div className={pixel.variable}>{children}</div>;
}
