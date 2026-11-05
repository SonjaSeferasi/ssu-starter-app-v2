import { pixelFont } from '../pixel-font';

export default function ClassicDormSpaceLayout({ children }: { children: React.ReactNode }) {
  return <div className={pixelFont.variable}>{children}</div>;
}
