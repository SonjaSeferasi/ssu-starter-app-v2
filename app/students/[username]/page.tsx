import { ProfileView } from '../../../components/profile/profile-view';

// SRS-113: another student's profile, e.g. /students/alex.kim
export default function StudentProfilePage({ params }: { params: { username: string } }) {
  return <ProfileView username={decodeURIComponent(params.username)} />;
}
