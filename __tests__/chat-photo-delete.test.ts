import { describe, expect, it } from 'vitest';
import { PHOTO_DELETE_CONFIRM, PHOTO_DELETED, canDeletePhoto, markPhotoDeleted } from '../lib/chat-photo-links';

const mine = { id: '1', kind: 'photo', sender_id: '7' };

describe('#1106 who may delete a photo', () => {
  it('lets the student who sent it delete it', () => {
    expect(canDeletePhoto(mine, '7')).toBe(true);
  });

  it('refuses everyone else, including a group owner', () => {
    // Ownership of the group is not ownership of the photo. An administrator removing someone else's photo
    // is SRS-514 and a different thing; the database refuses this too.
    expect(canDeletePhoto(mine, '8')).toBe(false);
  });

  it('refuses a message that is not a photo', () => {
    expect(canDeletePhoto({ id: '2', sender_id: '7' }, '7')).toBe(false);
    expect(canDeletePhoto({ id: '3', kind: 'emoji', sender_id: '7' }, '7')).toBe(false);
  });

  it('refuses a photo that is already deleted, so the control does not come back', () => {
    expect(canDeletePhoto({ ...mine, deleted: true }, '7')).toBe(false);
  });

  it('offers nothing before the student is known', () => {
    // myStudentId is null until the history loads; everything would look like someone else's until then.
    expect(canDeletePhoto(mine, null)).toBe(false);
    expect(canDeletePhoto(null, '7')).toBe(false);
    expect(canDeletePhoto(undefined, '7')).toBe(false);
  });
});

describe('#1106 what happens on screen when a photo is deleted', () => {
  const messages = [
    { id: '1', kind: 'photo', photo_url: 'https://signed/one' },
    { id: '2', text: 'still here' },
    { id: '3', kind: 'photo', photo_url: 'https://signed/three' },
  ];

  it('drops the link as well as marking it, so the photo leaves the screen at once', () => {
    // The signed link keeps working for up to an hour. Marking it deleted without dropping the link would
    // leave the photograph on display after it was deleted, which is the whole thing this prevents.
    const after = markPhotoDeleted(messages, '1');
    expect(after[0].deleted).toBe(true);
    expect(after[0].photo_url).toBe(null);
  });

  it('touches nothing else in the conversation', () => {
    const after = markPhotoDeleted(messages, '1');
    expect(after[1]).toEqual(messages[1]);
    expect(after[2]).toEqual(messages[2]);
    expect(after).toHaveLength(3);
  });

  it('keeps the message in its place rather than removing it', () => {
    // A reply may point at it, and the conversation should still read in order.
    const after = markPhotoDeleted(messages, '1');
    expect(after.map((m) => m.id)).toEqual(['1', '2', '3']);
  });

  it('does nothing for a message this conversation does not have', () => {
    expect(markPhotoDeleted(messages, '999')).toEqual(messages);
  });

  it('is safe to apply twice, as the send and the broadcast both will', () => {
    // The sender marks it from their own request, and the broadcast arrives as well.
    const once = markPhotoDeleted(messages, '1');
    expect(markPhotoDeleted(once, '1')).toEqual(once);
  });
});

describe('#1106 what the student reads', () => {
  it('says the photo was deleted, not that something went wrong', () => {
    expect(PHOTO_DELETED).toMatch(/deleted/i);
    // It must not read like a failure: nothing is broken and nothing will arrive later.
    expect(PHOTO_DELETED).not.toMatch(/unavailable|error|failed|try again/i);
  });

  it('warns that deleting cannot be undone, because it cannot', () => {
    // The stored objects are removed, not hidden.
    expect(PHOTO_DELETE_CONFIRM).toMatch(/cannot be undone/i);
    expect(PHOTO_DELETE_CONFIRM).toMatch(/everyone/i);
  });
});
