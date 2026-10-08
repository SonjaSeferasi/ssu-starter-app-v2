import { getSocialuClient, getCurrentStudentId } from '../../../../../lib/socialu';
import { POST_CARD_SELECT, shapeFeedPosts } from '../../../../../lib/posts';

// SRS-301.1/301.2/301.3 — Campus Feed: every published Public post, regardless
// of friendship (the schema's single-university constraint makes the "same
// university" scoping from SRS-301.2 automatic — there is only ever one).
export async function GET(request: Request) {
  const studentId = getCurrentStudentId(request);
  if (!studentId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSocialuClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data, error } = await supabase
    .from('posts')
    .select(POST_CARD_SELECT)
    .eq('visibility', 'public')
    .order('published_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const posts = await shapeFeedPosts(supabase, data as any);
  return Response.json({ posts }, { status: 200 });
}
