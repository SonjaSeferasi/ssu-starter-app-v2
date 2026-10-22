import { verifiedUser, accountResponse } from '../../../lib/socialu-account';
import { feedRpc } from '../../../lib/feed';
import { shapeNotifications, type RawNotificationRow } from '../../../lib/notifications';

// SRS-312.1-312.4 -- list the authenticated student's own Like notifications,
// grouped per post. socialu_list_notifications scopes everything to
// p_auth_id -> the resolved recipient, so a student can never retrieve
// another student's notifications by any request shape.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const rows = await feedRpc<RawNotificationRow[]>('socialu_list_notifications', { p_auth_id: user.id });
    return Response.json({ notifications: shapeNotifications(rows) }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
