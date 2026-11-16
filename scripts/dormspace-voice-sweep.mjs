// Run as a single supervised worker. The secret belongs in the worker environment.
import { setTimeout as delay } from 'node:timers/promises';

const { DORMSPACE_VOICE_SWEEP_ENDPOINT: endpoint, DORMSPACE_VOICE_SWEEP_SECRET: secret } = process.env;
const url = new URL(endpoint ?? '');
const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
if ((!local && url.protocol !== 'https:') || url.pathname !== '/api/dorm/voice/sweep' ||
    url.username || url.password || url.search || url.hash || !secret || secret.length < 32) {
  throw new Error('Configure the voice sweep endpoint and worker secret.');
}

const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());

while (!controller.signal.aborted) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
    });
    if (!response.ok) console.error(`DormSpace voice sweep returned HTTP ${response.status}`);
  } catch {
    if (!controller.signal.aborted) console.error('DormSpace voice sweep could not reach the app.');
  }
  await delay(Math.max(0, 5000 - (Date.now() - started)), undefined, { signal: controller.signal }).catch(() => {});
}
