import { describe, expect, it } from 'vitest';
import { safeRedirectTarget } from '../components/account/auth-pages';

// Share (additional functionality): after login, ?redirect= sends a
// student back to a shared post link. safeRedirectTarget is the one thing
// standing between a URL query param and router.push() -- it must reject
// everything that isn't a plain internal path, or this becomes an open
// redirect (login?redirect=https://evil.example could phish a student who
// trusts the socialu.app login page).
describe('safeRedirectTarget (Share: validates the post-login redirect)', () => {
  it('accepts a plain internal path', () => {
    expect(safeRedirectTarget('/posts/42')).toBe('/posts/42');
  });

  it('rejects a protocol-relative URL (e.g. //evil.example)', () => {
    expect(safeRedirectTarget('//evil.example')).toBeNull();
  });

  it('rejects an absolute external URL', () => {
    expect(safeRedirectTarget('https://evil.example/posts/42')).toBeNull();
    expect(safeRedirectTarget('javascript:alert(1)')).toBeNull();
  });

  it('rejects a path that does not start with a slash', () => {
    expect(safeRedirectTarget('posts/42')).toBeNull();
  });

  it('rejects null/empty', () => {
    expect(safeRedirectTarget(null)).toBeNull();
    expect(safeRedirectTarget('')).toBeNull();
  });

  it('accepts a path with query parameters', () => {
    expect(safeRedirectTarget('/posts/42?tab=comments')).toBe('/posts/42?tab=comments');
  });
});
