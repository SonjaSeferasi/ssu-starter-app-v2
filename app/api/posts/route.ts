import { getSocialuClient, getCurrentStudentId } from '../../../lib/socialu';
import { POST_CARD_SELECT, shapeFeedPosts } from '../../../lib/posts';

// SRS-303.1/303.2/303.3, SRS-315.1-315.3 — create a text post. author_id comes
// only from the resolved session, never the request body. Non-blank text is
// required here; photo-only posts are out of scope this week (see SRS-304
// route for attaching photos to an already-created text post).
export async function POST(request: Request) {
  const studentId = getCurrentStudentId(request);
  if (!studentId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSocialuClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const body = await request.json();
  const { textContent, visibility } = body as { textContent?: string; visibility?: string };

  if (!textContent || !textContent.trim()) {
    return Response.json({ error: 'Post text is required.' }, { status: 400 });
  }
  if (visibility !== 'public' && visibility !== 'friends_only') {
    return Response.json({ error: 'Visibility must be "public" or "friends_only".' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: studentId, text_content: textContent.trim(), visibility })
    .select(POST_CARD_SELECT)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const [post] = await shapeFeedPosts(supabase, [data as any]);
  return Response.json({ post }, { status: 201 });
}
