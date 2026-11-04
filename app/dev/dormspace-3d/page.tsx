import { notFound } from 'next/navigation';
import { DormAvatarReview } from '../../../components/dormspace-3d/avatar-review';

// Development-only review of the SRS-504.1 3D avatar models, like /dev/game-room.
export default function DormSpace3DAvatarPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <DormAvatarReview />;
}
