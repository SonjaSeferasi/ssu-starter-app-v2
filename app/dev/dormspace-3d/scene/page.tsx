import { notFound } from 'next/navigation';
import { DormSceneReview } from '../../../../components/dormspace-3d/scene-review';

// Development-only review of the 3D hall, furnished room and shop states (synthetic fixtures; no API).
export default function DormSpace3DScenePage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <DormSceneReview />;
}
