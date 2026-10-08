-- SocialU | Local dev-only seed data for testing the Campus/Friends Feed
-- (SRS-301 through SRS-304). NOT part of schema.sql's submission build and
-- NOT for production/graded data — just enough rows to exercise the feed
-- manually via the temporary x-student-id dev stub (see lib/socialu.ts).
-- Run after supabase/schema.sql, against the same empty dev database:
--   psql -v ON_ERROR_STOP=1 -d YOUR_DEV_DATABASE -f database/dev_seed.sql

BEGIN;
SET LOCAL search_path = socialu, pg_catalog;

INSERT INTO university (university_id, name) VALUES (1, 'Westbridge University')
  ON CONFLICT (university_id) DO NOTHING;

INSERT INTO university_domains (domain, university_id) VALUES ('westbridge.edu', 1)
  ON CONFLICT (domain) DO NOTHING;

-- Accepted feed-photo MIME types/size — placeholder pending team decision
-- (see database/schema_review.md, SRS-304.1/SRS-NFR-41 open item).
INSERT INTO upload_policies (upload_context, mime_type, max_bytes) VALUES
  ('post_photo', 'image/jpeg', 10000000),
  ('post_photo', 'image/png', 10000000),
  ('post_photo', 'image/webp', 10000000)
ON CONFLICT (upload_context, mime_type) DO NOTHING;

INSERT INTO students (full_name, username, university_email, password_digest, email_verified_at)
VALUES
  ('Maya Chen', 'mchen', 'mchen@westbridge.edu', 'dev-placeholder-digest', CURRENT_TIMESTAMP),
  ('Jordan Kim', 'jkim', 'jkim@westbridge.edu', 'dev-placeholder-digest', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Make the two seeded students accepted friends, so Friends Feed has data to show.
INSERT INTO friend_requests (sender_id, recipient_id, status, decided_at)
SELECT s1.student_id, s2.student_id, 'accepted', CURRENT_TIMESTAMP
FROM students s1, students s2
WHERE s1.username = 'mchen' AND s2.username = 'jkim'
ON CONFLICT DO NOTHING;

COMMIT;
