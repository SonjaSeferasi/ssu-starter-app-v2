'use client';

import { useState } from 'react';
import type { NavigationPosition } from '../../lib/game-room';
import { NavigationFrame } from '../navigation/social-navigation';
import { GameRoomContent } from './game-room';

export function GameRoomPreview() {
  const [position, setPosition] = useState<NavigationPosition>('side');
  return <NavigationFrame pathname="/game-room" position={position} onPositionChange={setPosition}><GameRoomContent preview /></NavigationFrame>;
}
