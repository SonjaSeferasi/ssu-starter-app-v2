import { notFound } from 'next/navigation';
import { GameRoomPreview } from '../../../components/game-room/game-room-preview';

export default function PreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <GameRoomPreview />;
}
