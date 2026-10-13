import { verifiedUser, accountResponse, accountClient, AccountError } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';

// PLACEHOLDER — accepted feed-photo MIME types are an open team decision
// (database/schema_review.md: "SRS-304.1; SRS-NFR-41 ... Accepted feed photo
// MIME types"). The 10 MB size limit is already settled and DB-enforced.
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10_000_000;

// SRS-304.1/304.3 — attach one or more already-selected photographs to a post
// the student authored. Upload goes straight to Storage; socialu_attach_post_photo
// links the result and enforces authorship (see 20261008000200_feed_functions.sql).
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new AccountError('Invalid form data.', 400);
    }

    const files = formData.getAll('images').filter((f): f is File => f instanceof File);
    if (files.length === 0) throw new AccountError('At least one image file is required.', 400);

    for (const file of files) {
      if (!ACCEPTED_MIME_TYPES.has(file.type)) throw new AccountError(`Unsupported file type: ${file.type}`, 400);
      if (file.size > MAX_BYTES) throw new AccountError(`${file.name} exceeds the 10 MB limit.`, 400);
    }

    const supabase = accountClient();
    let attachedCount = 0;

    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const storageKey = `post_photo/${user.id}/${postId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('media').upload(storageKey, file);
      if (uploadError) throw new AccountError(uploadError.message, 400);

      await feedRpc('socialu_attach_post_photo', {
        p_auth_id: user.id,
        p_post_id: postId,
        p_storage_key: storageKey,
        p_mime_type: file.type,
        p_byte_count: file.size,
      });
      attachedCount++;
    }

    return Response.json({ attachedCount }, { status: 201 });
  } catch (error) {
    return accountResponse(error);
  }
}
