import { verifiedUser, accountResponse, accountClient, AccountError } from '../../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../../lib/feed';

// SRS-306.3/306.5 — remove one photo from a post the caller authored.
// socialu_remove_post_photo (20261015000100_edit_post.sql) enforces ownership
// and cleans up the DB rows; this deletes the actual Storage object since SQL
// can't reach Storage. A failed storage delete doesn't roll back the DB change
// -- the link is already gone, so the photo is gone from the post either way;
// an orphaned file at worst wastes storage, it never un-deletes the photo.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string; assetId: string }> }
) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam, assetId: assetIdParam } = await params;
    const postId = Number(postIdParam);
    const assetId = Number(assetIdParam);
    if (!Number.isInteger(postId) || !Number.isInteger(assetId)) {
      throw new AccountError('Invalid post or photo id.', 400);
    }

    const storageKey = await feedRpc<string | null>('socialu_remove_post_photo', {
      p_auth_id: user.id,
      p_post_id: postId,
      p_asset_id: assetId,
    });

    if (storageKey) {
      await accountClient().storage.from('media').remove([storageKey]);
    }

    return Response.json({ removed: true }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
