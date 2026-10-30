import { AccountError, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';

// The Whisper Wall -- delete a confession the caller authored. Ownership
// enforcement lives in socialu_whisper_delete.
export async function DELETE(request: Request, { params }: { params: Promise<{ confessionId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { confessionId: confessionIdParam } = await params;
    const confessionId = Number(confessionIdParam);
    if (!Number.isInteger(confessionId)) throw new AccountError('Invalid confession id.', 400);

    await feedRpc('socialu_whisper_delete', { p_auth_id: user.id, p_confession_id: confessionId });
    return Response.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
