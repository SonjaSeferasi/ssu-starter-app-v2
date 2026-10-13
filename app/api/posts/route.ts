import { verifiedUser, accountResponse, accountClient, jsonBody, textField } from '../../../lib/socialu-account';
import { feedRpc } from '../../../lib/feed';
import { shapeFeedPosts, type RawFeedRow } from '../../../lib/posts';

// SRS-303.1/303.2/303.3, SRS-315.1-315.3 — create a text post. author_id comes
// only from the verified session, never the request body. Validation (non-blank
// text, visibility) lives in the socialu_create_post RPC.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);

    const row = await feedRpc<RawFeedRow>('socialu_create_post', {
      p_auth_id: user.id,
      p_text: textField(body.textContent),
      p_visibility: typeof body.visibility === 'string' ? body.visibility : null,
    });

    const [post] = await shapeFeedPosts(accountClient(), [row]);
    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return accountResponse(error);
  }
}
