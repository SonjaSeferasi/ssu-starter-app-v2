import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

// Loopback stand-in for the two private Snipe buckets, shared by scripts/tests/snipe-basic.browser.ts and
// scripts/demo/snipe-local.ts. No hosted Storage, keys or data. It mirrors the provider behavior the app relies on:
// - the server (service key) can read, write, delete and mint upload-only URLs; browser keys can do none of it;
// - a signed upload URL is valid for exactly one staging key, cannot overwrite (upsert:false) and is limited
//   like the staging bucket (10,000,000 bytes, JPEG/PNG);
// - the browser PUT is cross-origin, so preflight and CORS headers are answered as Storage does;
// - object reads are streamed in chunks; signed READ URLs never exist (any attempt is recorded and refused).
// Bucket names must match lib/snipe.ts and the migrations (not imported: lib/snipe pulls in server modules).
export const SNIPE_BUCKET = 'socialu-snipe-photos';
export const SNIPE_STAGING_BUCKET = 'socialu-snipe-staging';
const BUCKETS = new Set([SNIPE_BUCKET, SNIPE_STAGING_BUCKET]);
const STAGING_MAX_BYTES = 10_000_000;
const STAGING_TYPES = ['image/jpeg', 'image/png'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, x-upsert, cache-control, authorization, apikey' };

export type SignedUpload = { path: string; bytes: number; type: string; status: number };

export function createSnipeStorage(serverKey: string) {
  // `${bucket}/${object name}` -> stored bytes
  const objects = new Map<string, { bytes: Buffer; type: string }>();
  const uploadTokens = new Map<string, string>();
  const log = { signedReads: [] as string[], otherBuckets: [] as string[], signedUploads: [] as SignedUpload[], browserReads: [] as string[] };
  const isServer = (request: IncomingMessage) => request.headers.apikey === serverKey && request.headers.authorization === `Bearer ${serverKey}`;

  // Returns false for paths that are not Storage, so the caller can route them elsewhere.
  function handle(request: IncomingMessage, response: ServerResponse, path: string, url: URL, raw: Buffer): boolean {
    if (!path.startsWith('/storage/v1/')) return false;
    const reply = (status: number, data: unknown, headers: Record<string, string> = {}) => {
      response.writeHead(status, { 'Content-Type': 'application/json', ...headers }); response.end(JSON.stringify(data));
    };
    const rest = path.slice('/storage/v1/'.length);
    if (request.method === 'OPTIONS' && rest.startsWith('object/upload/sign/')) { response.writeHead(204, CORS); response.end(); return true; }
    const bucket = /^(?:bucket|object\/upload\/sign|object\/sign|object)\/([^/]+)/.exec(rest)?.[1] ?? '';
    if (!BUCKETS.has(bucket)) { log.otherBuckets.push(path); reply(404, { statusCode: '404', error: 'not_found', message: 'Bucket not found' }); return true; }
    if (rest === `bucket/${bucket}`) { reply(200, { id: bucket, name: bucket, public: false }); return true; }
    if (rest.startsWith('object/sign/')) { log.signedReads.push(path); reply(403, { statusCode: '403', error: 'Unauthorized', message: 'No signed read URLs' }); return true; }

    if (rest.startsWith(`object/upload/sign/${bucket}/`)) {
      const name = rest.slice(`object/upload/sign/${bucket}/`.length);
      if (request.method === 'POST') {
        // Minting needs the server key, the staging bucket and upsert:false.
        if (!isServer(request) || bucket !== SNIPE_STAGING_BUCKET || request.headers['x-upsert'] === 'true') {
          reply(403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' }); return true;
        }
        const token = randomUUID();
        uploadTokens.set(token, `${bucket}/${name}`);
        reply(200, { url: `/object/upload/sign/${bucket}/${name}?token=${token}` }); return true;
      }
      if (request.method === 'PUT') {
        const entry: SignedUpload = { path: `${bucket}/${name}`, bytes: raw.length, type: String(request.headers['content-type'] || ''), status: 200 };
        log.signedUploads.push(entry);
        const fail = (status: number, error: string, message: string) => { entry.status = status; reply(status, { statusCode: String(status), error, message }, CORS); return true; };
        if (uploadTokens.get(url.searchParams.get('token') || '') !== entry.path) return fail(403, 'InvalidSignature', 'The signature is invalid for this object');
        if (raw.length > STAGING_MAX_BYTES) return fail(413, 'Payload too large', 'The object exceeded the maximum allowed size');
        if (!STAGING_TYPES.includes(entry.type)) return fail(415, 'invalid_mime_type', `mime type ${entry.type} is not supported`);
        if (objects.has(entry.path)) { entry.status = 400; reply(400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }, CORS); return true; }
        objects.set(entry.path, { bytes: raw, type: entry.type });
        reply(200, { Key: entry.path }, CORS); return true;
      }
    }

    if (!isServer(request)) { log.browserReads.push(path); reply(403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' }); return true; }
    if (rest === `object/${bucket}` && request.method === 'DELETE') {
      for (const name of JSON.parse(raw.toString()).prefixes) objects.delete(`${bucket}/${name}`);
      reply(200, []); return true;
    }
    if (rest.startsWith(`object/${bucket}/`)) {
      const key = rest.slice('object/'.length);
      if (request.method === 'POST') {
        if (objects.has(key)) { reply(400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }); return true; }
        objects.set(key, { bytes: raw, type: String(request.headers['content-type']) });
        reply(200, { Key: key, Id: randomUUID() }); return true;
      }
      const object = objects.get(key);
      if (!object) { reply(400, { statusCode: '404', error: 'not_found', message: 'Object not found' }); return true; }
      // Chunked, like Storage: no Content-Length is promised to the reader.
      response.writeHead(200, { 'Content-Type': object.type });
      for (let offset = 0; offset < object.bytes.length; offset += 65536) response.write(object.bytes.subarray(offset, offset + 65536));
      response.end(); return true;
    }
    reply(404, { statusCode: '404', error: 'not_found', message: 'Unknown local Storage endpoint' }); return true;
  }

  return { objects, log, handle };
}
