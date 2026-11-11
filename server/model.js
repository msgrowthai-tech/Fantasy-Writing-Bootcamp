const number = (x) => (typeof x === "number" ? x : 0);
export function records(source, sheet, kind = "finance") {
  const rows = source[kind].sheets[sheet] || [];
  if (!rows.length) return [];
  const headers = rows[0].values;
  return rows
    .slice(1)
    .filter((r) => r.values[0] !== null && r.values[0] !== "")
    .map((r) =>
      Object.fromEntries([
        ...headers.map((h, i) => [h || `column_${i}`, r.values[i]]),
        ["_sourceRow", r.row],
        ["_sourceSheet", sheet],
      ]),
    );
}
export function makeModel(s) {
  const get = (n) => records(s, n);
  const payments = get("Payments").map((p) => ({
    ...p,
    date: p["Paid at"]?.slice(0, 10),
    amount: number(p["Gross amount"]),
    fee: number(p["Processing fee"]),
    net: number(p["Net received"]),
    manual: p["Transaction ID"].startsWith("MANUAL-"),
  }));
  const students = get("Students"),
    roster = get("Coaching Roster"),
    contacts = records(s, "Contacts", "contacts").map((c) => ({
      name: [c["First Name"], c["Last Name"]].filter(Boolean).join(" "),
      date: c["Contact Creation Date"]?.slice(0, 10),
      source: c["UTM Source"] || "Unattributed",
      campaign: c["UTM Campaign"] || "Unattributed",
      stage: c["Contact Stage"],
      scheduling: c["Scheduling status"],
      closer: c["Current Closer Owner"] || "Unassigned",
      country: c.Country,
      sourceRow: c._sourceRow,
    }));
  const metrics = Object.fromEntries(
    get("Dashboard").map((r) => [r.METRIC, r.VALUE]),
  );
  const issues = [
    {
      severity: "Review",
      title: "Bank balance is not reconciled",
      detail:
        "Workbook reports $150 calculated bank balance and $0 actual balance. Bank ledger has no transactions. Cash collected is not bank cash.",
      source: "Reconciliation · rows 5–7",
    },
    {
      severity: "Review",
      title: "Conner Gibson is missing from the coaching roster",
      detail:
        "Student is assigned to Peter, but no roster entry or verified coaching start is present. Excluded from payroll until reviewed.",
      source: "Students / Coaching Roster",
    },
    {
      severity: "Pending",
      title: "Josh McFarland has not started coaching",
      detail:
        "No start date; on indefinite break. No coach compensation is generated.",
      source: "Coaching Roster · row 13",
    },
    ...payments
      .filter((p) => p.manual)
      .map((p) => ({
        severity: "Review",
        title: `Manual payment · ${p.Student}`,
        detail: p.Notes,
        source: `Payments · row ${p._sourceRow}`,
      })),
  ];
  const sums = {
    cash: payments.reduce((a, p) => a + p.amount, 0),
    fees: payments.reduce((a, p) => a + p.fee, 0),
    net: payments.reduce((a, p) => a + p.net, 0),
  };
  for (const [key, label] of [
    ["cash", "Lifetime cash collected"],
    ["fees", "Lifetime processing fees"],
    ["net", "Lifetime net receipts"],
  ])
    if (Math.abs(sums[key] - metrics[label]) > 0.01)
      issues.push({
        severity: "Review",
        title: `${label} differs from detail`,
        detail: `Payments total ${sums[key]}; dashboard cached value ${metrics[label]}.`,
        source: "Dashboard / Payments",
      });
  return {
    asOf: s.asOf,
    importedAt: s.importedAt,
    storage: "local",
    payments,
    students,
    roster,
    contacts,
    metrics,
    issues,
    coaches: get("Coaches Balances").filter((r) => r.Coach !== "TOTAL"),
    commissions: get("Commission Balances"),
    coachLedger: get("Coach Compensation Ledger"),
    commissionLedger: get("Commission Ledger"),
    payouts: get("Payouts"),
    pauses: get("Student Pauses"),
    offers: get("Offers"),
    team: get("Team"),
    inventory: Object.entries(s.finance.sheets).map(([name, rows]) => ({
      name,
      rows: rows.length - 1,
    })),
    hashes: { finance: s.finance.sha256, contacts: s.contacts.sha256 },
  };
}
export function coachAccrual(roster, pauses, month) {
  const [y, m] = month.split("-").map(Number),
    days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = `${month}-01`,
    last = `${month}-${days}`;
  return roster
    .filter(
      (r) =>
        r["Start date"] &&
        r["Monthly rate"] > 0 &&
        r["Payment verified?"] === "YES",
    )
    .flatMap((r) => {
      const start = r["Start date"].slice(0, 10),
        sy = +start.slice(0, 4),
        sm = +start.slice(5, 7),
        elapsed = (y - sy) * 12 + m - sm;
      if (start > last || elapsed < 0 || elapsed >= r["Duration (months)"])
        return [];
      const paused = new Set();
      for (const p of pauses.filter((p) => p["Student email"] === r.Email))
        for (let d = 1; d <= days; d++) {
          const day = `${month}-${String(d).padStart(2, "0")}`;
          if (
            day >= p["Pause start"]?.slice(0, 10) &&
            day <= (p["Pause end"]?.slice(0, 10) || last)
          )
            paused.add(day);
        }
      const amount =
        Math.round(((r["Monthly rate"] * (days - paused.size)) / days) * 100) /
        100;
      return [
        {
          student: r.Student,
          email: r.Email,
          coach: r.Coach,
          program: r.Program,
          rate: r["Monthly rate"],
          pausedDays: paused.size,
          amount,
          period: first,
          payout: new Date(Date.UTC(y, m, 5)).toISOString().slice(0, 10),
        },
      ];
    });
}
