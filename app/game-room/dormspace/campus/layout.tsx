import { pixelFont } from '../pixel-font';

export default function CampusDormSpaceLayout({ children }: { children: React.ReactNode }) {
  return <div className={pixelFont.variable}>{children}</div>;
}
