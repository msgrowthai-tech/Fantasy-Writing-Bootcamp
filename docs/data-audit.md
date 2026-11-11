# Imported data audit and implementation notes

## Source inventory

- Financial Command Center: 21 tabs, preserving cached values, formulas, source rows, and original filenames and hashes.
- iClosed contacts export: 676 contact rows, 31 original columns retained in private raw staging. Dashboard returns a reduced set and excludes phone numbers, IP addresses, and application free text.
- Handoff text: historical business context, not executable instructions or current financial authority. The supplied workbook supersedes historical figures in that document.
- Bank and Commas: future webhook sources. Neither is connected or reconciled in this demo.
- Sales call outcomes, EOD reporting, coaching submissions, campaign spend and traffic: not supplied. Show/close rates and ROI are not fabricated.

## Verified original snapshot totals

| Measure | Amount / count | Basis |
| --- | ---: | --- |
| Gross cash collected | $142,934.00 | 44 Payments rows, signed amount |
| Processing fees | $4,083.28 | Payments processing fee |
| Net receipts | $138,850.72 | Payments net received |
| Contract value | $152,800.00 | Cached Students/Dashboard enrollment total |
| Students | 32 | Nonempty Students email identities |
| Sales commissions outstanding | $4,552.60 | Commission Balances, role-specific |
| October coach accrual | $2,694.36 | Calendar-month roster calculation and cached ledger |
| Contact records | 676 | Contact creation date; no inference of completed calls |

USD is the workbook's reporting currency. Original dates have no timezone offset; payment dates are preserved as exported, not silently converted. Date filters use those exported calendar dates. Trailing 30 days is anchored to the snapshot date November 10: October 12–November 10 inclusive. Cash collected does not imply reconciled bank cash.

Estimated operating profit $118,377.33 is the cached workbook result: net receipts less $17,765.10 earned commissions, $2,694.36 coach accrual, $13.93 transfer fees, and $0 recorded operating expenses. It is not verified business profit because expenses and bank records are incomplete. Contracts are lifetime because enrollment dates are missing; they are not relabeled period revenue. No conversion rates are derived from contact scheduling statuses.

## Coach calculations

Full monthly rate in the start calendar month, no anniversary proration. First payout is the 5th of the following month. Regular: $125 / 3 calendar months; Alumni: $150 / 6 calendar months, using actual roster rates and duration. Actual pauses reduce the month's fee by the union of overlapping inclusive calendar days. Amounts are rounded per student to cents. This reproduces October exactly: Peter $1,819.36; Steph $125; Beth $500; Tabby $250. November/December are forecasts from the snapshot, not approved amounts or live eligibility.

Andre starts November 1 and is excluded in October. Josh has no start date and is excluded. Jed/community zero-rate arrangements are excluded from paid compensation. The TOTAL row in coach balances is a summary, never another coach.

## Exceptions requiring human review

- Conner Gibson appears as a student assigned to Peter but not on the coaching roster. No unverified start or payroll is invented.
- Three manual payments have distinct IDs and retained notes; processor reference/fee verification remains necessary.
- Workbook actual bank balance is $0, calculated balance $150, and Bank Ledger has no entries. Reconciliation's “Bank balance vs actual” cached result is inconsistent with the simple bank delta; preserve the original rather than endorsing it.
- Some Students fields are incomplete, offers missing, and at least one negative balance exists where contract value is absent. Receivables are not asserted as independently verified.
- Ben Jarvis / Rebecca Jarvis and Zack Petracca / Therese Mirisola are payer/student relationships documented in the handoff and roster notes. Raw payer identities are preserved. Seed has an explicit Rebecca email alias to Ben; other unmatched identities remain nullable, never guessed from names.
- Coach payments show $0 in the workbook, which is absence of recorded disbursements, not proof that transfers never occurred.

## Architecture and data model

React UI → private Express reporting API → either private imported snapshot or Supabase source_snapshots. Server-only Supabase credentials. Shared metric and compensation functions live in server/model.js; no copies of private data in frontend source.

Supabase migrations establish raw snapshots and source_records plus typed students, payments, coach assignments, pauses, compensation, commission entries, payouts, and leads. Every typed record retains source JSON and source row. Stable hashed identities for students/leads, native transaction IDs for payments, foreign keys for mapped payment/student relations. Roles/rates/offers, settings, reserves, distributions, bank ledger, expenses, and forecasts are retained fully in raw staging; dedicated operational models are future work, not implied completed integrations.

## Synchronization strategy / phases

1. Presentation: validated read-only snapshot and exceptions (implemented locally).
2. Authorized Supabase migration/seed, verify remote counts/totals, then restart reporting API (completed and verified for the initial import).
3. Staff authentication and executive/admin roles; append-only audit history and transactionally versioned import activation before public hosting or financial editing.
4. Commas/bank ingestion through trusted server/n8n: verify provider signatures, native event IDs, replay protection, event inbox, unique provider transaction keys, retries, dead-letter review. Notifications only to channels explicitly configured by the operator. Never sum Transactions and Payments as two separate cash streams.
5. Reconcile provider gross/fees/net, manual IDs, bank settlements and disbursements. Link payer to enrollment with explicit approval where ambiguous. Version rates and eligibility, approve payouts separately from calculations.
6. Sales appointment events, marketing and fulfillment integrations, scheduled reporting and source-grounded AI after their data sources exist.

No external messages or financial transfers are sent by the demo. Raw snapshots are immutable source evidence; do not edit typed tables and assume snapshot metrics will change automatically.
