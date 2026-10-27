import { accountClient, accountResponse, verifiedUser } from '../../../lib/socialu-account';
import { chatOperation } from '../../../lib/chat-access';
import { resolveMediaUrl } from '../../../lib/media';
export const dynamic = 'force-dynamic';

type RawMessageNotification = {
  conversation_id: string;
  kind: 'private' | 'group';
  name: string | null;
  sender: { username: string; name: string; photo_key: string | null };
  text: string;
  message_kind: 'text' | 'emoji';
  unread_count: number;
  sent_at: string;
};

// SRS-212.9 (#822, #823): the signed-in student's message notifications for the Messages tab on the Notifications
// page: one per conversation with messages they haven't seen yet, naming the latest sender and the conversation.
// The student always comes from the verified token. Sender photos become signed links, as on the Notifications page.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const raw = await chatOperation('socialu_message_notifications', { p_auth_id: user.id }) as { notifications?: RawMessageNotification[] } | null;
    const notifications = await Promise.all((raw?.notifications ?? []).map(async ({ sender: { photo_key, ...sender }, ...item }) => ({
      ...item, sender: { ...sender, photo_url: await resolveMediaUrl(accountClient(), photo_key) },
    })));
    return Response.json({ notifications }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
