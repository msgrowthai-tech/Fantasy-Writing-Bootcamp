import { createClient } from "@supabase/supabase-js";
export function installAuth(app, { db, required, allowlist, secure }) {
  const allowed = new Set(
    allowlist
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  );
  const auth =
    process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY
      ? createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_PUBLISHABLE_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        )
      : null;
  const cookie = (token, age) =>
    `fwb_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const validOrigin = (req, res, next) => {
    if (
      req.get("origin") &&
      req.get("origin") !==
        new URL(process.env.APP_ORIGIN || "http://localhost:3001").origin
    )
      return res.status(403).json({ error: "Request origin not allowed." });
    next();
  };
  app.get("/api/session", async (req, res) => res.json({ required }));
  const attempts = new Map();
  app.post("/api/login", validOrigin, async (req, res) => {
    const ip = req.ip,
      now = Date.now();
    let limit = attempts.get(ip);
    if (!limit || now > limit.reset) {
      limit = { count: 0, reset: now + 15 * 60 * 1000 };
      attempts.set(ip, limit);
    }
    if (attempts.size > 10000)
      for (const [key, value] of attempts)
        if (value.reset < now) attempts.delete(key);
    if (++limit.count > 10)
      return res
        .status(429)
        .json({ error: "Too many attempts. Try again in 15 minutes." });
    if (!auth || !db || !allowed.size)
      return res
        .status(503)
        .json({ error: "Staff sign-in is not configured." });
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    if (!allowed.has(email) || password.length > 256)
      return res
        .status(401)
        .json({ error: "Unable to sign in with those credentials." });
    try {
      const { data, error } = await auth.auth.signInWithPassword({
        email,
        password,
      });
      if (
        error ||
        !data.session ||
        !data.user.email_confirmed_at ||
        !allowed.has(data.user.email?.toLowerCase())
      )
        return res
          .status(401)
          .json({ error: "Unable to sign in with those credentials." });
      res
        .set(
          "Set-Cookie",
          cookie(
            data.session.access_token,
            Math.min(data.session.expires_in, 3600),
          ),
        )
        .json({ ok: true });
    } catch {
      res.status(503).json({ error: "Sign-in is temporarily unavailable." });
    }
  });
  app.post("/api/logout", validOrigin, (req, res) =>
    res.set("Set-Cookie", cookie("", 0)).json({ ok: true }),
  );
  app.use("/api", async (req, res, next) => {
    if (!required) return next();
    const raw = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("fwb_session="));
    if (!raw || !db)
      return res.status(401).json({ error: "Staff sign-in required." });
    try {
      const token = decodeURIComponent(raw.slice("fwb_session=".length));
      const { data, error } = await db.auth.getUser(token);
      if (
        error ||
        !data.user?.email_confirmed_at ||
        !allowed.has(data.user.email?.toLowerCase())
      )
        return res.status(401).json({ error: "Staff sign-in required." });
      next();
    } catch {
      res.status(401).json({ error: "Staff sign-in required." });
    }
  });
}
