import { describe, expect, it } from 'vitest';
import { FORMER_MEMBER_BADGE, FORMER_MEMBER_NOTICE, isReadOnly } from '../lib/chat-former-member';

describe('#1222 when the conversation opens read-only', () => {
  it('is read-only for a group the student has left', () => {
    expect(isReadOnly({ kind: 'group', role: null, former: true })).toBe(true);
  });

  it('is not read-only for a group they are still in', () => {
    expect(isReadOnly({ kind: 'group', role: 'member', former: false })).toBe(false);
    expect(isReadOnly({ kind: 'group', role: 'owner', former: false })).toBe(false);
  });

  it('is never read-only for a private conversation, which has no membership to end', () => {
    expect(isReadOnly({ kind: 'private', role: null, former: null })).toBe(false);
    // Even if the server were to send the flag for a DM, a DM is not a group a student can leave.
    expect(isReadOnly({ kind: 'private', role: null, former: true })).toBe(false);
  });

  it('is not read-only before the conversation has loaded, so the composer does not flicker', () => {
    expect(isReadOnly(null)).toBe(false);
    expect(isReadOnly(undefined)).toBe(false);
  });

  it('is not read-only when the server has not sent the flag yet', () => {
    // A page talking to a server without 20261116130000 applied sees no `former` at all. Current members
    // are the overwhelming majority of that case, and withholding the composer from them would be worse
    // than letting the database refuse the rare former member.
    expect(isReadOnly({ kind: 'group', role: 'member' })).toBe(false);
  });
});

describe('#1222 what the student is told', () => {
  it('says what is true now, not how the membership ended', () => {
    // It has to fit all three ways out: they left, they were removed, or they handed ownership over and
    // left. "You left this group" would be a lie to someone who was removed.
    expect(FORMER_MEMBER_NOTICE).not.toMatch(/you left|removed|kicked|banned/i);
    expect(FORMER_MEMBER_NOTICE).toMatch(/no longer in this group/i);
  });

  it('says the history is still theirs to read, so the screen does not read as an error', () => {
    expect(FORMER_MEMBER_NOTICE).toMatch(/still read/i);
    expect(FORMER_MEMBER_NOTICE).not.toMatch(/error|failed|unavailable|denied|cannot be loaded/i);
  });

  it('scopes the promise to their own membership period, which is all the database returns', () => {
    expect(FORMER_MEMBER_NOTICE).toMatch(/while you were a member/i);
  });

  it('marks the conversation in the list without implying how it ended either', () => {
    expect(FORMER_MEMBER_BADGE).not.toMatch(/left|removed|kicked/i);
    expect(FORMER_MEMBER_BADGE.length).toBeLessThanOrEqual(16);
  });
});
