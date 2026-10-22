-- SocialU | SRS-314.1-314.5, SRS-NFR-43: Reporting Posts.
--
-- The core 5-report auto-delete mechanism already exists (schema.sql /
-- 20260929164656_create_socialu.sql): apply_report_threshold() deletes a
-- post once it has 5 rows in post_reports, and its own comment already
-- says "'Valid report' eligibility is an open SRS rule; trusted service
-- inserts accepted reports only" -- this migration is that trusted
-- service (the new socialu_report_post RPC) plus the specific "valid
-- report" rule this resolves: only DISTINCT reporters count, decided here
-- (confirmed 2026-10-23, post_reports had 0 rows / 0 duplicates at the
-- time this was written, so no data cleanup was actually needed -- the
-- defensive dedup below is a no-op today, not a risk for tomorrow).
--
-- SRS-314 covers POSTS only -- none of 314.1-314.5 mention comments.
-- Comment reporting is explicitly deferred, to be scoped separately.

-- Defensive dedup before the UNIQUE constraint: keeps each (post_id,
-- reporter_id) pair's EARLIEST report_id, removing any later duplicates.
-- Confirmed a no-op against the live table today, but safe regardless of
-- future data (e.g. a fresh database seeded differently, or if this
-- migration is ever replayed against a copy with real data).
DELETE FROM socialu.post_reports a USING socialu.post_reports b
WHERE a.post_id = b.post_id AND a.reporter_id = b.reporter_id AND a.report_id > b.report_id;

-- SRS-314 (B-13 resolved): "valid reports" = one per distinct student per
-- post. Without this, a single student could submit 5 reports alone and
-- delete a post unilaterally -- the UNIQUE constraint, paired with
-- ON CONFLICT DO NOTHING in socialu_report_post below, makes a repeat
-- report from the same student a harmless no-op instead, mirroring
-- exactly how post_likes already prevents a duplicate like from counting twice.
ALTER TABLE socialu.post_reports ADD CONSTRAINT post_reports_one_per_reporter UNIQUE (post_id, reporter_id);

-- Additional functionality, not in the official SRS-314 text: a reason
-- category, stored for whenever a future reviewer role needs it (see the
-- implementation report for why that's deliberately not built yet). No
-- existing rows to backfill (table is empty), so this can go straight to
-- NOT NULL with a CHECK, no DEFAULT/backfill step needed.
ALTER TABLE socialu.post_reports ADD COLUMN reason TEXT NOT NULL
  CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other'));

-- Small, scoped cleanup (not a new subsystem): when a post_photos row is
-- removed -- including via the CASCADE that fires when a post auto-deletes
-- through apply_report_threshold() -- delete the now-unreferenced
-- media_assets ROW if nothing else still points to it. Mirrors the exact
-- "count other refs, delete if zero" logic socialu_remove_post_photo
-- already does in application code (20261015000100_edit_post.sql), just
-- reacting to the cascade instead of an explicit call. This cleans up the
-- DATABASE row only -- Postgres triggers cannot call the Storage HTTP API,
-- so the physical file in Storage still needs a future out-of-band job;
-- that part is explicitly out of scope here.
CREATE FUNCTION socialu.cleanup_orphaned_media_asset() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM post_photos WHERE asset_id = OLD.asset_id) THEN
    DELETE FROM media_assets WHERE asset_id = OLD.asset_id;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER media_asset_cleanup AFTER DELETE ON socialu.post_photos
  FOR EACH ROW EXECUTE FUNCTION socialu.cleanup_orphaned_media_asset();

-- COMPATIBILITY FIX, found during review before this was ever applied:
-- media_asset_cleanup above fires on EVERY post_photos delete, not just the
-- one caused by a report-triggered post deletion -- including the deletes
-- socialu_remove_post_photo (SRS-306.3) and socialu_delete_post (SRS-307)
-- already perform. Both of those used to read a photo's storage_key AFTER
-- deleting its post_photos row (and, for the delete-post case, after the
-- whole posts row's cascade). With the new trigger live, that read would
-- now race against the trigger already having deleted the media_assets
-- row, silently returning NULL/empty and skipping the real Storage file's
-- cleanup. Both are updated here to capture storage_keys BEFORE the
-- delete, and rely on the new trigger for the actual media_assets row
-- cleanup instead of doing it themselves -- a single source of truth,
-- same end behavior as before, just reordered to stay correct.

CREATE OR REPLACE FUNCTION public.socialu_remove_post_photo(p_auth_id UUID, p_post_id BIGINT, p_asset_id BIGINT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; freed_key TEXT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can edit this post.' USING ERRCODE = '42501'; END IF;

  IF NOT EXISTS (SELECT 1 FROM socialu.post_photos WHERE post_id = p_post_id AND asset_id = p_asset_id) THEN
    RAISE EXCEPTION 'Photo not found on this post.' USING ERRCODE = 'P0002';
  END IF;

  SELECT storage_key INTO freed_key FROM socialu.media_assets WHERE asset_id = p_asset_id;

  DELETE FROM socialu.post_photos WHERE post_id = p_post_id AND asset_id = p_asset_id;
  SET CONSTRAINTS ALL IMMEDIATE;

  RETURN freed_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_delete_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; freed_keys TEXT[];
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can delete this post.' USING ERRCODE = '42501'; END IF;

  -- Same "not referenced elsewhere" filter as before, just evaluated
  -- before the delete instead of after: an asset only counts as freed if
  -- no OTHER post's post_photos row also uses it (this post's own rows
  -- are about to be removed regardless, so they don't count against it).
  SELECT array_agg(ma.storage_key) INTO freed_keys
    FROM socialu.post_photos pp JOIN socialu.media_assets ma ON ma.asset_id = pp.asset_id
    WHERE pp.post_id = p_post_id
      AND NOT EXISTS (SELECT 1 FROM socialu.post_photos pp2 WHERE pp2.asset_id = pp.asset_id AND pp2.post_id <> p_post_id);

  DELETE FROM socialu.posts WHERE post_id = p_post_id;
  SET CONSTRAINTS ALL IMMEDIATE;

  RETURN to_jsonb(coalesce(freed_keys, ARRAY[]::TEXT[]));
END;
$$;

-- SRS-314.1 (authorized submission) / 314.2 (count maintained via the
-- existing table) / 314.3 (the existing trigger fires on this INSERT,
-- unchanged) / 314.5 + NFR-43 (reporter_id is never selected into the
-- return value -- the only way to guarantee 100% of reports never expose
-- the reporter is to never let any function return it to a student at all).
-- Self-reporting is blocked (not SRS-required either way -- a deliberate
-- product choice, consistent with every other platform's norm and with
-- Delete Post already being available for your own content). A repeat
-- report from the same student is a silent, idempotent success (mirrors
-- socialu_like_post's ON CONFLICT DO NOTHING exactly) -- the route maps
-- `reported: false` to "You've already reported this post." without
-- treating it as an error.
CREATE FUNCTION public.socialu_report_post(p_auth_id UUID, p_post_id BIGINT, p_reason TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; inserted_count INT; post_removed BOOLEAN;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_reason IS NULL OR p_reason NOT IN ('spam', 'harassment', 'inappropriate', 'other') THEN
    RAISE EXCEPTION 'Choose a valid report reason.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner = me THEN RAISE EXCEPTION 'You cannot report your own post.' USING ERRCODE = '42501'; END IF;
  IF vis = 'friends_only' AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO socialu.post_reports (post_id, reporter_id, reason) VALUES (p_post_id, me, p_reason)
  ON CONFLICT (post_id, reporter_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- apply_report_threshold() may have just deleted the post synchronously,
  -- inside the INSERT above, if this was the 5th distinct reporter.
  post_removed := NOT EXISTS (SELECT 1 FROM socialu.posts WHERE post_id = p_post_id);

  RETURN jsonb_build_object('reported', inserted_count > 0, 'post_removed', post_removed);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_report_post(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_report_post(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
