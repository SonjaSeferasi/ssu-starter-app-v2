import { accessToken } from './account/session';
import type { NavigationPosition } from './game-room';

export const NAVIGATION_PREFERENCE_WAIT_MS = 9000;

/** Read or save a placement, accepting only a valid server confirmation. */
export async function navigationPreferenceRequest(position?: NavigationPosition, cancellation?: AbortSignal): Promise<NavigationPosition> {
  const controller = new AbortController();
  const cancel = () => controller.abort(new DOMException('Preference request cancelled.', 'AbortError'));
  if (cancellation?.aborted) cancel();
  cancellation?.addEventListener('abort', cancel, { once: true });
  let rejectAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', rejectAbort, { once: true });
  });
  const timer = setTimeout(() => controller.abort(new Error('The preference request took too long.')), NAVIGATION_PREFERENCE_WAIT_MS);
  try {
    if (controller.signal.aborted) throw controller.signal.reason;
    return await Promise.race([aborted, (async () => {
      const token = await accessToken();
      if (controller.signal.aborted) throw controller.signal.reason;
      if (!token) throw new Error('Please sign in again to save your placement.');
      const response = await fetch('/api/preferences', {
        method: position === undefined ? 'GET' : 'PUT', cache: 'no-store', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(position === undefined ? {} : { body: JSON.stringify({ position }) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !['side', 'bottom', 'top'].includes(data.position)
        || (position !== undefined && data.position !== position)) {
        throw new Error('The server did not confirm your navigation placement.');
      }
      return data.position as NavigationPosition;
    })()]);
  } finally {
    clearTimeout(timer);
    cancellation?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', rejectAbort);
  }
}
