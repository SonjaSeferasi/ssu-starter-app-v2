# SocialU Supabase deployment

The GitHub integration applies SQL migrations from `supabase/migrations/`. A standalone `schema.sql` file is not automatically executed by the integration.

## Dashboard settings

- Repository: `SonjaSeferasi/ssu-starter-app-v2`
- Working directory: `.` (the repository root, which contains `supabase/`)
- Production branch: `main`
- Deploy to production: enabled when the team is ready for pushed migrations to run

The working directory is relative to GitHub, not a Windows path. Preview branching is optional; it is not needed to deploy migrations to the linked main project.

## First deployment

The initial migration is `supabase/migrations/20260929164656_create_socialu.sql`. It creates all 59 SocialU tables in the `socialu` schema, with the existing constraints, indexes, functions, triggers, views and baseline configuration rows. It omits the development script's schema deletion and lets the migration runner control the transaction.

Review and commit `supabase/config.toml`, this README, and the migration, then push them to the configured `main` branch. With the integration enabled, that push deploys the migration. Check the Supabase deployment result before treating the database as ready.

Verify in the SQL Editor:

```sql
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'socialu'
  AND table_type = 'BASE TABLE';
```

Expected count: **59**. In Table Editor, select the `socialu` schema.

If deployment reports that `socialu` already exists, stop and inspect it. Do not drop it to force the migration through. A schema loaded manually needs a comparison and migration-history reconciliation before adopting this migration.

## Which SQL file to use

- `database/schema.sql`: required coursework submission and destructive development reset script. Keep it in the `database` folder for grading.
- `supabase/schema.sql`: existing standalone copy of that reset script. The GitHub migration runner does not apply it.
- `supabase/migrations/20260929164656_create_socialu.sql`: initial deployment snapshot. After deployment, leave its contents unchanged and add a new timestamped migration for each later database change.

The shared schema and migration snapshot must be reviewed together when requirements change. Editing either standalone reset script does not deploy those edits automatically.

## Application integration

This sets up database objects only. The current Next.js app still needs its account identities mapped to these tables, appropriate server/API authorization, and approved application configuration data. The migration does not enable direct client access to the `socialu` schema. Do not expose account credentials or other private tables through the Data API while connecting the app.

## References

- [Supabase GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
