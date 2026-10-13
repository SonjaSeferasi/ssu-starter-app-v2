# SSU Starter App V2

Professor Brockenbrough's Next.js starter with Tailwind CSS, Supabase auth, and a user profile system.

## Prerequisites

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Wait for the database to finish provisioning.

### 2. Get your connection variables

In your Supabase project, go to **Project Settings → GENERAL** and copy:
- **Project ID** → use to form `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`. Take the value and construct a path like this: "https://xxxx.supabase.co" by adding the https part and the supabase.co part.  Both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL use thissame value.

In your Supabase project, go to **Project Settings → API Keys/Legacy anon, service_role API keys** and copy:
- **anon public key** → use as `SUPABASE_ANON_KEY`
- **service_role secret key** → use as `SUPABASE_SERVICE_ROLE_KEY`

Create a `.env.local` file in the project root (copy from `.env.example`) and fill in those values:

```
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
```

### 3. Run the schema script

In your Supabase project, open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the `myapp_profile` table and an Auth trigger that saves the username when an account is created. It also enables row-level security and restricts direct table access to the server service-role client. Run the updated script even if the table already exists.

### 4. Create the avatars storage bucket

In your Supabase project, go to **Storage → New bucket**, name it `avatars`, and check **Public bucket**.

## Quick start

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # run all tests
```

## SocialU account setup

Registration at `/register` collects a username, email, and password. Supabase Auth
manages the password; PostgreSQL `public.myapp_profile` stores the username and
profile fields. Login continues to use email and password.

1. Create your Supabase project and fill in `.env.local` using `.env.example`.
   The dashboard's `/new/...` URL is not the project API URL. Use your project's
   `https://<project-ref>.supabase.co` URL. The profile API requires the server-only
   service-role key; never prefix that key with `NEXT_PUBLIC_` or commit it.
2. Run `supabase/schema.sql` in the Supabase SQL Editor before signing up.
3. Set Authentication URL Configuration's Site URL to `http://localhost:3000`
   (or your actual development port). Leave email confirmation enabled to verify
   email ownership. Confirmation does not itself establish university enrollment.
4. Restart `npm run dev`, create an account at `/register`, confirm the email,
   and sign in at `/login`.
5. Check Authentication → Users for the account and Table Editor → myapp_profile
   for the saved username. No plaintext password is stored in the profile table.

The usernames are display names, not unique login identifiers. Existing accounts
without a profile can create one on `/profile`. The SQL script needs a live-project
smoke test after configuration; local API tests use mocked Supabase responses.
