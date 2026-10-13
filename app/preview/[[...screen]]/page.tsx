import { notFound } from 'next/navigation';
import AuthPages, { AuthPreviewIndex, type AuthScreen } from '../../../components/account/auth-pages';

const screens: AuthScreen[] = ['register', 'verify-email', 'login', 'forgot-password', 'reset-password', 'change-password'];
export default function PreviewPage({ params }: { params: { screen?: string[] } }) {
  const screen = params.screen?.join('/');
  if (!screen) return <AuthPreviewIndex />;
  if (!screens.includes(screen as AuthScreen)) notFound();
  return <AuthPages screen={screen as AuthScreen} preview />;
}
