'use client';

import { useEffect, useState } from 'react';
import type { AvatarManifest } from './avatar-layers';

// The manifest only exists once layered art has been imported. Until then every
// avatar keeps using the v1 sheets, so a missing file is expected, not an error.
let pending: Promise<AvatarManifest | null> | null = null;

export function loadAvatarManifest(): Promise<AvatarManifest | null> {
  pending ??= fetch('/avatars/v2/manifest.json', { cache: 'no-cache' })
    .then(response => response.ok ? response.json() as Promise<AvatarManifest> : null)
    .then(manifest => manifest && manifest.version === 1 ? manifest : null)
    .catch(() => null);
  return pending;
}

/** undefined while loading, null when no layered art exists. */
export function useAvatarManifest() {
  const [manifest, setManifest] = useState<AvatarManifest | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void loadAvatarManifest().then(value => { if (active) setManifest(value); });
    return () => { active = false; };
  }, []);
  return manifest;
}
