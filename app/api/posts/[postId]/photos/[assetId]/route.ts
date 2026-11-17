import { verifiedUser, accountResponse, accountClient, AccountError } from '../../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../../lib/feed';

// SRS-306.3/306.5 — remove one photo from a post the caller authored.
// socialu_remove_post_photo (20261015000100_edit_post.sql) enforces ownership
// and cleans up the DB rows; this deletes the actual Storage object since SQL
// can't reach Storage. A failed storage delete doesn't roll back the DB change
// -- the link is already gone, so the photo is gone from the post either way;
// an orphaned file at worst wastes storage, it never un-deletes the photo.
//
// #1210 fix: that comment already says an orphaned storage file is an
// acceptable trade-off -- but the code didn't actually behave that way. If
// storage.remove() threw (a real possibility: network error to Supabase
// Storage), this function's own try/catch turned that into an error
// RESPONSE to the client, even though the RPC above it had already
// committed the real, authoritative change (the photo is gone from the
// post either way, per this file's own comment). From the caller's point
// of view, that one photo was told "failed" and was actually "succeeded"
// at the same time -- confirmed by investigation, not by assumption.
// Storage cleanup is now isolated in its own try/catch that only logs a
// failure; the response is always built from the RPC's own result, which
// is the single source of truth this file's comment already claimed it
// was. This does not touch authorization (the RPC's ownership check is
// unchanged) and introduces no data loss (the DB deletion behavior is
// identical to before -- only the HTTP response's accuracy changes).
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
      try {
        await accountClient().storage.from('media').remove([storageKey]);
      } catch (storageError) {
        console.error('Photo removed from post but storage cleanup failed (orphaned file, not reported to the client):', storageError);
      }
    }

    return Response.json({ removed: true }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
