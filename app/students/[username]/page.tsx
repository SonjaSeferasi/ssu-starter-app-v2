import { ProfileView } from '../../../components/profile/profile-view';

// SRS-113: another student's profile, e.g. /students/alex.kim
export default async function StudentProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileView username={decodeURIComponent(username)} />;
}
