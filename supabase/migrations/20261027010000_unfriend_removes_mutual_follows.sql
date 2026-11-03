-- Ending an active friendship also ends both follows in the same transaction.
-- Applies to both friendship APIs and block cleanup, without changing unrelated
-- follows or backfilling/removing any existing relationships at installation.
CREATE OR REPLACE FUNCTION socialu.unfollow_on_friendship_end() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM socialu.student_follows
  WHERE (follower_id = NEW.sender_id AND followed_id = NEW.recipient_id)
     OR (follower_id = NEW.recipient_id AND followed_id = NEW.sender_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION socialu.unfollow_on_friendship_end() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS friend_end_mutual_unfollow ON socialu.friend_requests;
CREATE TRIGGER friend_end_mutual_unfollow
  AFTER UPDATE OF friendship_ended_at ON socialu.friend_requests
  FOR EACH ROW WHEN (OLD.status = 'accepted' AND OLD.friendship_ended_at IS NULL AND NEW.friendship_ended_at IS NOT NULL)
  EXECUTE FUNCTION socialu.unfollow_on_friendship_end();
