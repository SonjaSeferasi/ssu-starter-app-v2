import { verifiedUser, accountResponse, jsonBody, textField, AccountError } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';

// SRS-314.1-314.5, SRS-NFR-43 -- report a post the caller is authorized to
// view. Ownership/visibility/self-report checks, the duplicate-reporter
// no-op, and reporter-identity privacy (reporter_id is never returned) all
// live in socialu_report_post (supabase/migrations/20261023000100_report_post.sql).
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const body = await jsonBody(request);
    const result = await feedRpc<{ reported: boolean; post_removed: boolean }>('socialu_report_post', {
      p_auth_id: user.id,
      p_post_id: postId,
      p_reason: textField(body.reason),
    });

    return Response.json({ reported: result.reported, postRemoved: result.post_removed }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
