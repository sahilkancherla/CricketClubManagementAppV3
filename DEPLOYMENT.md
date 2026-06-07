# Deployment — Supabase + Railway

QuickCric deploys as **three pieces**:

| Piece | Host | What |
|---|---|---|
| Database / Auth / Storage | **Supabase** (managed) | Postgres, auth, file storage |
| API server (`apps/server`) | **Railway** service | Express REST API |
| Web app (`apps/web`) | **Railway** service | Next.js |

Both Railway services build from the **repo root** (npm workspaces) using the
config files `railway.server.json` and `railway.web.json` in this repo.

Deploy in this order — each step produces values the next one needs.

---

## 1. Supabase (database)

1. Create a project at https://supabase.com → **New project**. Pick a region near your users; save the database password.
2. From **Project Settings → API**, copy:
   - **Project URL** → `https://<ref>.supabase.co`
   - **anon public** key
   - **service_role** key (secret — server only)
3. Push the schema from this repo (applies everything in `supabase/migrations/`):
   ```bash
   supabase login                       # opens browser
   supabase link --project-ref <ref>    # <ref> is the project id from the URL
   supabase db push                     # runs 00001 … 00004 against the cloud DB
   ```
4. Verify in the dashboard:
   - **Table editor** shows `clubs`, `club_members`, `profiles`, `expenses`, `payments`, etc.
   - **Storage** has the `avatars` and `club-logos` buckets (created by the migrations). If missing, create them as **public** buckets.
5. **Auth → URL Configuration**: set **Site URL** to your web app URL (you'll have it after step 3 of Railway) and add it to **Redirect URLs**.
6. **Auth → Email**: the default Supabase SMTP is rate-limited and for testing only. To send real **member invite** emails in production, configure a custom SMTP provider here. (Without it, the name-only/placeholder member flows still work; only the "send invite" option needs SMTP.)

---

## 2. Railway — API server

1. https://railway.app → **New Project → Deploy from GitHub repo** → pick this repo.
2. On the created service: **Settings → Config-as-code** → set the path to **`railway.server.json`**.
   (This sets the build command `npm run build:shared && npm run build:server`, start `npm run start -w @cricket/server`, and the `/api/health` healthcheck.)
3. **Variables** → add:
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   SUPABASE_ANON_KEY=<anon key>
   CORS_ORIGINS=https://<your-web-domain>     # fill in after step 3; comma-separate if several
   ```
   - Do **not** set `PORT` — Railway provides it and the server reads `process.env.PORT`.
   - Optional: `RATE_LIMIT_MAX` (default 300 requests / IP / 15 min).
4. **Settings → Networking → Generate Domain**. Note this URL — it's your **API base URL** (e.g. `https://quickcric-api.up.railway.app`).
5. Confirm it's live: open `https://<api-domain>/api/health` → `{"status":"ok"}`.

---

## 3. Railway — Web app

1. In the **same Railway project**: **New → GitHub Repo** → pick this repo again (a second service).
2. **Settings → Config-as-code** → set the path to **`railway.web.json`**.
3. **Variables** → add (these `NEXT_PUBLIC_*` values are baked in **at build time**, so they must be set before/at deploy):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   NEXT_PUBLIC_API_URL=https://<api-domain>      # from step 2.4 (no trailing slash)
   ```
4. **Settings → Networking → Generate Domain** → this is your **web app URL**.
5. Go back and finish the cross-links, then redeploy the affected service:
   - **API server** `CORS_ORIGINS` = the web URL from 3.4.
   - **Supabase** Auth Site URL / Redirect URLs = the web URL.

That's it — open the web URL, register, and create a club.

> If you change `NEXT_PUBLIC_API_URL` later, you must **redeploy the web service** (rebuild) for it to take effect — it's compiled into the bundle, not read at runtime.

---

## 4. Mobile (optional, later)

The Expo app isn't hosted on Railway. Point it at production by setting in `apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_API_URL=https://<api-domain>
```
then build with EAS. (`CORS_ORIGINS` doesn't apply — native apps send no `Origin` header and are allowed through; the API still enforces auth + roles per route.)

---

## Environment variable reference

**API server (Railway):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `CORS_ORIGINS`, optional `RATE_LIMIT_MAX`. `PORT` is injected by Railway.

**Web (Railway, build-time):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`. `PORT` is injected by Railway.

## Still stubbed (replace before relying on them)
- PayPal (`apps/server/src/services/paypal.ts`) and email (`apps/server/src/services/mail.ts`) log to console only.
