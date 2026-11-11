import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeModel, coachAccrual } from "../server/model.js";
const source = JSON.parse(fs.readFileSync(".local/source.json", "utf8"));
const model = makeModel(source);
const total = (a, k) => a.reduce((n, r) => n + (+r[k] || 0), 0);
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);
test("payment rows reconcile with cached workbook totals", () => {
  assert.equal(model.payments.length, 44);
  near(total(model.payments, "amount"), 142934);
  near(total(model.payments, "fee"), 4083.28);
  near(total(model.payments, "net"), 138850.72);
  assert.equal(
    new Set(model.payments.map((p) => p["Transaction ID"])).size,
    44,
  );
});
test("all financial sheets and contacts preserved", () => {
  assert.equal(model.inventory.length, 21);
  assert.equal(model.contacts.length, 676);
  assert.equal(model.students.length, 32);
});
test("October payroll follows recorded calendar-month policy", () => {
  const rows = coachAccrual(model.roster, model.pauses, "2026-10");
  near(total(rows, "amount"), 2694.36);
  assert.ok(
    !rows.some(
      (r) => r.student === "Andre Mercer" || r.student === "Josh McFarland",
    ),
  );
  assert.equal(rows.find((r) => r.student === "Michael Harder").amount, 84.68);
  assert.equal(rows.find((r) => r.student === "Laurel Mathis").amount, 84.68);
  assert.ok(rows.every((r) => r.payout === "2026-11-05"));
});
test("November admits Andre but not Josh and pays December 5", () => {
  const rows = coachAccrual(model.roster, model.pauses, "2026-11");
  assert.equal(rows.find((r) => r.student === "Andre Mercer").amount, 150);
  assert.ok(!rows.some((r) => r.student === "Josh McFarland"));
  assert.ok(rows.every((r) => r.payout === "2026-12-05"));
});
test("overlapping pauses count once and late starts get full fee", () => {
  const r = [
    {
      Student: "Example",
      Email: "x",
      Coach: "Coach",
      Program: "Regular",
      "Start date": "2026-10-30",
      "Monthly rate": 125,
      "Duration (months)": 3,
      "Payment verified?": "YES",
    },
  ];
  assert.equal(coachAccrual(r, [], "2026-10")[0].amount, 125);
  const pauses = [
    {
      "Student email": "x",
      "Pause start": "2026-11-01",
      "Pause end": "2026-11-10",
    },
    {
      "Student email": "x",
      "Pause start": "2026-11-05",
      "Pause end": "2026-11-12",
    },
  ];
  assert.equal(coachAccrual(r, pauses, "2026-11")[0].pausedDays, 12);
  assert.equal(coachAccrual(r, [], "2027-01").length, 0);
});
test("manual records and missing roster remain explicit exceptions", () => {
  assert.equal(model.payments.filter((p) => p.manual).length, 3);
  assert.ok(model.issues.some((i) => i.title.includes("Conner")));
  assert.ok(model.issues.some((i) => i.title.includes("Bank balance")));
});
test("commission and coach balances reconcile to workbook", () => {
  near(total(model.commissions, "Unpaid balance"), 4552.6);
  near(total(model.coaches, "Outstanding"), 2694.36);
});
