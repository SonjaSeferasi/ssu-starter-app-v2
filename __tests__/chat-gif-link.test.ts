import { beforeEach, describe, expect, it, vi } from 'vitest';

// SRS-201.21 (UR-201): "The system shall allow a conversation participant to send a GIF by giving a link
// to it, subject to the same supported-format and file-size requirements as a GIF uploaded from the
// participant's device."
//
// Two halves: the shape rules the composer and the server share, and the rules about where the server is
// willing to connect. The second half is the one worth being strict about -- this is the only place the
// application fetches an address someone else chose.
const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup }));

import {
  GIF_LINK_EMPTY, GIF_LINK_MALFORMED, GIF_LINK_NOT_GIF, GIF_LINK_NOT_HTTPS, GIF_LINK_TOO_LONG,
  GIF_LINK_UNREACHABLE, gifLinkError, gifLinkLabel, parseGifLink,
} from '../lib/chat-gif-link';
import { fetchLinkedGif, isPublicAddress } from '../lib/chat-gif-link-server';
import { GIF_MAX_BYTES, GIF_TOO_LARGE } from '../lib/chat-gif';
import { AccountError } from '../lib/socialu-account';

const gif = (size = 64) => {
  const bytes = Buffer.alloc(size, 7);
  Buffer.from('GIF89a').copy(bytes);
  return bytes;
};

function answer(bytes: Buffer, { status = 200, type = 'image/gif', headers = {} as Record<string, string> } = {}) {
  return new Response(bytes, { status, headers: { 'content-type': type, ...headers } });
}

describe('SRS-201.21 what counts as a link to try', () => {
  it('wants something at all', () => {
    expect(gifLinkError('')).toBe(GIF_LINK_EMPTY);
    expect(gifLinkError('   ')).toBe(GIF_LINK_EMPTY);
    expect(gifLinkError(undefined)).toBe(GIF_LINK_EMPTY);
    expect(gifLinkError(42)).toBe(GIF_LINK_EMPTY);
  });

  it('takes an https link and trims it', () => {
    expect(gifLinkError('https://media.example.com/a.gif')).toBeNull();
    expect(parseGifLink('  https://media.example.com/a.gif  ')?.href).toBe('https://media.example.com/a.gif');
  });

  it('refuses http rather than quietly upgrading it', () => {
    // Upgrading would be a guess about someone else's server, and fetching over http would put the
    // campus network between the student and what they are sending.
    expect(gifLinkError('http://media.example.com/a.gif')).toBe(GIF_LINK_NOT_HTTPS);
  });

  it('refuses every other scheme before the server sees it', () => {
    for (const bad of ['data:image/gif;base64,R0lGODlh', 'file:///etc/passwd', 'javascript:alert(1)']) {
      expect(gifLinkError(bad), bad).toBe(GIF_LINK_NOT_HTTPS);
    }
  });

  it('refuses a link carrying credentials', () => {
    expect(gifLinkError('https://user:pass@example.com/a.gif')).toBe(GIF_LINK_MALFORMED);
  });

  it('refuses something that is not a link and something absurdly long', () => {
    expect(gifLinkError('just some words')).toBe(GIF_LINK_MALFORMED);
    expect(gifLinkError('https://localhost/a.gif')).toBe(GIF_LINK_MALFORMED);
    expect(gifLinkError(`https://example.com/${'a'.repeat(3000)}.gif`)).toBe(GIF_LINK_TOO_LONG);
  });

  it('names the stored copy after the link, or not at all', () => {
    expect(gifLinkLabel(new URL('https://example.com/dog/party.gif'))).toBe('party.gif');
    expect(gifLinkLabel(new URL('https://example.com/watch?v=1'))).toBe('linked.gif');
  });
});

describe('SRS-201.21 where the server is willing to connect', () => {
  it('refuses the addresses that make this a way into the network', () => {
    for (const ip of [
      '127.0.0.1', '0.0.0.0', '10.0.0.5', '172.16.9.9', '172.31.255.254', '192.168.1.1',
      '169.254.169.254', '100.64.0.1', '198.18.0.1', '203.0.113.9', '224.0.0.1', '255.255.255.255',
    ]) {
      expect(isPublicAddress(ip, 4), ip).toBe(false);
    }
    for (const ip of ['::1', '::', 'fc00::1', 'fd00::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1']) {
      expect(isPublicAddress(ip, 6), ip).toBe(false);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '151.101.1.140', '172.32.0.1', '192.167.1.1']) {
      expect(isPublicAddress(ip, 4), ip).toBe(true);
    }
    expect(isPublicAddress('2606:4700:4700::1111', 6)).toBe(true);
  });
});

describe('SRS-201.21 opening the link', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    lookup.mockResolvedValue([{ address: '151.101.1.140', family: 4 }]);
    vi.stubGlobal('fetch', fetchMock);
  });

  const open = (url = 'https://media.example.com/a.gif') => fetchLinkedGif(url);
  const refusal = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return null;
    } catch (error) {
      return error instanceof AccountError ? error.message : String(error);
    }
  };

  it('returns the GIF behind the link', async () => {
    fetchMock.mockResolvedValue(answer(gif(128)));
    const bytes = await open();
    expect(bytes.byteLength).toBe(128);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: 'manual' }));
  });

  it('never connects to a name that resolves anywhere private', async () => {
    lookup.mockResolvedValue([{ address: '151.101.1.140', family: 4 }, { address: '10.0.0.5', family: 4 }]);
    expect(await refusal(open())).toBe(GIF_LINK_UNREACHABLE);
    // The point of the whole exercise: it was refused before anything was requested.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks each redirect hop instead of trusting the first', async () => {
    lookup.mockResolvedValueOnce([{ address: '151.101.1.140', family: 4 }])
      .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    fetchMock.mockResolvedValueOnce(new Response(null, {
      status: 302, headers: { location: 'https://metadata.example.com/latest' },
    }));
    expect(await refusal(open())).toBe(GIF_LINK_UNREACHABLE);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('follows an ordinary redirect', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: 'https://cdn.example.com/a.gif' } }))
      .mockResolvedValueOnce(answer(gif(96)));
    expect((await open()).byteLength).toBe(96);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up rather than going round forever', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://a.example.com/b.gif' } }));
    expect(await refusal(open())).toBe(GIF_LINK_UNREACHABLE);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('will not be redirected off https', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://cdn.example.com/a.gif' } }));
    expect(await refusal(open())).toBe(GIF_LINK_UNREACHABLE);
  });

  it('refuses a page that is not a GIF, by its type and by its bytes', async () => {
    fetchMock.mockResolvedValueOnce(answer(gif(), { type: 'text/html' }));
    expect(await refusal(open())).toBe(GIF_LINK_NOT_GIF);

    // A server that claims image/gif and sends something else is caught by the header.
    fetchMock.mockResolvedValueOnce(answer(Buffer.from('<html>not a gif at all</html>')));
    expect(await refusal(open())).toBe(GIF_LINK_NOT_GIF);
  });

  it('refuses an error page', async () => {
    fetchMock.mockResolvedValueOnce(answer(gif(), { status: 404 }));
    expect(await refusal(open())).toBe(GIF_LINK_UNREACHABLE);
  });

  it('believes a declared size over the limit without reading a byte', async () => {
    fetchMock.mockResolvedValueOnce(answer(gif(), { headers: { 'content-length': String(GIF_MAX_BYTES + 1) } }));
    expect(await refusal(open())).toBe(GIF_TOO_LARGE);
  });

  it('stops reading a body that goes over the limit even when nothing was declared', async () => {
    // The honest case: no content-length, or a lying one. The running total is what has to stop it.
    const big = Buffer.alloc(GIF_MAX_BYTES + 1000, 1);
    Buffer.from('GIF89a').copy(big);
    fetchMock.mockResolvedValueOnce(answer(big));
    expect(await refusal(open())).toBe(GIF_TOO_LARGE);
  });

  it('says the link could not be opened when the network says nothing useful', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED 10.0.0.1:443'));
    // The message must not repeat what it could not reach: that answer is itself information about the
    // network this server sits on.
    const message = await refusal(open());
    expect(message).toBe(GIF_LINK_UNREACHABLE);
    expect(message).not.toContain('10.0.0.1');
  });

  it('applies the shape rules before any of this', async () => {
    expect(await refusal(fetchLinkedGif('http://example.com/a.gif'))).toBe(GIF_LINK_NOT_HTTPS);
    expect(lookup).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
