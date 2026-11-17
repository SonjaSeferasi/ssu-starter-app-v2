import { describe, expect, it } from 'vitest';
import { READ_LABEL, showsReadReceipt } from '../lib/chat-read-status';

const me = '7';
const mine = { sender_id: me, read: true };

describe('#1283 (SRS-211.8) when a read receipt is shown', () => {
  it('is shown on the student’s own private message once it has been read', () => {
    expect(showsReadReceipt('private', mine, me)).toBe(true);
  });

  it('is not shown before it has been read', () => {
    // Nothing is shown for "not read yet". Saying "Sent" there would be SRS-211.4, a separate requirement.
    expect(showsReadReceipt('private', { sender_id: me, read: false }, me)).toBe(false);
  });

  it('is never shown in a group, which is SRS-211.9', () => {
    // The database does not send the field for a group at all; this is the second lock on the same door.
    expect(showsReadReceipt('group', mine, me)).toBe(false);
    expect(showsReadReceipt('group', { sender_id: me, read: true }, me)).toBe(false);
  });

  it('is not shown on a message the student received', () => {
    // SRS-211.8 tells a sender about their own message. Telling someone what they themselves have read
    // would be noise at best.
    expect(showsReadReceipt('private', { sender_id: '8', read: true }, me)).toBe(false);
  });

  it('treats an absent field as nothing to show, not as unread', () => {
    // A server without 20261117160000 sends no 'read' at all. Reading that as "not read" would be an
    // invented claim about the recipient; reading it as "nothing to show" is the truth.
    expect(showsReadReceipt('private', { sender_id: me }, me)).toBe(false);
    expect(showsReadReceipt('private', { sender_id: me, read: null }, me)).toBe(false);
  });

  it('shows nothing before the conversation or the student is known', () => {
    expect(showsReadReceipt(undefined, mine, me)).toBe(false);
    expect(showsReadReceipt(null, mine, me)).toBe(false);
    expect(showsReadReceipt('private', mine, null)).toBe(false);
  });
});

describe('#1283 what it says', () => {
  it('states the status plainly and says nothing about when', () => {
    // read_at is on the row and is deliberately not exposed: "read at 11:42pm" is a different and far more
    // exposing claim than "read", and SRS-211.8 asks only for the status.
    expect(READ_LABEL).toBe('Read');
    expect(READ_LABEL).not.toMatch(/\d|am|pm|ago|at /i);
  });
});
