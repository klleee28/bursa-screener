# Bursa Filter

A private, production-oriented Bursa Malaysia systematic screener. The Next.js app is the authenticated execution surface; GitHub Actions performs EOD ingestion outside Vercel's request lifecycle; Supabase enforces access with Row Level Security.

## Stack

- Next.js 16 App Router, React 19, Tailwind CSS 4
- shadcn/ui (Base UI) and TanStack Table 9
- Supabase Postgres + Auth + RLS
- Python 3.12, yfinance, and supabase-py
- GitHub Actions at 09:30 UTC / 17:30 MYT
- Vercel-compatible deployment

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.

3. Apply [`supabase/migrations/202608260001_initial_schema.sql`](supabase/migrations/202608260001_initial_schema.sql) in the Supabase SQL editor or through the Supabase CLI. This file contains the exact table, constraint, index, grant, RLS, and policy SQL.

4. In Supabase Authentication:

   - Create the single admin email/password user.
   - Disable public sign-ups.
   - Keep the service-role key server-side only.

5. Populate `bursa_master` with ordinary-share classification data. Tickers are stored without `.KL`; the ETL adds the Yahoo Finance suffix.

6. Start the app:

   ```bash
   npm run dev
   ```

When Supabase variables are absent in development only, the app renders a fixed local dataset for UI work. Production never enables this fallback.

## GitHub Actions ETL

Add these repository Actions secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The workflow at [`.github/workflows/fetch_eod.yml`](.github/workflows/fetch_eod.yml) runs daily and can also be dispatched manually. It:

1. Pages through ordinary tickers in `bursa_master`.
2. Downloads five calendar days in yfinance batches so the last-session percentage change can be calculated across weekends and holidays.
3. Fetches current market cap with bounded concurrency.
4. Cleans non-finite values and upserts `(ticker, date)` rows in batches.

Run it locally with service-role credentials in your environment:

```bash
python -m pip install --requirement scripts/requirements.txt
python scripts/fetch_bursa_eod.py
```

## Vercel deployment

Set the following Vercel environment variables for Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel or prefix it with `NEXT_PUBLIC_`. It belongs only in GitHub Actions.

## Security model

- `src/proxy.ts` performs the optimistic route redirect and refreshes Supabase auth cookies.
- Every Server Action independently verifies the authenticated user before mutation.
- RLS is enabled and forced on all three public tables.
- `anon` receives no table privileges; `authenticated` is covered by explicit policies.
- The GitHub Actions service role uses Supabase's `BYPASSRLS` capability and is never exposed to the browser.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
python -m py_compile scripts/fetch_bursa_eod.py
```
