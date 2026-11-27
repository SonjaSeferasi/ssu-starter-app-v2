import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// SRS-201.21 (UR-201): the route behind "paste a GIF link". Opening the link is covered in
// __tests__/chat-gif-link.test.ts and stubbed here; what this file pins is what the route does with the
// bytes once it has them -- which is exactly what the device upload does, deliberately.
const { verified, upload, remove, chatOperation, resolveMediaUrl, fetchLinkedGif } = vi.hoisted(() => ({
  verified: vi.fn(), upload: vi.fn(), remove: vi.fn(), chatOperation: vi.fn(),
  resolveMediaUrl: vi.fn(), fetchLinkedGif: vi.fn(),
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
vi.mock('../../lib/chat-gif-link-server', () => ({ fetchLinkedGif }));

import { POST } from '../../app/api/conversations/[id]/gif-links/route';
import { AccountError } from '../../lib/socialu-account';
import { GIF_LINK_NOT_GIF } from '../../lib/chat-gif-link';
import { GIF_MAX_BYTES, GIF_TOO_LARGE } from '../../lib/chat-gif';

const gif = (size = 64) => {
  const bytes = Buffer.alloc(size, 3);
  Buffer.from('GIF89a').copy(bytes);
  return bytes;
};
const context = { params: Promise.resolve({ id: '7' }) };
const send = (body: unknown) => POST(new Request('http://localhost/api/conversations/7/gif-links', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), context);

beforeEach(() => {
  vi.resetAllMocks();
  verified.mockResolvedValue({ id: 'sender-auth-id' });
  fetchLinkedGif.mockResolvedValue(gif(128));
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({});
  chatOperation.mockResolvedValue({ id: '42', kind: 'gif_upload', asset_id: '9' });
  resolveMediaUrl.mockResolvedValue('https://example.test/signed.gif');
});

describe('SRS-201.21 send a GIF from a link', () => {
  it('stores the GIF the link pointed at and saves the message', async () => {
    const response = await send({ url: 'https://media.example.com/a.gif' });
    expect(response.status).toBe(201);
    expect(fetchLinkedGif).toHaveBeenCalledWith('https://media.example.com/a.gif');
    expect(upload).toHaveBeenCalledWith(expect.stringContaining('chat_gif/sender-auth-id/7/'), expect.any(Buffer),
      { contentType: 'image/gif', upsert: false });
    const body = await response.json();
    expect(body.message.photo_url).toBe('https://example.test/signed.gif');
  });

  it('saves it as an ordinary uploaded GIF, so it needs no migration of its own', () => {
    // socialu_send_gif has been deployed since SRS-201.14. A linked GIF being a third kind of thing
    // would have meant another function, another history patch and another thing to keep in step.
    expect(chatOperation).not.toHaveBeenCalled();
    return send({ url: 'https://media.example.com/a.gif' }).then(() => {
      expect(chatOperation).toHaveBeenCalledWith('socialu_send_gif', expect.objectContaining({
        p_auth_id: 'sender-auth-id', p_conversation_id: '7', p_mime_type: 'image/gif', p_byte_count: '128',
      }));
    });
  });

  it('passes the refusal from the link straight through', async () => {
    fetchLinkedGif.mockRejectedValue(new AccountError(GIF_LINK_NOT_GIF, 400));
    const response = await send({ url: 'https://example.com/page.html' });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(GIF_LINK_NOT_GIF);
    expect(upload).not.toHaveBeenCalled();
  });

  it('applies the size limit to what came back as well', async () => {
    // The reader stops at the limit; this is the belt to that pair of braces, in case a future change
    // to the reader lets something larger through.
    fetchLinkedGif.mockResolvedValue(gif(GIF_MAX_BYTES + 1));
    const response = await send({ url: 'https://media.example.com/huge.gif' });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(GIF_TOO_LARGE);
    expect(upload).not.toHaveBeenCalled();
  });

  it('removes the stored object when the database refuses the message', async () => {
    chatOperation.mockRejectedValue(new AccountError('Conversation not available.', 404));
    const response = await send({ url: 'https://media.example.com/a.gif' });
    expect(response.status).toBe(404);
    expect(remove).toHaveBeenCalledOnce();
  });

  it('refuses an unauthenticated request before opening anything', async () => {
    verified.mockRejectedValue(new AccountError('Please sign in.', 401));
    expect((await send({ url: 'https://media.example.com/a.gif' })).status).toBe(401);
    expect(fetchLinkedGif).not.toHaveBeenCalled();
  });
});

describe('SRS-201.21 the composer offers it', () => {
  const root = process.cwd();
  const picker = readFileSync(root + '/app/messages/message-picker.tsx', 'utf8');
  const page = readFileSync(root + '/app/messages/[conversationId]/page.tsx', 'utf8');

  it('puts the link box in the GIF tab, under the library and the upload', () => {
    expect(picker).toContain('…or paste a GIF link');
    expect(picker).toContain('id="picker-gif-link"');
  });

  it('judges the shape of the link before asking the server', () => {
    expect(picker).toContain('gifLinkError(link)');
    expect(picker).toContain('setLinkError(refusal)');
  });

  it('sends it to the link route', () => {
    expect(page).toContain('/gif-links`');
    expect(page).toContain('onSendLink={(url) => void sendGifLink(url)}');
  });

  it('keeps the dangerous half out of the browser bundle', () => {
    // lib/chat-gif-link-server.ts imports node:dns. The composer must only ever import the shared rules.
    expect(picker).toContain("from '../../lib/chat-gif-link'");
    expect(picker).not.toContain('chat-gif-link-server');
  });
});
