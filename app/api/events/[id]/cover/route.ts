import { AccountError, accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { eventIdParam } from '../../../../../lib/event-engagement';
import { removeCover, requireEventHost, saveCover, withCoverUrls } from '../../../../../lib/event-covers';
export const dynamic = 'force-dynamic';

// Add or replace an event's cover photo (multipart field `image`). Only the event's host can do this.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    await requireEventHost(user.id, eventId);
    let form: FormData;
    try { form = await request.formData(); } catch { throw new AccountError('Choose a photo to upload.', 400); }
    const image = form.get('image');
    if (!(image instanceof File) || image.size === 0) throw new AccountError('Choose a photo to upload.', 400);
    await saveCover(eventId, image);
    const [{ cover_url }] = await withCoverUrls([{ event_id: eventId }]);
    return Response.json({ cover_url }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// Remove the cover photo; the event goes back to its generated art.
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    await requireEventHost(user.id, eventId);
    await removeCover(eventId);
    return Response.json({ cover_url: null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
