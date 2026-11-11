# Fantasy Writing Bootcamp · Command Center

Private, read-only financial presentation dashboard for Jed Herne. React, Vite, Express, Recharts, and a server-side Supabase adapter. Brand fonts are hosted locally, so no external font service is needed.

## Run the prepared demo

Requires Node 24 (tested 24.22.1).

```sh
cd /workspace/Fantasy-Writing-Bootcamp
npm ci --cache /workspace/.npm-cache
npm run build
npm start
```

The server binds to `127.0.0.1:3001`. For editing, `npm run dev` starts the API and Vite on port 5173. Readiness: `curl -fsS http://127.0.0.1:3001/api/dashboard`. Source data is held in ignored `.local/source.json`, served by the API, never bundled into JavaScript or committed. This file is retained in the prepared environment; a clean Git clone needs a new authorized import.

## Import the supplied workbooks

Requires Python with `openpyxl` (tested 3.1.5). Input files are read only.

```sh
python scripts/import_workbooks.py --finance /path/to/finance.xlsx --contacts /path/to/contacts.xlsx
npm test
```

All populated rows, cached formula values, formulas, source row numbers, and workbook SHA-256 hashes are preserved. Template rows remain available in raw staging but are excluded from business entity lists using the first column's identifier. Reimport is repeatable and replaces only the local snapshot. It does not update Google Drive.

## Connect Supabase

Project: `tmqzvavoknokdydgskew`. Migrations and the initial seed have been applied; remote row counts and financial totals were verified.

1. Apply both SQL files in `supabase/migrations/` in order through your authorized Supabase SQL editor or CLI. They create additive tables and deny anon/authenticated access. Existing source spreadsheets are untouched.
2. Configure server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` securely, via cloud environment settings or an ignored `.env` file. Never use a `VITE_` prefix for the service key.
3. Run `npm run seed`. It preserves all raw source rows and upserts typed financial entities with stable IDs. Output reports counts; source data is not logged. Re-running the same snapshot is idempotent. Bulk import spans requests and is not transactionally atomic: if interrupted, rerun before presenting the data as complete.
4. Restart `npm start`. The data page must say “Connected to Supabase.” A configured but failing Supabase connection returns an error; it never silently falls back to local data.

The dashboard currently reads the complete immutable source snapshot even when connected to Supabase; typed tables are an initial central database foundation. Live financial edits and webhooks must update a consistent reporting layer before enabling them.

## Validation

```sh
npm test
npm run build
# With npm start running and Chromium installed:
npm run test:browser
```

Finance tests require the original private import. Browser smoke exercises all six views, dates, search, transaction details, coaching forecasts, and mobile navigation. Screenshots stay in ignored `.local/` because they contain business data.

## Delivery scope

Six functional pages: overview, transactions, sales & commissions, coaching & payouts, leads & marketing, and data & reconciliation. Date filtering, custom dates, payment search/detail, CSV export, source provenance, exception review, and roster-based compensation forecasts are implemented. Coaching and commission historical balances are clearly labeled lifetime and remain independent of the page date selector.

Staff authentication is implemented; the authorized staff account still needs provisioning. No public deployment, webhook ingestion, payments execution, live Google Drive sync, weekly automated reports, or AI assistant is enabled. See [deployment instructions](docs/deployment.md) for Bluehost, domain setup, staff account provisioning, and required production settings. Keep the local presentation private; production requires verified authentication and TLS. The service role bypasses RLS and must remain on a trusted server. Production mode and non-loopback binding require staff authentication automatically. Local loopback presentation mode permits unauthenticated access unless AUTH_REQUIRED=true.

See [data audit](docs/data-audit.md) for definitions, source limitations, and migration strategy. Cloud tasks use the existing isolated checkout; do not create worktrees unless requested.
