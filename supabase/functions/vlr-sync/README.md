# VLR sync worker

This Edge Function replaces frequent Vercel cron execution while keeping the
existing Next.js routes available for manual fallback.

## Required Edge Function secrets

- `VLR_API_URL`: same private API base URL configured in Vercel.
- `VLR_SYNC_SECRET`: a new random 32-byte secret used only by Supabase Cron.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by
Supabase Edge Functions.

## Deployment

From the repository root, after `npx supabase login`:

```powershell
npx --yes supabase@latest secrets set "VLR_API_URL=REPLACE_ME" "VLR_SYNC_SECRET=REPLACE_ME" --remote=YOUR_PROJECT_REF
npx --yes supabase@latest functions deploy vlr-sync --remote=YOUR_PROJECT_REF --no-verify-jwt --use-api
```

The function disables platform JWT verification because it authenticates each
request against `VLR_SYNC_SECRET` itself. Never expose that secret to the
browser or commit it to the repository.

## Cron

After deployment, create these entries in Supabase Vault:

- `project_url`: `https://YOUR_PROJECT_REF.supabase.co`
- `vlr_sync_secret`: exactly the same value as `VLR_SYNC_SECRET`

Then execute `scripts/install_supabase_vlr_cron.sql`. It installs:

- `vct-vlr-matches-15m`: match/calendar sync every 15 minutes.
- `vct-vlr-stats-5m`: map statistics sync every 5 minutes.

Use `scripts/verify_supabase_vlr_cron.sql` to inspect scheduler runs and the
application-level sync history.
