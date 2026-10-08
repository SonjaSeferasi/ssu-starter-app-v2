import { getSocialuClient, getCurrentStudentId } from '../../../../../lib/socialu';

// PLACEHOLDER — accepted feed-photo MIME types are an open team decision
// (database/schema_review.md: "SRS-304.1; SRS-NFR-41 ... Accepted feed photo
// MIME types"). The 10 MB size limit is already settled and DB-enforced.
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10_000_000;

// SRS-304.1/304.3 — attach one or more already-selected photographs to a post
// the student authored. The DB trigger validate_post_photo additionally
// enforces that each uploaded asset belongs to the post's author.
export async function POST(request: Request, { params }: { params: { postId: string } }) {
  const studentId = getCurrentStudentId(request);
  if (!studentId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const postId = Number(params.postId);
  if (!Number.isInteger(postId)) return Response.json({ error: 'Invalid post id.' }, { status: 400 });

  const supabase = getSocialuClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('post_id, author_id')
    .eq('post_id', postId)
    .maybeSingle();

  if (postError) return Response.json({ error: postError.message }, { status: 500 });
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 });
  if (post.author_id !== studentId) {
    return Response.json({ error: 'Only the post author can attach photos.' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const files = formData.getAll('images').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json({ error: 'At least one image file is required.' }, { status: 400 });
  }

  for (const file of files) {
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      return Response.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: `${file.name} exceeds the 10 MB limit.` }, { status: 400 });
    }
  }

  const attachedAssetIds: number[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const storageKey = `post_photo/${studentId}/${postId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('media').upload(storageKey, file);
    if (uploadError) {
      return Response.json(
        { error: uploadError.message, attachedCount: attachedAssetIds.length },
        { status: 400 }
      );
    }

    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        owner_id: studentId,
        storage_key: storageKey,
        upload_context: 'post_photo',
        mime_type: file.type,
        byte_count: file.size,
      })
      .select('asset_id')
      .single();

    if (assetError) {
      return Response.json(
        { error: assetError.message, attachedCount: attachedAssetIds.length },
        { status: 400 }
      );
    }

    const { error: linkError } = await supabase
      .from('post_photos')
      .insert({ post_id: postId, asset_id: asset.asset_id });

    if (linkError) {
      return Response.json(
        { error: linkError.message, attachedCount: attachedAssetIds.length },
        { status: 400 }
      );
    }

    attachedAssetIds.push(asset.asset_id);
  }

  return Response.json({ attachedCount: attachedAssetIds.length }, { status: 201 });
}
