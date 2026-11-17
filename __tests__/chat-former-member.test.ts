import { describe, expect, it } from 'vitest';
import { DELETE_CONVERSATION_CONFIRM, DELETE_CONVERSATION_FAILED, DELETE_CONVERSATION_LABEL, FORMER_MEMBER_BADGE, FORMER_MEMBER_NOTICE, canDeleteConversation, isReadOnly } from '../lib/chat-former-member';

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

describe('#1264 (SRS-207.6) when the delete option is offered', () => {
  it('is offered to a student who has left the group', () => {
    expect(canDeleteConversation({ kind: 'group', role: null, former: true })).toBe(true);
  });

  it('is not offered while they are still in the group', () => {
    // SRS-207.6 begins "After a student leaves a group". Leaving comes first (SRS-207.1), and the database
    // refuses with SCH02 if the page ever offered it anyway.
    expect(canDeleteConversation({ kind: 'group', role: 'member', former: false })).toBe(false);
    expect(canDeleteConversation({ kind: 'group', role: 'owner', former: false })).toBe(false);
  });

  it('is never offered for a private conversation, which has no membership to leave', () => {
    expect(canDeleteConversation({ kind: 'private', role: null, former: null })).toBe(false);
    expect(canDeleteConversation({ kind: 'private', role: null, former: true })).toBe(false);
  });

  it('is not offered before the conversation has loaded, or by a server without the migration', () => {
    expect(canDeleteConversation(null)).toBe(false);
    expect(canDeleteConversation(undefined)).toBe(false);
    expect(canDeleteConversation({ kind: 'group', role: 'member' })).toBe(false);
  });
});

describe('#1264 what the student is warned', () => {
  it('says the group keeps the conversation, which is the whole of SRS-207.7', () => {
    // A button called "delete" in a group chat invites exactly one wrong assumption: that it deletes the
    // conversation for everybody. The warning has to answer that before it is acted on.
    expect(DELETE_CONVERSATION_CONFIRM).toMatch(/the group keeps it/i);
    expect(DELETE_CONVERSATION_CONFIRM).toMatch(/from your Messages/i);
  });

  it('says what the student loses, so the choice is an informed one', () => {
    expect(DELETE_CONVERSATION_CONFIRM).toMatch(/not be able to read it again/i);
    expect(DELETE_CONVERSATION_CONFIRM).toMatch(/unless you rejoin/i);
  });

  it('never claims the messages themselves are destroyed', () => {
    expect(DELETE_CONVERSATION_CONFIRM).not.toMatch(/for everyone|permanently|cannot be undone|erase/i);
  });

  it('labels the control plainly and keeps it short enough to sit under the notice', () => {
    expect(DELETE_CONVERSATION_LABEL).toBe('Delete conversation');
    expect(DELETE_CONVERSATION_LABEL.length).toBeLessThanOrEqual(24);
  });

  it('fails with something the student can act on rather than a code', () => {
    expect(DELETE_CONVERSATION_FAILED).toMatch(/try again/i);
    expect(DELETE_CONVERSATION_FAILED).not.toMatch(/SCH0|SC404|error \d/i);
  });
});
