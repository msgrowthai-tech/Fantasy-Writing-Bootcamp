import express from "express";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { installAuth } from "./auth.js";
import { makeModel, coachAccrual } from "./model.js";
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
const db =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      )
    : null;
const required =
  process.env.AUTH_REQUIRED === "true" ||
  process.env.NODE_ENV === "production" ||
  !["127.0.0.1", "localhost", "::1"].includes(process.env.HOST || "127.0.0.1");
app.use(express.json({ limit: "4kb" }));
app.get("/healthz", (req, res) => res.json({ ok: true }));
installAuth(app, {
  db,
  required,
  allowlist: process.env.STAFF_EMAILS || "simon@jedherne.com",
  secure: process.env.NODE_ENV === "production",
});
app.get("/api/dashboard", async (req, res) => {
  try {
    let source;
    if (db) {
      const { data, error } = await db
        .from("source_snapshots")
        .select("payload")
        .eq("id", "fwb-workbook-import")
        .single();
      if (error) throw error;
      source = data.payload;
    } else
      source = JSON.parse(
        await fs.readFile(
          new URL("../.local/source.json", import.meta.url),
          "utf8",
        ),
      );
    const model = makeModel(source);
    model.storage = db ? "supabase" : "local";
    model.accruals = Object.fromEntries(
      ["2026-10", "2026-11", "2026-12"].map((m) => [
        m,
        coachAccrual(model.roster, model.pauses, m),
      ]),
    );
    res.json(model);
  } catch (e) {
    console.error("Data load failed:", e.message);
    res.status(503).json({
      error:
        "Source data unavailable. Import workbooks or check the Supabase connection.",
    });
  }
});
app.use(express.static("dist"));
app.get("/{*path}", (req, res) =>
  res.sendFile(new URL("../dist/index.html", import.meta.url).pathname),
);
app.listen(process.env.PORT || 3001, process.env.HOST || "127.0.0.1", () =>
  console.log("Private demo API ready on port", process.env.PORT || 3001),
);
