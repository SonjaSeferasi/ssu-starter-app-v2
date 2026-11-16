import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DormAvatarReview } from '../../../components/dormspace-3d/avatar-review';

// Development-only review of the SRS-504.1 3D avatar models, like /dev/game-room.
// The hall, furnished room and shop states are reviewed at /dev/dormspace-3d/scene.
export default function DormSpace3DAvatarPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <>
    <p style={{ margin: 0, padding: '10px 20px', fontFamily: 'system-ui', background: '#e8efe3' }}><Link href="/dev/dormspace-3d/scene">Open the hall, room and shop scene review →</Link></p>
    <DormAvatarReview />
  </>;
}
