import { describe, expect, it } from 'vitest';
import { countUnreadMessages } from '../components/chat/message-notifications';

describe('SRS-603.1 unread message total', () => {
  it('sums messages rather than counting conversations', () => {
    expect(countUnreadMessages([{ unread_count: 4 }, { unread_count: 7 }])).toBe(11);
  });
  it('returns zero before loading or after all conversations have been read', () => {
    expect(countUnreadMessages(null)).toBe(0);
    expect(countUnreadMessages([])).toBe(0);
    expect(countUnreadMessages([{ unread_count: 0 }])).toBe(0);
  });
  it('reflects a read conversation and subsequent new messages', () => {
    expect(countUnreadMessages([{ unread_count: 4 }, { unread_count: 2 }])).toBe(6);
    expect(countUnreadMessages([{ unread_count: 2 }])).toBe(2);
    expect(countUnreadMessages([{ unread_count: 3 }])).toBe(3);
  });
});
