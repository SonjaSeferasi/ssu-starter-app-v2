import { lookup } from 'node:dns/promises';
import { AccountError } from './socialu-account';
import { GIF_LINK_NOT_GIF, GIF_LINK_UNREACHABLE, gifLinkError, parseGifLink } from './chat-gif-link';
import { GIF_MAX_BYTES, GIF_TOO_LARGE, isGifBytes } from './chat-gif';

// SRS-201.21 (UR-201): opening a link a student pasted and reading the GIF behind it.
//
// This is the only place in the application where the server fetches an address someone else chose, so
// it is written as if the address is hostile, because sometimes it will be. Four things are enforced:
//
//   1. WHERE it may point. The hostname is resolved first and every address it resolves to must be a
//      public one. Without this, 'https://localhost/...', 'https://169.254.169.254/...' (the metadata
//      service on a cloud host) or an internal hostname would make this route into a window onto
//      whatever the server itself can reach -- the server-side request forgery that turns a harmless
//      feature into a way of reading things no student should see.
//   2. HOW FAR it may go. Redirects are followed by hand, at most three, and each hop is checked the
//      same way. 'redirect: follow' would check the first address and then go wherever it was sent.
//   3. HOW LONG it may take. One timeout over the whole exchange, so a server that answers one byte a
//      minute cannot hold a request open.
//   4. HOW MUCH may come back. The body is read in chunks and abandoned the moment it passes the GIF
//      limit, so a link to an enormous file costs a few hundred kilobytes rather than filling memory.
//      Content-Length is checked first when it is offered, but it is only a claim, so the running total
//      is what actually stops it.
//
// What is NOT closed: between the DNS check and the fetch, the same name could answer with a different
// address (DNS rebinding). Closing it properly means connecting to the address that was checked and
// sending the hostname along, which Node's fetch does not expose; it would need an undici Agent with a
// custom lookup. The window is small and the payoff for an attacker is one GIF-shaped response, but it
// is a real gap and this comment is where it is written down.
//
// The bytes are stored, not the link. A message that kept the remote URL would show whatever that
// address serves tomorrow -- or nothing, when it goes away -- inside a conversation that has already
// been read. Copying it also means SRS-201.13's limit applies to what is actually sent.

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

/** IPv4 ranges that are not somewhere a student's GIF can live. */
function isPublicIPv4(ip: string) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return false;                 // this host, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return false;                 // carrier-grade NAT
  if (a === 169 && b === 254) return false;                           // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;                  // private
  if (a === 192 && b === 168) return false;                           // private
  if (a === 192 && b === 0) return false;                             // protocol assignments, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false;              // benchmarking
  if (a === 198 && b === 51) return false;                            // TEST-NET-2
  if (a === 203 && b === 0) return false;                             // TEST-NET-3
  if (a >= 224) return false;                                         // multicast, reserved, broadcast
  return true;
}

function isPublicIPv6(ip: string) {
  const value = ip.toLowerCase().split('%')[0];
  if (value === '::1' || value === '::') return false;                // loopback, unspecified
  // An IPv4 address wearing an IPv6 coat is still that IPv4 address.
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIPv4(mapped[1]);
  const head = parseInt(value.split(':')[0] || '0', 16);
  if ((head & 0xfe00) === 0xfc00) return false;                       // fc00::/7 unique local
  if ((head & 0xffc0) === 0xfe80) return false;                       // fe80::/10 link-local
  if ((head & 0xff00) === 0xff00) return false;                       // ff00::/8 multicast
  return true;
}

export function isPublicAddress(ip: string, family: number) {
  return family === 6 ? isPublicIPv6(ip) : isPublicIPv4(ip);
}

/** Every address the name resolves to must be public; one private answer is enough to refuse. */
async function assertPublicHost(hostname: string) {
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new AccountError(GIF_LINK_UNREACHABLE, 400);
  }
  if (!addresses.length) throw new AccountError(GIF_LINK_UNREACHABLE, 400);
  for (const { address, family } of addresses) {
    if (!isPublicAddress(address, family)) throw new AccountError(GIF_LINK_UNREACHABLE, 400);
  }
}

async function readCapped(response: Response) {
  const declared = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > GIF_MAX_BYTES) throw new AccountError(GIF_TOO_LARGE, 400);

  const body = response.body;
  if (!body) throw new AccountError(GIF_LINK_UNREACHABLE, 400);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      // Stop at the first chunk that takes it over. Nothing past this point would be stored anyway.
      if (total > GIF_MAX_BYTES) throw new AccountError(GIF_TOO_LARGE, 400);
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}

/**
 * Opens the link and returns the GIF behind it. Throws AccountError with a sentence a student can act
 * on; never leaks the address it could not reach, because that answer is itself information about the
 * network the server sits on.
 */
export async function fetchLinkedGif(raw: unknown): Promise<Buffer> {
  const refusal = gifLinkError(raw);
  if (refusal) throw new AccountError(refusal, 400);
  let url = parseGifLink(raw) as URL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; ; hop += 1) {
      await assertPublicHost(url.hostname);

      let response: Response;
      try {
        response = await fetch(url, {
          redirect: 'manual', signal: controller.signal, cache: 'no-store',
          // Nothing identifying the student or this project goes to a third-party host.
          headers: { Accept: 'image/gif,image/*;q=0.8', 'User-Agent': 'SocialU-chat-gif/1.0' },
        });
      } catch {
        throw new AccountError(GIF_LINK_UNREACHABLE, 400);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || hop >= MAX_REDIRECTS) throw new AccountError(GIF_LINK_UNREACHABLE, 400);
        let next: URL;
        try {
          next = new URL(location, url);
        } catch {
          throw new AccountError(GIF_LINK_UNREACHABLE, 400);
        }
        // A redirect may not change the scheme to something unchecked, and the new host is checked at
        // the top of the next turn of this loop.
        if (next.protocol !== 'https:') throw new AccountError(GIF_LINK_UNREACHABLE, 400);
        await response.body?.cancel().catch(() => {});
        url = next;
        continue;
      }

      if (!response.ok) throw new AccountError(GIF_LINK_UNREACHABLE, 400);

      // The type is a claim, so it only rules things out early; the header below is what decides.
      const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (type && type !== 'image/gif' && !type.startsWith('application/octet-stream')) {
        await response.body?.cancel().catch(() => {});
        throw new AccountError(GIF_LINK_NOT_GIF, 400);
      }

      const bytes = await readCapped(response);
      if (!bytes.byteLength) throw new AccountError(GIF_LINK_NOT_GIF, 400);
      if (!isGifBytes(bytes)) throw new AccountError(GIF_LINK_NOT_GIF, 400);
      return bytes;
    }
  } finally {
    clearTimeout(timer);
  }
}
