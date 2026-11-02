'use client';

import { useEffect, useRef, useState } from 'react';
import { isSnipeMimeType, SNIPE_PHOTO_POLICY } from '../../lib/snipe-policy';
import styles from './snipe.module.css';

const stopStream = (stream: MediaStream | null) => stream?.getTracks().forEach((track) => track.stop());

function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was blocked. Allow camera access in your browser, or close the camera and choose a photo.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No available camera was found. Close the camera and choose a photo instead.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera could not start. Close other apps using it and try again, or choose a photo.';
  return 'The camera could not start. Close the camera and choose a photo instead.';
}

// Mounted only after Take photo. Frames stay on this device until the student submits the existing form.
export function SnipeCamera({ id, onCapture, onClose }: { id: string; onCapture: (photo: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let canceled = false;
    let opened: MediaStream | null = null;
    const preview = video.current;
    alive.current = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is unavailable in this browser or connection. Close the camera and choose a photo instead.');
        return;
      }
      try {
        const camera = await navigator.mediaDevices.getUserMedia({ audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
        // Closing the form while the permission prompt is open must also release a late-arriving stream.
        if (canceled || !preview) { stopStream(camera); return; }
        opened = camera; stream.current = camera;
        for (const track of camera.getVideoTracks()) track.onended = () => {
          if (!canceled) { setReady(false); setError('The camera disconnected. Close it and try again, or choose a photo.'); }
        };
        preview.srcObject = camera;
        await preview.play();
      } catch (cause) {
        stopStream(opened);
        if (!canceled) { setReady(false); setError(cameraError(cause)); }
      }
    })();
    return () => {
      canceled = true; alive.current = false;
      stopStream(opened);
      if (stream.current === opened) stream.current = null;
      if (preview) preview.srcObject = null;
    };
  }, []);

  async function capture() {
    const preview = video.current;
    if (!ready || capturing || !preview?.videoWidth || !preview.videoHeight) return;
    setCapturing(true); setError('');
    try {
      const scale = Math.min(1, SNIPE_PHOTO_POLICY.maxWidth / preview.videoWidth, SNIPE_PHOTO_POLICY.maxHeight / preview.videoHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(preview.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(preview.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The photo could not be captured. Try again or choose a photo.');
      context.drawImage(preview, 0, 0, canvas.width, canvas.height);
      let photo: Blob | null = null;
      for (const quality of [0.9, 0.8, 0.65]) {
        photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (photo && photo.size <= SNIPE_PHOTO_POLICY.maxBytes) break;
      }
      if (!photo?.size || !isSnipeMimeType(photo.type) || photo.size > SNIPE_PHOTO_POLICY.maxBytes) {
        throw new Error('The photo could not be captured within the size limit. Try again or choose a photo.');
      }
      if (!alive.current) return;
      const file = new File([photo], `snipe-camera-${Date.now()}.${photo.type === 'image/jpeg' ? 'jpg' : 'png'}`, { type: photo.type });
      stopStream(stream.current); stream.current = null;
      preview.srcObject = null;
      onCapture(file);
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'The photo could not be captured. Please try again.');
    } finally {
      if (alive.current) setCapturing(false);
    }
  }

  return (
    <div id={id} className={styles.camera} role="group" aria-label="Camera">
      {!ready && !error && <p className={styles.muted} role="status">Opening camera… Allow camera access if your browser asks.</p>}
      <video ref={video} className={styles.cameraVideo} aria-label="Camera preview" autoPlay playsInline muted hidden={Boolean(error)}
        onCanPlay={() => setReady(true)} />
      {error && <p className={styles.reason} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={!ready || capturing || Boolean(error)} onClick={() => void capture()}>
          {capturing ? 'Capturing…' : 'Capture photo'}
        </button>
        <button type="button" className={styles.secondary} onClick={onClose}>Cancel camera</button>
      </div>
    </div>
  );
}
