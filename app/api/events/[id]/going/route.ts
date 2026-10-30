import { accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { eventIdParam, reactToEvent } from '../../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

// Say "I'm going" (POST) or remove it (DELETE); the student always comes from the verified token.
async function handle(request: Request, context: { params: Promise<{ id: string }> }, action: 'going' | 'not_going') {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const engagement = await reactToEvent(user.id, eventId, action);
    return Response.json({ engagement }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => handle(request, context, 'going');
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => handle(request, context, 'not_going');
