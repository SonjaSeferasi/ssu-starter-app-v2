-- SocialU | Seed required reference data: accepted post-photo upload types.
-- Without a matching row here, socialu.media_assets' validate_media trigger
-- rejects every photo attachment with "Unsupported media or upload limit
-- exceeded" (not a bug -- upload_policies is intentionally left empty by
-- schema.sql until the team agrees on accepted types; see
-- database/schema_review.md, "SRS-304.1; SRS-NFR-41 ... Accepted feed photo
-- MIME types" -- the 10 MB size is already settled and separately enforced).
-- PLACEHOLDER values (jpeg/png/webp, 10 MB) pending team confirmation --
-- amend here if the team picks something different.

INSERT INTO socialu.upload_policies (upload_context, mime_type, max_bytes) VALUES
  ('post_photo', 'image/jpeg', 10000000),
  ('post_photo', 'image/png', 10000000),
  ('post_photo', 'image/webp', 10000000)
ON CONFLICT (upload_context, mime_type) DO NOTHING;
