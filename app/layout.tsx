import './globals.css';
import { SocialShell } from '../components/navigation/social-shell';

export const metadata = {
  title: 'SocialU',
  description: 'Your campus. Your people.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><SocialShell>{children}</SocialShell></body>
    </html>
  );
}
