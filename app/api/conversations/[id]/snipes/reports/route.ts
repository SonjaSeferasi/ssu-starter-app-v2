import { conversationIdParam } from '../../../../../../lib/chat-access';
import { NO_STORE, snipeModeration, snipeResponse, snipeUser } from '../../../../../../lib/snipe';
export const dynamic = 'force-dynamic';

// SRS-514.10: a current owner or administrator of this group opens its unresolved Snipe reports. Everyone else
// is refused (403 for other members, 404 for non-participants, 403 SNIPE_REPORT_NOT_ALLOWED in direct messages).
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await snipeUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    return Response.json(await snipeModeration(user.id, 'queue', conversationId), { headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
