-- SocialU | Backfill friend request notifications (SRS-114.7), owner LN.
-- Apply once after 20261022050000_integrate_notifications_with_main.sql.
-- Requests sent before the friend_notification_event trigger existed never got a notification,
-- so they were missing from the Notifications page. This adds one for every still-pending request
-- that has none, dated when the request was sent. Safe to run more than once.

INSERT INTO socialu.notifications (recipient_id, actor_id, kind, friend_request_id, created_at)
SELECT r.recipient_id, r.sender_id, 'friend_request', r.request_id, r.requested_at
FROM socialu.friend_requests r
WHERE r.status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM socialu.notifications n
                  WHERE n.friend_request_id = r.request_id AND n.kind = 'friend_request');
