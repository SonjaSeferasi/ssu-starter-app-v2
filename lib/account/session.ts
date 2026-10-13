export type StoredSession = { access_token: string; refresh_token?: string; expires_at?: number };
const SESSION_KEY = 'socialu_session';

export function storedAccessToken(): string | null {
  return sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
}

export function saveSession(session: StoredSession, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  // Keep the starter token for the existing profile and messaging pages.
  storage.setItem('access_token', session.access_token);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  other.removeItem('access_token');
  other.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('socialu-session-changed'));
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem('access_token');
    storage.removeItem(SESSION_KEY);
  }
  window.dispatchEvent(new Event('socialu-session-changed'));
}

let refreshing: Promise<string | null> | null = null;
export function accessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = readToken().finally(() => { refreshing = null; });
  return refreshing;
}

async function readToken() {
  const storage = sessionStorage.getItem('access_token') ? sessionStorage : localStorage;
  const token = storage.getItem('access_token');
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return token;
  let session: StoredSession;
  try { session = JSON.parse(raw); } catch { return token; }
  if (!session.refresh_token || !session.expires_at || session.expires_at * 1000 > Date.now() + 60_000) return token;
  const response = await fetch('/api/auth/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refresh_token }), cache: 'no-store',
  });
  if ([400, 401, 403].includes(response.status)) { clearSession(); return null; }
  const data = await response.json();
  if (!response.ok || !data.session?.access_token) throw new Error('Unable to refresh your session. Please try again.');
  saveSession(data.session, storage === localStorage);
  return data.session.access_token as string;
}
