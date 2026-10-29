import { conversationIdParam } from '../../../../../../../lib/chat-access';
import { SNIPE_NOT_AVAILABLE, snipeIdParam, snipeOperation, snipeResponse, snipeStorage, snipeUser } from '../../../../../../../lib/snipe';
export const dynamic = 'force-dynamic';

type PhotoReference = { storage_key: string; mime_type: string };
const PRIVATE_IMAGE = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Content-Disposition': 'inline',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// SRS-511.1, 514.6: no public or signed photo URL exists. Every image request re-verifies the session,
// account lifecycle, conversation membership and the request's current status before streaming bytes.
// Missing, hidden and removed photos give the same answer.
export async function GET(request: Request, context: { params: Promise<{ id: string; snipeId: string }> }) {
  try {
    const user = await snipeUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    const snipeId = snipeIdParam(params.snipeId);
    const photo = await snipeOperation<PhotoReference>(user.id, 'photo', conversationId, snipeId);
    const { data, error } = await snipeStorage().download(photo.storage_key);
    if (error || !data) {
      console.error('Snipe photo object could not be read', { snipeId });
      return notAvailable();
    }
    const bytes = await data.arrayBuffer();
    // A withdrawal, removal or departure may have committed while the bytes were downloading.
    // Check again (throws SN404 -> 404) so a newly removed photo is never sent.
    const again = await snipeOperation<PhotoReference>(user.id, 'photo', conversationId, snipeId);
    if (again?.storage_key !== photo.storage_key) return notAvailable();
    return new Response(bytes, { headers: { ...PRIVATE_IMAGE, 'Content-Type': photo.mime_type, 'Content-Length': String(bytes.byteLength) } });
  } catch (error) { return snipeResponse(error); }
}

const notAvailable = () => Response.json({ error: SNIPE_NOT_AVAILABLE }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
