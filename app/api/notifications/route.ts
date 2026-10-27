import { accountClient, accountResponse, verifiedUser } from '../../../lib/socialu-account';
import { profileRpc } from '../../../lib/profile';
import { resolveMediaUrl } from '../../../lib/media';

export const dynamic = 'force-dynamic';

type RawNotification = {
  notification_id: number;
  kind: 'friend_request' | 'friendship_accepted' | 'post_like' | 'post_comment' | 'comment_reply' | 'mention';
  created_at: string;
  read_at: string | null;
  actor_username: string;
  actor_name: string;
  actor_photo_key: string | null;
  request_status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'blocked' | null;
  // SRS-312/313 + mentions (additional functionality): null for friend kinds.
  post_id: number | null;
  comment_id: number | null;
  visibility: 'public' | 'friends_only' | null;
  actor_count: number | null;
  actor_names: string[] | null;
};

// SRS-114.7, SRS-116.4: friend request and accepted-friendship notifications.
// SRS-312/313: like, comment, and reply notifications, unified into the same feed.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const raw = await profileRpc<{ unread: number; notifications: RawNotification[] }>('socialu_notifications', { p_auth_id: user.id });
    const notifications = await Promise.all(raw.notifications.map(async ({ actor_photo_key, ...item }) => ({
      ...item, actor_photo_url: await resolveMediaUrl(accountClient(), actor_photo_key),
    })));
    return Response.json({ unread: raw.unread, notifications }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// Opening the Notifications page marks everything read, which clears the bell badge.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    await profileRpc('socialu_mark_notifications_read', { p_auth_id: user.id });
    return Response.json({ unread: 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
