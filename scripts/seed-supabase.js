import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const payload = JSON.parse(await fs.readFile(".local/source.json", "utf8"));
const id = "fwb-workbook-import";
const rows = [];
for (const kind of ["finance", "contacts"])
  for (const [sheet, records] of Object.entries(payload[kind].sheets))
    for (const r of records)
      rows.push({
        snapshot_id: id,
        source_kind: kind,
        sheet,
        row_number: r.row,
        values: r.values,
        formulas: r.formulas,
      });
const { records } = await import("../server/model.js");
const { createHash } = await import("node:crypto");
const key = (kind, value) =>
  kind +
  "_" +
  createHash("sha256").update(String(value)).digest("hex").slice(0, 24);
const get = (name) => records(payload, name);
const date = (v) => v?.slice?.(0, 10) || null;
const num = (v) => (typeof v === "number" ? v : null);
const students = get("Students");
const byEmail = new Map(
  students.map((s) => [
    s["Email (unique)"]?.toLowerCase(),
    key("student", s["Email (unique)"]?.toLowerCase()),
  ]),
);
// Payer aliases are explicit, documented relationships in the supplied roster notes.
const benStudent = students.find((r) => r.Student === "Ben Jarvis");
const benPayment = get("Payments").find((r) => r.Student === "Ben Jarvis");
const payerAliases = new Map(
  benStudent && benPayment
    ? [
        [
          benPayment.Email.toLowerCase(),
          benStudent["Email (unique)"].toLowerCase(),
        ],
      ]
    : [],
);
const studentId = (email) =>
  byEmail.get(payerAliases.get(email?.toLowerCase()) || email?.toLowerCase()) ||
  null;
const base = (r) => ({ source_row: r._sourceRow, source_record: r });
const tables = {
  fwb_students: students.map((r) => ({
    id: byEmail.get(r["Email (unique)"]?.toLowerCase()),
    email: r["Email (unique)"],
    name: r.Student,
    offer: r.Offer || null,
    contract_value: num(r["Contract value"]),
    coach: r.Coach,
    ...base(r),
  })),
  fwb_payments: get("Payments").map((r) => ({
    id: r["Transaction ID"],
    student_id: studentId(r.Email),
    payer_email: r.Email,
    payer_name: r.Student,
    paid_at: r["Paid at"],
    gross_amount: num(r["Gross amount"]),
    processing_fee: num(r["Processing fee"]),
    net_received: num(r["Net received"]),
    status: r.Status,
    event_type: r.Type,
    setter: r.Setter,
    closer: r.Closer,
    offer: r.Offer,
    manual: r["Transaction ID"].startsWith("MANUAL-"),
    verification_status: r["Transaction ID"].startsWith("MANUAL-")
      ? "manual_needs_verification"
      : "imported_unreconciled",
    ...base(r),
  })),
  fwb_coach_assignments: get("Coaching Roster").map((r) => ({
    id: key("assignment", r.Email + "|" + r.Coach),
    student_id: studentId(r.Email),
    student_email: r.Email,
    coach: r.Coach,
    program: r.Program,
    start_date: date(r["Start date"]),
    monthly_rate: num(r["Monthly rate"]),
    duration_months: num(r["Duration (months)"]),
    payment_verified: r["Payment verified?"] === "YES",
    ...base(r),
  })),
  fwb_student_pauses: get("Student Pauses").map((r) => ({
    id: key(
      "pause",
      r["Student email"] + "|" + r["Pause start"] + "|" + r["Pause end"],
    ),
    student_email: r["Student email"],
    start_date: date(r["Pause start"]),
    end_date: date(r["Pause end"]),
    ...base(r),
  })),
  fwb_coach_compensation: get("Coach Compensation Ledger").map((r) => ({
    id: key(
      "coachfee",
      r["Student email"] + "|" + r.Coach + "|" + r["Period start"],
    ),
    period_start: date(r["Period start"]),
    period_end: date(r["Period end"]),
    coach: r.Coach,
    student_email: r["Student email"],
    eligibility: r["Eligible?"],
    amount_due: num(r["Amount due"]),
    paid_amount: num(r["Paid amount"]),
    status: r.Status,
    ...base(r),
  })),
  fwb_commission_entries: get("Commission Ledger").map((r) => ({
    id: key("commission", r["Transaction ID"]),
    payment_id: r["Transaction ID"],
    setter: r.Setter,
    closer: r.Closer,
    cash_collected: num(r["Cash collected"]),
    setter_earned: num(r["Setter earned"]),
    closer_earned: num(r["Closer earned"]),
    total_earned: num(r["Total earned"]),
    ...base(r),
  })),
  fwb_payouts: get("Payouts").map((r) => ({
    id: r["Payout ID"],
    paid_date: date(r.Date),
    representative: r.Rep,
    role: r.Role,
    gross_commissions: num(r["Gross commissions"]),
    transfer_fee: num(r["Transfer fee"]),
    net_payout: num(r["Net payout"]),
    status: r.Status,
    ...base(r),
  })),
  fwb_leads: records(payload, "Contacts", "contacts").map((r) => ({
    id: key("lead", r.Contact),
    created_at: r["Contact Creation Date"],
    name: [r["First Name"], r["Last Name"]].filter(Boolean).join(" "),
    contact: r.Contact,
    stage: r["Contact Stage"],
    scheduling_status: r["Scheduling status"],
    utm_source: r["UTM Source"],
    utm_campaign: r["UTM Campaign"],
    closer: r["Current Closer Owner"],
    ...base(r),
  })),
};

for (const [table, items] of Object.entries(tables)) {
  if (new Set(items.map((x) => x.id)).size !== items.length)
    throw new Error(
      `Duplicate stable identity in ${table}; review source records before import.`,
    );
  console.log(`${table}: ${items.length} records validated`);
}
if (process.argv.includes("--dry-run")) {
  console.log("Dry run passed; no remote writes.");
  process.exit(0);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "Configure server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.",
  );
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
// Activate reporting snapshot only after every staging/entity request succeeds.
// First create the snapshot FK target; existing reporting payload is retained until final activation.
const existing = await db
  .from("source_snapshots")
  .select("id")
  .eq("id", id)
  .maybeSingle();
if (existing.error) throw existing.error;
if (!existing.data) {
  const { error } = await db.from("source_snapshots").insert({ id, payload });
  if (error) throw error;
}
for (let i = 0; i < rows.length; i += 250) {
  const { error } = await db
    .from("source_records")
    .upsert(rows.slice(i, i + 250));
  if (error) throw error;
}
for (const [table, items] of Object.entries(tables))
  for (let i = 0; i < items.length; i += 250) {
    const { error } = await db.from(table).upsert(items.slice(i, i + 250));
    if (error) throw error;
  }
const { error } = await db.from("source_snapshots").upsert({ id, payload });
if (error) throw error;
console.log(
  `Imported ${rows.length} source rows and all typed entities. Restart API and verify totals.`,
);
