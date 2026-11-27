import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
import { isLibraryReference } from '../../../../../lib/chat-gif-library';
export const dynamic = 'force-dynamic';

// SRS-201.11 (UR-201): a conversation participant sends a GIF chosen from the bundled library.
// The body is JSON with one field, `reference`. The sender always comes from the verified token.
//
// Next to app/api/conversations/[id]/gifs/route.ts this route does almost nothing, and that is the
// point: a library GIF is a file this app already ships, so there is no upload, no storage write, no
// media asset, no size check and no signed URL -- only a reference the page can render as it stands.
//
// The reference is still checked twice, here and again in socialu_send_gif_library, because it ends up
// in an <img src> in someone else's conversation. Here it is checked against the catalogue itself:
// isLibraryReference refuses anything whose id is not one of the GIFs in lib/chat-gif-library.ts, which
// is stricter than any pattern the database can apply on its own.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);

    const body = await jsonBody(request);
    const reference = body.reference;
    if (!isLibraryReference(reference)) throw new AccountError('Choose a GIF from the library.', 400);

    const message = await chatOperation('socialu_send_gif_library', {
      p_auth_id: user.id, p_conversation_id: conversationId, p_reference: reference as string,
    });

    // No link to resolve: the reference is the src. The sender sees it immediately, and everyone else
    // gets the same reference in the broadcast the function sends.
    return Response.json({ message }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
