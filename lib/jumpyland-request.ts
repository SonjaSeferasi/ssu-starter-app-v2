// SRS-619.7 and SRS-NFR-65: bound the entire operation, including authentication
// refresh and response decoding. Abort alone cannot bound an uncooperative promise.
// Reserve one second for rendering the recovery controls within the proposed
// ten-second return limit. Returning after saving began can only shorten this wait.
export const JUMPYLAND_REQUEST_LIMIT_MS = 9000;
export class JumpylandRequestTimeout extends Error {
  constructor() { super('Saving is not confirmed. Your completion is retained so you can retry.'); this.name = 'TimeoutError'; }
}
export async function boundedJumpylandRequest<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { reject(new JumpylandRequestTimeout()); controller.abort(); }, JUMPYLAND_REQUEST_LIMIT_MS);
  });
  try { return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), deadline]); }
  finally { clearTimeout(timer); }
}

export function isConfirmedJumpylandCompletion(data: unknown, level: number): data is { completed: number[]; balance?: number; reward?: { points: number } } {
  if (!data || typeof data !== 'object') return false;
  const value = data as { completed?: unknown; balance?: unknown; reward?: { points?: unknown } | null };
  return Array.isArray(value.completed) && value.completed.every(n => Number.isInteger(n) && n >= 1 && n <= 3) && value.completed.includes(level)
    && (value.balance === undefined || (Number.isSafeInteger(value.balance) && Number(value.balance) >= 0))
    && (value.reward === undefined || (!!value.reward && Number.isSafeInteger(value.reward.points) && Number(value.reward.points) >= 0));
}
