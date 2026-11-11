-- Additive foundation. Do not replace existing project tables.
create table if not exists public.fwb_students (
 id text primary key, email text, name text not null, offer text, contract_value numeric(14,2), coach text,
 source_row integer not null, source_record jsonb not null
);
create table if not exists public.fwb_payments (
 id text primary key, student_id text references public.fwb_students(id), payer_email text, payer_name text,
 paid_at timestamp, gross_amount numeric(14,2) not null, processing_fee numeric(14,2), net_received numeric(14,2),
 status text, event_type text, setter text, closer text, offer text, manual boolean not null default false,
 verification_status text not null default 'imported_unreconciled', source_row integer not null, source_record jsonb not null
);
create table if not exists public.fwb_coach_assignments (
 id text primary key, student_id text references public.fwb_students(id), student_email text, coach text,
 program text, start_date date, monthly_rate numeric(14,2), duration_months integer, payment_verified boolean,
 source_row integer not null, source_record jsonb not null
);
create table if not exists public.fwb_student_pauses (
 id text primary key, student_email text, start_date date, end_date date, source_row integer not null, source_record jsonb not null
);
create table if not exists public.fwb_coach_compensation (
 id text primary key, period_start date, period_end date, coach text, student_email text,
 eligibility text, amount_due numeric(14,2), paid_amount numeric(14,2), status text,
 source_row integer not null, source_record jsonb not null
);
create table if not exists public.fwb_commission_entries (
 id text primary key, payment_id text references public.fwb_payments(id), setter text, closer text,
 cash_collected numeric(14,2), setter_earned numeric(14,2), closer_earned numeric(14,2), total_earned numeric(14,2),
 source_row integer not null, source_record jsonb not null
);
create table if not exists public.fwb_payouts (
 id text primary key, paid_date date, representative text, role text, gross_commissions numeric(14,2),
 transfer_fee numeric(14,2), net_payout numeric(14,2), status text, source_row integer not null, source_record jsonb not null
);
create table if not exists public.fwb_leads (
 id text primary key, created_at timestamp, name text, contact text, stage text, scheduling_status text,
 utm_source text, utm_campaign text, closer text, source_row integer not null, source_record jsonb not null
);
-- No browser policies are installed. Service role access stays server-side.
do $$ declare name text; begin
 foreach name in array array['fwb_students','fwb_payments','fwb_coach_assignments','fwb_student_pauses','fwb_coach_compensation','fwb_commission_entries','fwb_payouts','fwb_leads'] loop
 execute format('alter table public.%I enable row level security',name);
 execute format('revoke all on public.%I from anon, authenticated',name);
 end loop;
end $$;
create index if not exists fwb_payments_paid_at_idx on public.fwb_payments(paid_at);
create index if not exists fwb_leads_created_at_idx on public.fwb_leads(created_at);
