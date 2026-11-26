import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// SRS-201.14 (#1405): the GIF upload route. The account, chat and media modules are stand-ins; what is
// tested is the order the route does things in, and what it refuses before anything is stored.
const { verified, upload, remove, chatOperation, resolveMediaUrl } = vi.hoisted(() => ({
  verified: vi.fn(), upload: vi.fn(), remove: vi.fn(), chatOperation: vi.fn(), resolveMediaUrl: vi.fn(),
}));
vi.mock('../../lib/socialu-account', async (importOriginal) => ({
  ...await importOriginal<object>(),
  verifiedUser: verified,
  accountClient: () => ({ storage: { from: () => ({ upload, remove }) } }),
}));
vi.mock('../../lib/chat-access', async (importOriginal) => ({
  ...await importOriginal<object>(),
  chatOperation,
  conversationIdParam: (id: string) => id,
}));
vi.mock('../../lib/media', () => ({ resolveMediaUrl }));

import { POST } from '../../app/api/conversations/[id]/gifs/route';
import { AccountError } from '../../lib/socialu-account';
import { GIF_MAX_BYTES } from '../../lib/chat-gif';

// A real GIF starts with GIF89a; everything after the header is irrelevant to this route, which never
// decodes the frames.
const gifBytes = (size = 64) => {
  const bytes = Buffer.alloc(size);
  Buffer.from('GIF89a').copy(bytes);
  return bytes;
};
const file = (bytes: Buffer, type = 'image/gif', name = 'party.gif') => new File([bytes], name, { type });

function request(value: unknown, field = 'gif') {
  const form = new FormData();
  if (value !== undefined) form.set(field, value as string | Blob);
  return new Request('http://localhost/api/conversations/7/gifs', { method: 'POST', body: form });
}
const context = { params: Promise.resolve({ id: '7' }) };
const send = (value: unknown, field?: string) => POST(request(value, field), context);

beforeEach(() => {
  vi.resetAllMocks();
  verified.mockResolvedValue({ id: 'sender-auth-id' });
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({});
  chatOperation.mockResolvedValue({ id: '42', kind: 'gif_upload', asset_id: '9' });
  resolveMediaUrl.mockResolvedValue('https://example.test/signed.gif');
});

describe('SRS-201.14 send a GIF', () => {
  it('stores the GIF and saves the message', async () => {
    const response = await send(file(gifBytes()));
    expect(response.status).toBe(201);

    const [key, bytes, options] = upload.mock.calls[0];
    expect(key).toMatch(/^chat_gif\/sender-auth-id\/7\/[0-9a-f-]+\.gif$/);
    expect(bytes.byteLength).toBe(64);
    expect(options.contentType).toBe('image/gif');
    expect(options.upsert).toBe(false);

    expect(chatOperation.mock.calls[0][0]).toBe('socialu_send_gif');
    expect(chatOperation.mock.calls[0][1]).toMatchObject({
      p_auth_id: 'sender-auth-id', p_conversation_id: '7', p_mime_type: 'image/gif', p_byte_count: '64',
    });
    expect(await response.json()).toEqual({
      message: { id: '42', kind: 'gif_upload', asset_id: '9', photo_url: 'https://example.test/signed.gif' },
    });
  });

  it('stores one object and no display copy', async () => {
    // A photo gets a smaller re-encoded copy (SRS-201.6, #1026). Doing that to a GIF would flatten it.
    await send(file(gifBytes()));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(chatOperation.mock.calls[0][1]).not.toHaveProperty('p_display_storage_key');
  });

  it('sends the storage key, never the signed link, to the database', async () => {
    await send(file(gifBytes()));
    expect(chatOperation.mock.calls[0][1].p_storage_key).toMatch(/^chat_gif\//);
    expect(JSON.stringify(chatOperation.mock.calls[0][1])).not.toContain('https://');
  });

  it('refuses a request with no file', async () => {
    expect((await send(undefined)).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses a file sent under the wrong field name', async () => {
    expect((await send(file(gifBytes()), 'photo')).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses a format that is not a GIF', async () => {
    const response = await send(file(gifBytes(), 'image/png', 'sunset.png'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'GIFs must be GIF files.' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses a GIF over the size limit before storing it', async () => {
    // The File carries its own size, so this is the same judgement the page made.
    const response = await send(file(gifBytes(GIF_MAX_BYTES + 1)));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'GIFs must be 15 MB or smaller.' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses an empty file', async () => {
    expect((await send(file(Buffer.alloc(0)))).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses bytes that are not a GIF, whatever the request called them', async () => {
    const response = await send(file(Buffer.from('not a gif at all, honestly')));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'That file is not a GIF. Choose it again.' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not save a message when storage fails', async () => {
    upload.mockResolvedValue({ error: { message: 'offline' } });
    expect((await send(file(gifBytes()))).status).toBe(503);
    expect(chatOperation).not.toHaveBeenCalled();
  });

  it('removes the stored object when the database refuses the message', async () => {
    chatOperation.mockRejectedValue(new AccountError('Conversation not available.', 404));
    const response = await send(file(gifBytes()));
    expect(response.status).toBe(404);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0]).toEqual([upload.mock.calls[0][0]]);
  });

  it('still reports the real error when cleaning up also fails', async () => {
    chatOperation.mockRejectedValue(new AccountError('Conversation not available.', 404));
    remove.mockRejectedValue(new Error('bucket offline'));
    expect((await send(file(gifBytes()))).status).toBe(404);
  });

  it('refuses an unauthenticated request before touching storage', async () => {
    verified.mockRejectedValue(new AccountError('Please sign in.', 401));
    expect((await send(file(gifBytes()))).status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('SRS-201.14 the migration keeps the two rules a copy of send_photo would lose', () => {
  const migration = readFileSync(
    process.cwd() + '/supabase/migrations/20261124120000_chat_send_gif.sql', 'utf8');
  // The header explains at length what this function deliberately does NOT do, naming
  // chat_photo_displays and the 15,000,000 limit to say they are absent. Those sentences would satisfy a
  // plain search for the very things being checked, so the assertions below read the executable SQL only.
  // Split on \r?\n and anchor nothing: git checks this file out with CRLF on Windows, and '.' in a
  // JavaScript regular expression does not match '\r', so /--.*$/ quietly strips nothing on such a
  // checkout -- which would leave every assertion below passing against the comments it meant to exclude.
  const sql = migration.split(/\r?\n/).map((line) => line.replace(/--.*/, '')).join('\n');

  it('broadcasts through the per-session check, not realtime.send', () => {
    // SRS-107.8 (#1228): realtime.send here would reach revoked login sessions. The send_photo migration
    // file still reads realtime.send because it was patched in place, so copying it is the likely mistake.
    expect(migration).toContain('socialu.send_to_active_sessions(');
    expect(migration).not.toMatch(/PERFORM realtime\.send\(/);
  });

  it('writes one asset, under chat_gif, with no display copy', () => {
    expect(sql).toContain("'chat_gif'");
    expect(sql).toContain("'gif_upload'");
    expect(sql).not.toContain('chat_photo_displays');
    expect(sql).not.toContain('p_display_storage_key');
    // One INSERT into media_assets, not two.
    expect(sql.match(/INSERT INTO socialu\.media_assets/g) ?? []).toHaveLength(1);
  });

  it('restates no limit of its own', () => {
    // SRS-201.13's number lives in upload_policies; the function reads the policy rather than hard-coding it.
    expect(sql).not.toContain('15000000');
    expect(sql).toContain('socialu.upload_policies');
  });
});

describe('SRS-201.14 the composer can actually send a chosen GIF', () => {
  // Found against the running app on 2026-11-26: the route below worked, but Send stayed greyed out with a
  // GIF waiting in the composer, because its disabled rule only ever looked at text and photo. Every test
  // above still passed, because they call the route directly. A GIF message carries no text -- the schema
  // forbids it -- so with the button disabled there was no way to send one by hand at all.
  const page = readFileSync(process.cwd() + '/app/messages/[conversationId]/page.tsx', 'utf8');

  it('enables Send when a GIF is chosen and nothing is typed', () => {
    expect(page).toContain("disabled={sending || (!text.trim() && !photo && !gif)}");
  });

  it('names the GIF on the button and in the placeholder', () => {
    expect(page).toContain("gif ? 'Send GIF' : 'Send message'");
    expect(page).toContain("gif ? 'GIF ready to send…' : 'Message…'");
  });
});
