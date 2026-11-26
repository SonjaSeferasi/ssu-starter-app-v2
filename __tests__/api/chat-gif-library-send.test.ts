import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// SRS-201.11 (UR-201): sending a GIF chosen from the library. The account and chat modules are stand-ins;
// what is tested is what the route refuses, and that it never reaches the database with a reference the
// catalogue does not know.
const { verified, chatOperation } = vi.hoisted(() => ({ verified: vi.fn(), chatOperation: vi.fn() }));
vi.mock('../../lib/socialu-account', async (importOriginal) => ({
  ...await importOriginal<object>(),
  verifiedUser: verified,
}));
vi.mock('../../lib/chat-access', async (importOriginal) => ({
  ...await importOriginal<object>(),
  chatOperation,
  conversationIdParam: (id: string) => id,
}));

import { POST } from '../../app/api/conversations/[id]/gif-library/route';
import { AccountError } from '../../lib/socialu-account';
import { GIF_LIBRARY } from '../../lib/chat-gif-library';

const context = { params: Promise.resolve({ id: '7' }) };
const send = (body: unknown) => POST(new Request('http://localhost/api/conversations/7/gif-library', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), context);

beforeEach(() => {
  vi.resetAllMocks();
  verified.mockResolvedValue({ id: 'sender-auth-id' });
  chatOperation.mockResolvedValue({ id: '42', kind: 'gif_library', gif_reference: '/gif-library/heart.gif' });
});

describe('SRS-201.11 send a GIF from the library', () => {
  it('saves the message with the reference and nothing else', async () => {
    const response = await send({ reference: '/gif-library/heart.gif' });
    expect(response.status).toBe(201);
    expect(chatOperation).toHaveBeenCalledWith('socialu_send_gif_library', {
      p_auth_id: 'sender-auth-id', p_conversation_id: '7', p_reference: '/gif-library/heart.gif',
    });
    expect(await response.json()).toEqual({ message: expect.objectContaining({ kind: 'gif_library' }) });
  });

  it('accepts every GIF the library actually ships', async () => {
    for (const gif of GIF_LIBRARY) {
      chatOperation.mockClear();
      expect((await send({ reference: `/gif-library/${gif.id}.gif` })).status, gif.id).toBe(201);
      expect(chatOperation).toHaveBeenCalledOnce();
    }
  });

  it('refuses a reference the catalogue does not know, before the database is asked', async () => {
    // Each of these would otherwise end up in an <img src> in someone else's conversation.
    for (const reference of [
      '/gif-library/../../../etc/passwd.gif', 'https://example.com/tracker.gif', '/gif-library/nope.gif',
      '/gif-library/heart.png', 'javascript:alert(1)', '', null, 7, { id: 'heart' },
    ]) {
      chatOperation.mockClear();
      const response = await send({ reference });
      expect(response.status, JSON.stringify(reference)).toBe(400);
      expect(chatOperation, JSON.stringify(reference)).not.toHaveBeenCalled();
    }
  });

  it('refuses a body with no reference at all', async () => {
    expect((await send({})).status).toBe(400);
    expect(chatOperation).not.toHaveBeenCalled();
  });

  it('says the conversation is not available rather than inventing one', async () => {
    chatOperation.mockRejectedValue(new AccountError('Conversation not available.', 404));
    expect((await send({ reference: '/gif-library/lol.gif' })).status).toBe(404);
  });

  it('refuses an unauthenticated request before anything else', async () => {
    verified.mockRejectedValue(new AccountError('Please sign in.', 401));
    expect((await send({ reference: '/gif-library/lol.gif' })).status).toBe(401);
    expect(chatOperation).not.toHaveBeenCalled();
  });

  it('stores no file and signs no link', async () => {
    // The whole reason this route exists beside the upload one. If it ever grows a storage call, the
    // library has stopped being free to send.
    // Comments are stripped first: the header of that file explains at length what it does NOT do, and
    // names storage and resolveMediaUrl to say they are absent. Searching the prose would pass -- or
    // here, fail -- for the wrong reason. Split on \r?\n because git checks this out with CRLF.
    const route = readFileSync(process.cwd() + '/app/api/conversations/[id]/gif-library/route.ts', 'utf8')
      .split(/\r?\n/).map((line) => line.replace(/\/\/.*/, '')).join('\n');
    expect(route).not.toContain('storage');
    expect(route).not.toContain('resolveMediaUrl');
    expect(route).not.toContain('formData');
  });
});

describe('SRS-201.11 the migrations behind it', () => {
  const root = process.cwd();
  const strip = (text: string) => text.split(/\r?\n/).map((line) => line.replace(/--.*/, '')).join('\n');
  const send = readFileSync(root + '/supabase/migrations/20261126120000_chat_send_gif_library.sql', 'utf8');
  const history = readFileSync(root + '/supabase/migrations/20261126130000_chat_gif_library_in_history.sql', 'utf8');
  const sendSql = strip(send);
  const historySql = strip(history);

  it('writes a reference and no media asset', () => {
    expect(sendSql).toContain("'gif_library'");
    expect(sendSql).toContain('gif_reference');
    expect(sendSql).not.toContain('media_assets');
    expect(sendSql).not.toContain('upload_policies');
  });

  it('checks the reference in the database as well as in the route', () => {
    expect(sendSql).toMatch(/\^\/gif-library\//);
    expect(sendSql).toContain('SCF05');
  });

  it('broadcasts through the per-session check, not realtime.send', () => {
    expect(sendSql).toContain('socialu.send_to_active_sessions(');
    expect(sendSql).not.toMatch(/PERFORM realtime\.send\(/);
  });

  it('is server-only', () => {
    expect(sendSql).toMatch(/REVOKE ALL ON FUNCTION public\.socialu_send_gif_library/);
    expect(sendSql).toContain('TO service_role');
  });

  it('adds gif_library to the history on top of gif_upload, not instead of it', () => {
    expect(historySql).toContain("msg.kind IN (''text'', ''emoji'', ''photo'', ''gif_upload'')");
    expect(historySql).toContain("msg.kind IN (''text'', ''emoji'', ''photo'', ''gif_upload'', ''gif_library'')");
  });

  it('teaches the history to read and return the reference', () => {
    expect(historySql).toContain('msg.reply_to_id, msg.asset_id, msg.gif_reference,');
    expect(historySql).toContain("jsonb_build_object(''gif_reference'', m.gif_reference)");
  });

  it('rewrites the deployed function and fails loudly if its shape moved', () => {
    expect(historySql).toContain('pg_get_functiondef');
    expect(historySql).not.toContain('CREATE OR REPLACE FUNCTION public.socialu_conversation_messages');
    expect((historySql.match(/RAISE EXCEPTION/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('leaves the photos map alone, because a library GIF needs no signed link', () => {
    expect(historySql).not.toContain('chat_photo_displays');
    expect(historySql).not.toContain("pm.kind");
  });
});

describe('SRS-201.11 the conversation shows it', () => {
  const page = readFileSync(process.cwd() + '/app/messages/[conversationId]/page.tsx', 'utf8');

  it('renders a gif_library message straight from its reference', () => {
    expect(page).toContain("message.kind === 'gif_library'");
    expect(page).toMatch(/kind === 'gif_library'[\s\S]{0,200}<img[\s\S]{0,160}src=\{message\.gif_reference\}/);
  });

  it('asks for no signed link for one', () => {
    // hasPhotos drives the refresh timer. A library GIF in it would reload the history every hour for
    // nothing.
    expect(page).toMatch(/hasPhotos = messages\.some\(\(message\) => message\.kind === 'photo' \|\| message\.kind === 'gif_upload'\)/);
  });

  it('posts the reference to the library route', () => {
    expect(page).toContain('/gif-library`');
    expect(page).toContain('libraryGifReference(gif.id)');
  });

  it('wires the picker up to send one', () => {
    expect(page).toContain('onPickGif={(gif) => void sendLibraryGif(gif)}');
  });

  it('names a GIF in a reply preview', () => {
    expect(page).toContain("quoted.kind === 'gif_upload' || quoted.kind === 'gif_library' ? 'GIF'");
  });
});
