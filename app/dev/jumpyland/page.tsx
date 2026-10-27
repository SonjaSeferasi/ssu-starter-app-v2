import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { JumpylandPreview } from '../../../components/jumpyland/jumpyland-preview';

export default function PreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Suspense><JumpylandPreview /></Suspense>;
}
