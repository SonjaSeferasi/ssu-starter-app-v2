import './globals.css';
import { SocialShell } from '../components/navigation/social-shell';
import Script from 'next/script';
import { boardHistoryBootstrapSource } from '../lib/board-history-guard';

export const metadata = {
  title: 'SocialU',
  description: 'Your campus. Your people.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Script id="board-history-tracking" strategy="beforeInteractive" dangerouslySetInnerHTML={{__html:boardHistoryBootstrapSource()}}/><SocialShell>{children}</SocialShell></body>
    </html>
  );
}
