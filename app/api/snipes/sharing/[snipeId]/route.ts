import { AccountError, jsonBody } from '../../../../../lib/socialu-account';
import { NO_STORE, snipeIdParam, snipeResponse, snipeUser } from '../../../../../lib/snipe';
import { snipeSharingAction } from '../../../../../lib/snipe-sharing';
export const dynamic = 'force-dynamic';

// SRS-511.12, 514.1 to 514.7, 514.15: the photographer removes, or an originally tagged friend who approved
// sharing withdraws, a published Snipe by its ID, even after leaving the conversation or after the friendship
// ended. Only `action` is read from the body; the student comes from the token. Unrelated, missing and
// unpublished Snipes all return the same 404. A repeat returns the stored state (`changed: false`).
export async function PATCH(request: Request, context: { params: Promise<{ snipeId: string }> }) {
  try {
    const user = await snipeUser(request);
    const snipeId = snipeIdParam((await context.params).snipeId);
    const action = (await jsonBody(request)).action;
    if (action !== 'withdraw' && action !== 'remove') throw new AccountError('Choose withdraw or remove.', 400);
    const outcome = await snipeSharingAction(user.id, action, snipeId);
    return Response.json({ changed: outcome.changed, snipe: outcome.snipe }, { headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
