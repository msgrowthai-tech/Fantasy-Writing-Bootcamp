-- Private staging preserves every source tab, original row, and formula.
-- No browser/anonymous access. The demo reads through its server only.
create table if not exists public.source_snapshots (
 id text primary key,
 payload jsonb not null,
 imported_at timestamptz not null default now()
);
alter table public.source_snapshots enable row level security;
revoke all on public.source_snapshots from anon, authenticated;
create table if not exists public.source_records (
 snapshot_id text not null references public.source_snapshots(id),
 source_kind text not null,
 sheet text not null,
 row_number integer not null,
 "values" jsonb not null,
 formulas jsonb not null default '{}',
 primary key(snapshot_id, source_kind, sheet, row_number)
);
alter table public.source_records enable row level security;
revoke all on public.source_records from anon, authenticated;
-- Intentionally no public policies: authenticated staff roles are a production prerequisite.
