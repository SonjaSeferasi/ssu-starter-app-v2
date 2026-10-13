import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, saveSession, storedAccessToken } from '../lib/account/session';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('sessionStorage', storage());
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('login storage shared by group pages', () => {
  it('makes non-remembered sign-ins available without persistent storage', () => {
    saveSession({ access_token: 'tab-token' }, false);
    expect(storedAccessToken()).toBe('tab-token');
    expect(localStorage.getItem('access_token')).toBeNull();
  });
  it('keeps remembered sign-ins available in persistent storage', () => {
    saveSession({ access_token: 'saved-token' }, true);
    expect(storedAccessToken()).toBe('saved-token');
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });
  it('removes the previous storage choice when switching remember me', () => {
    saveSession({ access_token: 'old-token' }, true);
    saveSession({ access_token: 'new-token' }, false);
    expect(storedAccessToken()).toBe('new-token');
    expect(localStorage.getItem('socialu_session')).toBeNull();
  });
  it('clears both storage choices when signing out', () => {
    localStorage.setItem('access_token', 'old-token');
    sessionStorage.setItem('access_token', 'new-token');
    clearSession();
    expect(storedAccessToken()).toBeNull();
  });
});
