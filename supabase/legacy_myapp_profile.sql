-- Legacy pre-team scaffold table used by app/api/profile/* and app/profile/page.tsx.
-- This predates the team's socialu schema (supabase/schema.sql) and relies on
-- Supabase Auth directly (auth.users), not the students/student_profiles tables.
-- Restored here after commit 936770a ("putting the schema") overwrote the file
-- that originally defined it (see commit f3ad7cc). Run this in the Supabase SQL
-- Editor if you still need /profile, /login, /register to work.

create table if not exists myapp_profile (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null,
  biography  text not null default '',
  avatar_url text
);

-- Also create a public Storage bucket for avatar uploads:
-- Supabase Dashboard → Storage → New bucket → name "avatars" → check "Public bucket".
