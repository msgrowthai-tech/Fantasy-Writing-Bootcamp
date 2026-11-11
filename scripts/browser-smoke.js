import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.BASE_URL || "http://127.0.0.1:3001");
await page
  .getByRole("heading", { name: "A clearer view of your business." })
  .waitFor();
await page.screenshot({ path: ".local/dashboard-desktop.png", fullPage: true });
await page
  .getByRole("combobox", { name: "Date range" })
  .selectOption("November 2026");
await page.getByText("$9,800", { exact: true }).first().waitFor();
await page.getByRole("button", { name: "Transactions", exact: true }).click();
await page.getByLabel("Search transactions").fill("Andre");
assert.equal(await page.locator("tbody tr").count(), 1);
await page.locator("tbody tr").click();
await page.getByRole("dialog").waitFor();
await page.getByLabel("Close payment details").click();
await page
  .getByRole("button", { name: "Coaching & payouts", exact: true })
  .click();
await page.getByLabel("Compensation month").selectOption("2026-11");
await page.getByRole("cell", { name: "Andre Mercer", exact: true }).waitFor();
assert.equal(
  await page.getByRole("cell", { name: "Josh McFarland", exact: true }).count(),
  0,
);
await page
  .getByRole("button", { name: "Sales & commissions", exact: true })
  .click();
await page.getByRole("heading", { name: "Sales team balances" }).waitFor();
await page
  .getByRole("button", { name: "Leads & marketing", exact: true })
  .click();
await page.getByRole("heading", { name: "Monthly lead generation" }).waitFor();
await page.getByRole("button", { name: /Data & reconciliation/ }).click();
await page.getByRole("heading", { name: "Reconciliation queue" }).waitFor();
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.getByLabel("Date range").selectOption("All time");
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: ".local/dashboard-mobile.png", fullPage: true });
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
await page.getByLabel("Toggle menu").click();
await page.getByRole("button", { name: "Transactions", exact: true }).click();
await page
  .getByRole("heading", { name: "Every payment. One place." })
  .waitFor();
assert.deepEqual(errors, []);
console.log(
  "Browser smoke passed: six views, date filter, search, payment detail, coach forecast, mobile navigation, no page errors.",
);
await browser.close();
