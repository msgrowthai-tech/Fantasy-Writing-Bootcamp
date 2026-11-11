import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { installAuth } from "../server/auth.js";
async function fixture(run) {
  const app = express();
  app.use(express.json());
  const updates = [];
  const db = {
    auth: {
      admin: {
        updateUserById: async (id, change) => {
          updates.push({ id, change });
          return { data: { user: { id } }, error: null };
        },
      },
      getUser: async (token) => ({
        data: {
          user: {
            id: token === "allowed" ? "staff-id" : "student-id",
            email:
              token === "allowed"
                ? "simon@jedherne.com"
                : "student@example.test",
            email_confirmed_at: "2026-11-11T00:00:00Z",
          },
        },
        error: null,
      }),
    },
  };
  installAuth(app, {
    db,
    required: true,
    allowlist: "simon@jedherne.com",
    secure: true,
  });
  app.get("/api/dashboard", (req, res) => res.json({ private: true }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    await run(`http://127.0.0.1:${server.address().port}`, updates);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
test("financial API denies anonymous access", async () =>
  fixture(async (base) => {
    const r = await fetch(base + "/api/dashboard");
    assert.equal(r.status, 401);
    assert.ok(!(await r.text()).includes("private"));
  }));
test("confirmed allowlisted staff can access financial API", async () =>
  fixture(async (base) => {
    const r = await fetch(base + "/api/dashboard", {
      headers: { cookie: "fwb_session=allowed" },
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).private, true);
  }));
test("authenticated non-staff accounts are denied", async () =>
  fixture(async (base) => {
    const r = await fetch(base + "/api/dashboard", {
      headers: { cookie: "fwb_session=student" },
    });
    assert.equal(r.status, 401);
  }));
test("cross-origin login and logout are rejected", async () =>
  fixture(async (base) => {
    for (const route of ["login", "logout"]) {
      const r = await fetch(base + "/api/" + route, {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      assert.equal(r.status, 403);
    }
  }));
test("logout clears HttpOnly Secure session cookie", async () =>
  fixture(async (base) => {
    const r = await fetch(base + "/api/logout", { method: "POST" });
    assert.equal(r.status, 200);
    for (const part of ["HttpOnly", "Secure", "SameSite=Strict", "Max-Age=0"])
      assert.ok(r.headers.get("set-cookie").includes(part));
  }));

test("password setup requires a verified staff token", async () =>
  fixture(async (base, updates) => {
    for (const accessToken of ["", "student"]) {
      const r = await fetch(base + "/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password: "a-long-test-password" }),
      });
      assert.equal(r.status, 401);
    }
    assert.equal(updates.length, 0);
  }));
test("password setup targets verified identity, never request user ID", async () =>
  fixture(async (base, updates) => {
    const r = await fetch(base + "/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: "allowed",
        password: "a-long-test-password",
        userId: "attacker-target",
      }),
    });
    assert.equal(r.status, 200);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, "staff-id");
  }));
test("password setup rejects short passwords before writing", async () =>
  fixture(async (base, updates) => {
    const r = await fetch(base + "/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: "allowed", password: "short" }),
    });
    assert.equal(r.status, 400);
    assert.equal(updates.length, 0);
  }));
