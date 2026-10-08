import { getSocialuClient, getCurrentStudentId } from '../../../../../lib/socialu';
import { POST_CARD_SELECT, shapeFeedPosts } from '../../../../../lib/posts';

// SRS-302.1/302.2/302.3 — Friends Feed: Friends Only posts from the current
// student's accepted friends, enforced server-side via current_friendships.
export async function GET(request: Request) {
  const studentId = getCurrentStudentId(request);
  if (!studentId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSocialuClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data: friendships, error: friendsError } = await supabase
    .from('current_friendships')
    .select('student_low, student_high')
    .or(`student_low.eq.${studentId},student_high.eq.${studentId}`);

  if (friendsError) return Response.json({ error: friendsError.message }, { status: 500 });

  const friendIds = (friendships ?? []).map((f) => (f.student_low === studentId ? f.student_high : f.student_low));

  if (friendIds.length === 0) {
    return Response.json({ posts: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from('posts')
    .select(POST_CARD_SELECT)
    .eq('visibility', 'friends_only')
    .in('author_id', friendIds)
    .order('published_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const posts = await shapeFeedPosts(supabase, data as any);
  return Response.json({ posts }, { status: 200 });
}
