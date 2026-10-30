import { conversationIdParam } from '../../../../../../../lib/chat-access';
import { SNIPE_BUCKET, SNIPE_NOT_AVAILABLE, snipeIdParam, snipeObject, snipeOperation, snipeResponse, snipeUser } from '../../../../../../../lib/snipe';
import { SNIPE_PHOTO_POLICY } from '../../../../../../../lib/snipe-policy';
import { readCapped } from '../../../../../../../lib/snipe-transport';
export const dynamic = 'force-dynamic';

type PhotoReference = { storage_key: string; mime_type: string };
const PRIVATE_IMAGE = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Content-Disposition': 'inline',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
const CHUNK = 64 * 1024;

// SRS-511.1, 514.6: no public or signed photo URL exists. Every image request verifies the session and
// account, then the account lifecycle, conversation membership and the request's current status, reads the
// whole object from private Storage (bounded by the 10 MB photo policy, which every committed copy satisfies),
// and only then checks the account lifecycle, membership and Snipe status in the database again (the session
// is not re-verified after the read). A withdrawal, removal or departure that commits while Storage is still sending
// therefore sends nothing. Missing, hidden and removed photos give the same answer. The checked bytes are
// sent as a chunked stream with no Content-Length, so a full-size photo is not limited by a buffered response cap.
export async function GET(request: Request, context: { params: Promise<{ id: string; snipeId: string }> }) {
  try {
    const user = await snipeUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    const snipeId = snipeIdParam(params.snipeId);
    const photo = await snipeOperation<PhotoReference>(user.id, 'photo', conversationId, snipeId);
    const object = await snipeObject(SNIPE_BUCKET, photo.storage_key, request.signal);
    if (!object.body) {
      console.error('Snipe photo object could not be read', { snipeId });
      return notAvailable();
    }
    let bytes: Uint8Array | null;
    try { bytes = await readCapped(object.body, SNIPE_PHOTO_POLICY.maxBytes); }
    catch {
      // A cancelled request needs no log; a broken Storage stream does. Neither sends any byte.
      if (!request.signal.aborted) console.error('Snipe photo object read was interrupted', { snipeId });
      return notAvailable();
    }
    if (!bytes?.byteLength) {
      console.error('Snipe photo object is outside the photo policy', { snipeId });
      return notAvailable();
    }
    // Fresh check after the read has completed (throws SN404 -> 404), before the first byte is sent.
    const again = await snipeOperation<PhotoReference>(user.id, 'photo', conversationId, snipeId);
    if (again?.storage_key !== photo.storage_key) return notAvailable();
    return new Response(chunked(bytes), { headers: { ...PRIVATE_IMAGE, 'Content-Type': photo.mime_type } });
  } catch (error) { return snipeResponse(error); }
}

// Pull-based, so the platform streams the response instead of buffering it.
function chunked(bytes: Uint8Array) {
  let rest: Uint8Array | null = bytes;
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!rest || offset >= rest.byteLength) { rest = null; controller.close(); return; }
      controller.enqueue(rest.subarray(offset, offset + CHUNK));
      offset += CHUNK;
    },
    cancel() { rest = null; },
  });
}

const notAvailable = () => Response.json({ error: SNIPE_NOT_AVAILABLE }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
