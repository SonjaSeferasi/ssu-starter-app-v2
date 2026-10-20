'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Position } from '../../lib/dormspace-movement';

type Geometry = { columns: number; rows: number; offsetX?: number; offsetY?: number; anchorY: number };

// Animation owns only the sprite's transform. React still owns the scene and interaction controls.
// Cache surface dimensions on resize instead of measuring layout or reconciling the room each frame.
export function useAvatarMotion(initial: Position, geometry: Geometry) {
  const position = useRef(initial);
  const area = useRef<HTMLDivElement>(null);
  const sprite = useRef<HTMLSpanElement>(null);
  const size = useRef({ width: 0, height: 0 });
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;

  const move = useCallback((next: Position) => {
    position.current = next;
    if (!sprite.current) return;
    const { columns, rows, offsetX = 0, offsetY = 0, anchorY } = geometryRef.current;
    const x = (next.x + offsetX) / columns * size.current.width;
    const y = (next.y + offsetY) / rows * size.current.height;
    sprite.current.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) translate(-50%, -${anchorY}%)`;
  }, []);

  useLayoutEffect(() => {
    const surface = area.current;
    if (!surface) return;
    const resize = ({ width, height }: { width: number; height: number }) => {
      size.current = { width, height };
      move(position.current);
    };
    resize(surface.getBoundingClientRect());
    const observer = new ResizeObserver(([entry]) => resize(entry.contentRect));
    observer.observe(surface);
    return () => observer.disconnect();
  }, [move, geometry.columns, geometry.rows, geometry.offsetX, geometry.offsetY, geometry.anchorY]);

  return { position, area, sprite, size, move };
}
