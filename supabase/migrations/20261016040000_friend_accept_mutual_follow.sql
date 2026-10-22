-- An accepted friend request creates both follows atomically with acceptance.
-- Existing follows are preserved; applying this migration does not backfill old friendships.
CREATE OR REPLACE FUNCTION socialu.follow_on_friend_accept() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO socialu.student_follows(follower_id,followed_id)
    VALUES(NEW.sender_id,NEW.recipient_id),(NEW.recipient_id,NEW.sender_id)
    ON CONFLICT(follower_id,followed_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION socialu.follow_on_friend_accept() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS friend_accept_mutual_follow ON socialu.friend_requests;
CREATE TRIGGER friend_accept_mutual_follow
  AFTER UPDATE OF status ON socialu.friend_requests
  FOR EACH ROW WHEN (OLD.status='pending' AND NEW.status='accepted' AND NEW.friendship_ended_at IS NULL)
  EXECUTE FUNCTION socialu.follow_on_friend_accept();
