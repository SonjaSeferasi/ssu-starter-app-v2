import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// SRS-201.15 (#1409): a sent GIF has to be in the history, signed like a photo, and rendered as an image.
// The conversation page is a client component full of hooks and fetches and there is no DOM in this suite,
// so the page half is read as source, the way chat-photo-camera.test.ts reads it. The migration half is
// read for the same reason the send tests read theirs: the two must not disagree silently.
const root = process.cwd();
const page = readFileSync(root + '/app/messages/[conversationId]/page.tsx', 'utf8');
const migration = readFileSync(root + '/supabase/migrations/20261124130000_chat_gif_in_history.sql', 'utf8');
// Comments are stripped before searching. Split on \r?\n and anchor nothing: git checks these files out
// with CRLF on Windows, and '.' in a JavaScript regular expression does not match '\r'.
const sql = migration.split(/\r?\n/).map((line) => line.replace(/--.*/, '')).join('\n');

describe('SRS-201.15 the history returns a sent GIF', () => {
  // The phrases the migration searches for and writes are themselves SQL string literals, so every quote
  // inside them is doubled in the file. These assertions read what is actually there.
  it('adds gif_upload to the kinds the history selects', () => {
    expect(sql).toContain("msg.kind IN (''text'', ''emoji'', ''photo'')");
    expect(sql).toContain("msg.kind IN (''text'', ''emoji'', ''photo'', ''gif_upload'')");
  });

  it('puts a GIF in the photos map, so its key is signed with the rest', () => {
    expect(sql).toContain("WHERE pm.kind = ''photo'' AND NOT pm.is_deleted");
    expect(sql).toContain("WHERE pm.kind IN (''photo'', ''gif_upload'') AND NOT pm.is_deleted");
  });

  it('rewrites the deployed function instead of restating it', () => {
    // socialu_conversation_messages carries rules from six migrations. Copying its body into this file
    // would freeze today's version and undo anything that lands before it is applied.
    expect(sql).toContain('pg_get_functiondef');
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION public.socialu_conversation_messages');
  });

  it('fails loudly if either phrase it edits has moved', () => {
    // A silent no-op here would leave GIFs invisible with nothing to show for it.
    expect(sql).toMatch(/RAISE EXCEPTION/);
    expect((sql.match(/RAISE EXCEPTION/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('adds no table and no column', () => {
    expect(sql).not.toMatch(/CREATE TABLE/i);
    expect(sql).not.toMatch(/ALTER TABLE/i);
  });
});

describe('SRS-201.15 the conversation shows the GIF', () => {
  it('renders a gif_upload message as an image', () => {
    expect(page).toContain("message.kind === 'gif_upload'");
    // An <img>, so it animates. A canvas or a poster frame would show one still frame.
    expect(page).toMatch(/kind === 'gif_upload'[\s\S]{0,400}<img/);
  });

  it('describes the GIF for a screen reader', () => {
    expect(page).toContain("'GIF you sent'");
    expect(page).toContain('`GIF from ${sender}`');
  });

  it('refreshes expiring links when the conversation holds only GIFs', () => {
    // hasPhotos drives the link-refresh timer. Without gif_upload here, a conversation of GIFs would let
    // every link expire and show nothing after an hour.
    expect(page).toMatch(/hasPhotos = messages\.some\(\(message\) => message\.kind === 'photo' \|\| message\.kind === 'gif_upload'\)/);
  });

  it('asks for a fresh link when a live GIF arrives without one', () => {
    expect(page).toMatch(/kind === 'photo' \|\| message\.kind === 'gif_upload'\) && !message\.photo_url/);
  });

  it('names a GIF in a reply preview rather than falling through to empty text', () => {
    // A GIF message carries no text, so without its own case the quote would be blank.
    expect(page).toContain("quoted.kind === 'gif_upload' ? 'GIF'");
  });

  it('offers no delete control on a GIF', () => {
    // #1106 added deletion for photos only, and the route behind it refuses anything else. Showing the
    // button on a GIF would promise something the server would refuse.
    // Anchored on the render branch itself -- `{message.kind === 'gif_upload'` with its opening brace --
    // because the same comparison appears earlier in hasPhotos and in the live-arrival check, and a looser
    // match would swallow the whole file and pass for the wrong reason.
    const start = page.indexOf("{message.kind === 'gif_upload'");
    const end = page.indexOf(": message.kind === 'photo'", start);
    const gifBranch = start >= 0 && end > start ? page.slice(start, end) : '';
    expect(gifBranch, 'the gif branch was not found in the page').not.toBe('');
    expect(gifBranch).not.toContain('canDeletePhoto');
    expect(gifBranch).not.toContain('setConfirmingDelete');
  });
});

describe('SRS-201.15 a GIF travels as its own kind', () => {
  it('is a kind the message type allows', async () => {
    const client = readFileSync(root + '/lib/realtime-client.ts', 'utf8');
    expect(client).toContain("kind?: 'emoji' | 'photo' | 'gif_upload'");
  });

  it('is not folded into photo anywhere in the page', () => {
    // The two are stored under different upload contexts, and only a photo is ever re-encoded.
    expect(page).not.toContain("kind === 'photo' ? 'gif'");
    expect(page).not.toMatch(/kind\s*===\s*'gif_upload'\s*\|\|\s*message\.kind\s*===\s*'photo'\s*\?\s*'Photo'/);
  });
});
