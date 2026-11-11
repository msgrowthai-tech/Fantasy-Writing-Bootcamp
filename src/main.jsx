import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Wallet,
  Users,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Download,
  Check,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  Database,
  AlertCircle,
  RefreshCw,
  Menu,
  X,
  Layers,
  LogOut,
  SlidersHorizontal,
  ExternalLink,
  TrendingUp,
  CircleDollarSign,
  Target,
  Compass,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import "./styles.css";
const money = (v, d = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d,
  }).format(v || 0);
const sum = (a, key) =>
  a.reduce(
    (s, r) => s + (Number(typeof key === "function" ? key(r) : r[key]) || 0),
    0,
  );
const nav = [
  ["Overview", LayoutDashboard],
  ["Transactions", Wallet],
  ["Sales & commissions", TrendingUp],
  ["Coaching & payouts", BookOpen],
  ["Leads & marketing", Users],
  ["Data & reconciliation", Database],
];
function Badge({ children, tone = "green" }) {
  return <span className={"badge " + tone}>{children}</span>;
}
function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setPassword("");
      onSignedIn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="loading">
      <form className="loginCard" onSubmit={submit}>
        <div className="brandIcon">
          <BookOpen />
        </div>
        <div className="eyebrow">FANTASY WRITING BOOTCAMP</div>
        <h1>Your command center.</h1>
        <p>Sign in to your private business workspace.</p>
        <label>
          Work email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
          <ArrowRight size={16} />
        </button>
        <small>
          Access is restricted to authorized staff. Contact your workspace
          administrator for account access.
        </small>
      </form>
    </div>
  );
}
function App() {
  const [needsLogin, setNeedsLogin] = useState(false);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [page, setPage] = useState("Overview"),
    [range, setRange] = useState("All time"),
    [search, setSearch] = useState(""),
    [detail, setDetail] = useState(null),
    [mobile, setMobile] = useState(false),
    [coachMonth, setCoachMonth] = useState("2026-10"),
    [start, setStart] = useState("2026-10-01"),
    [end, setEnd] = useState("2026-11-10");
  const load = () => {
    setError("");
    fetch("/api/dashboard")
      .then((r) => {
        if (r.status === 401) {
          setNeedsLogin(true);
          setData(null);
          return null;
        }
        if (!r.ok)
          throw Error(
            "Unable to load the imported data. Check the API server and workbook import.",
          );
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  if (needsLogin)
    return (
      <SignIn
        onSignedIn={() => {
          setNeedsLogin(false);
          load();
        }}
      />
    );
  if (!data)
    return (
      <div className="loading">
        <div className="brandIcon">
          <BookOpen />
        </div>
        <h2>Opening your command center</h2>
        <p>{error || "Reading the financial workbook…"}</p>
        {error && <button onClick={load}>Try again</button>}
      </div>
    );
  const inRange = (date) => {
    if (!date) return false;
    if (range === "All time") return true;
    if (range === "October 2026") return date.startsWith("2026-10");
    if (range === "November 2026") return date.startsWith("2026-11");
    if (range === "Last 30 days")
      return date >= "2026-10-12" && date <= "2026-11-10";
    return date >= start && date <= end;
  };
  const payments = data.payments.filter((p) => inRange(p.date)),
    leads = data.contacts.filter((c) => inRange(c.date));
  const cash = sum(payments, "amount"),
    fees = sum(payments, "fee"),
    net = sum(payments, "net");
  const grouped = {};
  for (const p of payments) {
    const month = p.date.slice(0, 7);
    grouped[month] ??= { month, cash: 0, net: 0 };
    grouped[month].cash += p.amount;
    grouped[month].net += p.net;
  }
  const chart = Object.values(grouped).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  const selectedCommissions = data.commissionLedger.filter((r) =>
    payments.some((p) => p["Transaction ID"] === r["Transaction ID"]),
  );
  const commission = sum(selectedCommissions, "Total earned");
  const navigate = (p) => {
    setPage(p);
    setSearch("");
    setMobile(false);
  };
  const exportRows = (rows, filename) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]).filter((k) => !k.startsWith("_"));
    const csv = [keys, ...rows.map((r) => keys.map((k) => r[k]))]
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(
                typeof v === "string" && /^[=+@\-\t\r]/.test(v)
                  ? "'" + v
                  : (v ?? ""),
              ).replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const table = (rows, cols, click) => (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr
                key={i}
                onClick={() => click?.(r)}
                className={click ? "clickable" : ""}
              >
                {cols.map((c) => (
                  <td key={c.label}>
                    {c.render ? c.render(r) : r[c.key] || "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols.length}>
                <div className="empty">
                  No records for this selection.
                  <br />
                  <small>Try another date range or search.</small>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
  const paymentCols = [
    {
      label: "Student / payer",
      render: (r) => (
        <div className="person">
          <span className="avatar">
            {r.Student?.split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <strong>{r.Student}</strong>
            <small>{r.Offer || "Offer not recorded"}</small>
          </div>
        </div>
      ),
    },
    { label: "Payment date", key: "date" },
    { label: "Amount", render: (r) => <strong>{money(r.amount, 2)}</strong> },
    {
      label: "Source",
      render: (r) => <span>{r.manual ? "Manual entry" : "Commas record"}</span>,
    },
    {
      label: "Status",
      render: (r) => (
        <Badge tone={r.manual ? "amber" : "green"}>
          {r.manual ? "Needs verification" : r.Status}
        </Badge>
      ),
    },
    { label: "", render: () => <ArrowUpRight size={15} /> },
  ];
  const kpi = (label, value, sub, Icon = CircleDollarSign) => (
    <div className="kpi">
      <div className="kpiTop">
        {label}
        <Icon size={17} />
      </div>
      <div className="kpiValue">{value}</div>
      <div className="kpiSub">{sub}</div>
    </div>
  );
  const transactions = () => {
    const q = search.toLowerCase();
    const rows = payments
      .filter((p) =>
        [p.Student, p.Email, p["Transaction ID"], p.Offer]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    return (
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h3>Payment ledger</h3>
            <p>{rows.length} records · actual payment date · USD</p>
          </div>
          <div className="actions">
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Search transactions"
                placeholder="Search students or transactions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className="button"
              onClick={() => exportRows(rows, "fwb-payments.csv")}
            >
              <Download size={15} /> Export
            </button>
          </div>
        </div>
        {table(rows, paymentCols, setDetail)}
      </section>
    );
  };
  const title = {
    Overview: "A clearer view of your business.",
    Transactions: "Every payment. One place.",
    "Sales & commissions": "The people behind the growth.",
    "Coaching & payouts": "Support the people who support your writers.",
    "Leads & marketing": "Where the next chapter begins.",
    "Data & reconciliation": "Confidence starts with good data.",
  }[page];
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <div className="brandIcon">
            <BookOpen size={23} />
          </div>
          <div>
            FANTASY WRITING<small>BOOTCAMP</small>
          </div>
        </a>
        <div className="workspace">
          <div className="workspaceAvatar">JH</div>
          <div>
            <strong>Jed Herne</strong>
            <small>Business workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="navLabel">WORKSPACE</p>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "navItem active" : "navItem"}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Data & reconciliation" && (
                <span className="count">{data.issues.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <div className="chapter">
            <Compass size={22} />
            <h4>Write the next chapter.</h4>
            <p>
              A little clarity.
              <br />A lot of possibility.
            </p>
            <span>YOUR BUSINESS, IN FOCUS</span>
          </div>
          <div className="profile">
            <span className="workspaceAvatar">JH</span>
            <div>
              <strong>Executive workspace</strong>
              <small>Read-only presentation</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobileMenu"
              aria-label="Toggle menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topRight">
            <span className="snapshotDot" /> Imported snapshot{" "}
            <span className="divider" /> <span>USD</span>
            <div className="tinyAvatar">JH</div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                setData(null);
                setNeedsLogin(true);
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="content">
          <div className="eyebrow">
            FANTASY WRITING BOOTCAMP <span>/</span> COMMAND CENTER
          </div>
          <div className="pageHeading">
            <div>
              <h1>{title}</h1>
              <p>Your numbers, connected. Your next move, clearer.</p>
            </div>
            <div className="filters">
              <CalendarDays size={16} />
              <select
                aria-label="Date range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                {[
                  "All time",
                  "October 2026",
                  "November 2026",
                  "Last 30 days",
                  "Custom range",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          {range === "Custom range" && (
            <div className="customDates">
              <label>
                From{" "}
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                To{" "}
                <input
                  type="date"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
          )}
          <div className="sourceStrip">
            <span>
              <span className="snapshotDot" /> Data through November 10, 2026{" "}
              <span className="stripDivider">·</span> Workbook + iClosed export
            </span>
            <button onClick={() => navigate("Data & reconciliation")}>
              View data sources <ArrowUpRight size={13} />
            </button>
          </div>
          {page === "Overview" && (
            <>
              <div className="sectionTitle">
                <h2>Financial overview</h2>
                <span>
                  {range} <span className="dotSep">·</span> USD
                </span>
              </div>
              <div className="kpiGrid">
                {kpi(
                  "Cash collected",
                  money(cash),
                  `${payments.length} recorded payments`,
                  Wallet,
                )}
                {kpi(
                  "Net receipts",
                  money(net),
                  `${money(fees, 2)} in processing fees`,
                  ArrowDownLeft,
                )}
                {kpi(
                  "Contract value",
                  money(data.metrics["Lifetime contract value"]),
                  "Lifetime · workbook enrollment total",
                  Target,
                )}
                {kpi(
                  "New leads",
                  leads.length.toLocaleString(),
                  "By contact creation date",
                  Users,
                )}
              </div>
              <div className="overviewGrid">
                <section className="panel chartPanel">
                  <div className="panelHeader">
                    <div>
                      <h3>Cash collection</h3>
                      <p>A view of the revenue coming in.</p>
                    </div>
                    <span className="chartBadge">Monthly</span>
                  </div>
                  <div className="chartTotal">
                    {money(cash)}
                    <span>gross collected</span>
                  </div>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height={230}>
                      <AreaChart
                        data={chart}
                        margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="cashFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#B0785F"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#B0785F"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          stroke="#ece6df"
                          strokeDasharray="3 5"
                        />
                        <XAxis
                          dataKey="month"
                          tickFormatter={(v) =>
                            new Date(v + "-02").toLocaleDateString("en-US", {
                              month: "short",
                            })
                          }
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#8e8177" }}
                          dy={10}
                        />
                        <YAxis
                          tickFormatter={(v) => "$" + v / 1000 + "k"}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#8e8177" }}
                          width={53}
                        />
                        <Tooltip
                          formatter={(v) => money(v, 2)}
                          contentStyle={{
                            border: "1px solid #e4dbd2",
                            borderRadius: 10,
                          }}
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          name="Gross collected"
                          dataKey="cash"
                          stroke="#B0785F"
                          strokeWidth={3}
                          fill="url(#cashFill)"
                          dot={{
                            r: 4,
                            fill: "#B0785F",
                            stroke: "#fff",
                            strokeWidth: 2,
                          }}
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          name="Net receipts"
                          dataKey="net"
                          stroke="#b5b49e"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fill="transparent"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="legend">
                    <span>
                      <i />
                      Gross collected
                    </span>
                    <span>
                      <i className="sage" />
                      Net receipts
                    </span>
                    <small>Source: Payments tab</small>
                  </div>
                </section>
                <section className="panel moneyPanel">
                  <div className="panelHeader">
                    <div>
                      <h3>Where the money goes</h3>
                      <p>Lifetime recorded financial position</p>
                    </div>
                    <Layers size={18} />
                  </div>
                  <div className="waterfall">
                    <div>
                      <span>Net receipts</span>
                      <strong>
                        {money(data.metrics["Lifetime net receipts"], 2)}
                      </strong>
                    </div>
                    <div>
                      <span>Sales commissions earned</span>
                      <strong>
                        −{" "}
                        {money(
                          data.metrics["Setter commissions earned"] +
                            data.metrics["Closer commissions earned"],
                          2,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Coaching compensation</span>
                      <strong>
                        − {money(data.metrics["Coach expense earned"], 2)}
                      </strong>
                    </div>
                    <div>
                      <span>Transfer fees</span>
                      <strong>
                        − {money(data.metrics["Transfer fees"], 2)}
                      </strong>
                    </div>
                    <div>
                      <span>Recorded operating expenses</span>
                      <strong>
                        {money(data.metrics["Operating expenses"], 2)}
                      </strong>
                    </div>
                  </div>
                  <div className="profit">
                    <span>
                      Estimated operating profit{" "}
                      <Badge tone="neutral">Workbook</Badge>
                    </span>
                    <strong>
                      {money(data.metrics["Estimated operating profit"], 2)}
                    </strong>
                    <small>
                      Accrued costs against receipts. Expenses and bank data
                      incomplete.
                    </small>
                  </div>
                  <button
                    className="textButton"
                    onClick={() => navigate("Data & reconciliation")}
                  >
                    Explore financial records <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="lowerGrid">
                <section className="panel obligations">
                  <div className="panelHeader">
                    <div>
                      <h3>On the horizon</h3>
                      <p>Outstanding obligations in the workbook</p>
                    </div>
                    <CalendarDays size={18} />
                  </div>
                  <button
                    className="obligationRow"
                    onClick={() => navigate("Coaching & payouts")}
                  >
                    <span className="obligationIcon">
                      <BookOpen size={20} />
                    </span>
                    <div>
                      <strong>Coach compensation</strong>
                      <small>October · scheduled November 5</small>
                    </div>
                    <div className="right">
                      <strong>
                        {money(data.metrics["Unpaid coaches"], 2)}
                      </strong>
                      <Badge tone="amber">Unrecorded payment</Badge>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="obligationRow"
                    onClick={() => navigate("Sales & commissions")}
                  >
                    <span className="obligationIcon sageBg">
                      <Users size={20} />
                    </span>
                    <div>
                      <strong>Sales commissions</strong>
                      <small>Biweekly · dates need confirmation</small>
                    </div>
                    <div className="right">
                      <strong>
                        {money(data.metrics["Unpaid commissions"], 2)}
                      </strong>
                      <Badge tone="neutral">Outstanding</Badge>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                </section>
                <section className="attention">
                  <div className="attentionHead">
                    <span className="attentionIcon">
                      <AlertCircle size={19} />
                    </span>
                    <Badge tone="amber">
                      {data.issues.length} items to review
                    </Badge>
                  </div>
                  <h3>
                    A little attention,
                    <br />a clearer picture.
                  </h3>
                  <p>
                    Manual payments, roster gaps, and bank reconciliation need a
                    second look.
                  </p>
                  <button onClick={() => navigate("Data & reconciliation")}>
                    Review exceptions <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Recent payments</h3>
                    <p>The latest chapters in your growth.</p>
                  </div>
                  <button
                    className="textButton"
                    onClick={() => navigate("Transactions")}
                  >
                    View all transactions <ArrowRight size={15} />
                  </button>
                </div>
                {table(
                  [...payments]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 5),
                  paymentCols,
                  setDetail,
                )}
              </section>
            </>
          )}
          {page === "Transactions" && (
            <>
              <div className="kpiGrid three">
                {kpi(
                  "Gross collected",
                  money(cash, 2),
                  "Successful payments, signed amounts",
                )}
                {kpi(
                  "Processing fees",
                  money(fees, 2),
                  "Recorded fees · some manual fees provisional",
                )}
                {kpi(
                  "Net receipts",
                  money(net, 2),
                  "Gross less recorded processing fees",
                )}
              </div>
              {transactions()}
            </>
          )}
          {page === "Sales & commissions" && (
            <>
              <div className="kpiGrid three">
                {kpi(
                  "Commissions earned",
                  money(commission, 2),
                  "Selected payment dates · source ledger",
                )}
                {kpi(
                  "Commissions paid",
                  money(data.metrics["Total commissions paid"], 2),
                  "Lifetime · recorded payout batches",
                )}
                {kpi(
                  "Outstanding commissions",
                  money(data.metrics["Unpaid commissions"], 2),
                  "Lifetime · not bank reconciled",
                )}
              </div>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Sales team balances</h3>
                    <p>
                      Lifetime balances by role. A person may hold multiple
                      roles.
                    </p>
                  </div>
                  <Badge tone="neutral">Biweekly</Badge>
                </div>
                {table(data.commissions, [
                  { label: "Representative", key: "Rep" },
                  { label: "Role", key: "Role" },
                  {
                    label: "Earned",
                    render: (r) => money(r["Total earned"], 2),
                  },
                  {
                    label: "Paid",
                    render: (r) => money(r["Paid commissions"], 2),
                  },
                  {
                    label: "Outstanding",
                    render: (r) => (
                      <strong>{money(r["Unpaid balance"], 2)}</strong>
                    ),
                  },
                  {
                    label: "Status",
                    render: (r) => (
                      <Badge
                        tone={
                          r["Ready for payout"] === "DUE" ? "amber" : "green"
                        }
                      >
                        {r["Ready for payout"]}
                      </Badge>
                    ),
                  },
                ])}
              </section>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Cash attributed · trailing 30 days</h3>
                    <p>
                      October 12–November 10 · setter and closer roles shown
                      separately
                    </p>
                  </div>
                </div>
                {table(
                  [
                    ...new Set(
                      data.payments
                        .flatMap((p) => [p.Setter, p.Closer])
                        .filter(Boolean),
                    ),
                  ].map((name) => ({
                    name,
                    setter: sum(
                      data.payments.filter(
                        (p) =>
                          p.Setter === name &&
                          p.date >= "2026-10-12" &&
                          p.date <= "2026-11-10",
                      ),
                      "amount",
                    ),
                    closer: sum(
                      data.payments.filter(
                        (p) =>
                          p.Closer === name &&
                          p.date >= "2026-10-12" &&
                          p.date <= "2026-11-10",
                      ),
                      "amount",
                    ),
                  })),
                  [
                    { label: "Representative", key: "name" },
                    {
                      label: "Setter-attributed cash",
                      render: (r) => money(r.setter, 2),
                    },
                    {
                      label: "Closer-attributed cash",
                      render: (r) => money(r.closer, 2),
                    },
                  ],
                )}
              </section>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Recorded payout history</h3>
                    <p>Source: Payouts · does not verify bank settlement</p>
                  </div>
                </div>
                {table(data.payouts, [
                  { label: "Representative", key: "Rep" },
                  { label: "Role", key: "Role" },
                  { label: "Date", render: (r) => r.Date?.slice(0, 10) },
                  {
                    label: "Gross commission",
                    render: (r) => money(r["Gross commissions"], 2),
                  },
                  {
                    label: "Transfer fee",
                    render: (r) => money(r["Transfer fee"], 2),
                  },
                  { label: "Status", render: (r) => <Badge>{r.Status}</Badge> },
                ])}
              </section>
            </>
          )}
          {page === "Coaching & payouts" && (
            <>
              <div className="kpiGrid three">
                {kpi(
                  "Assigned roster",
                  data.roster.length,
                  "Includes unpaid coach arrangements",
                  Users,
                )}
                {kpi(
                  "Recorded October earned",
                  money(data.metrics["Coach expense earned"], 2),
                  "Source ledger · retained historical result",
                )}
                {kpi(
                  "Recorded coach payments",
                  money(data.metrics["Coach payments made"], 2),
                  "No coach disbursements recorded",
                )}
              </div>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Calendar-month compensation</h3>
                    <p>
                      Full monthly fee from start month. Overlapping pause days
                      counted once.
                    </p>
                  </div>
                  <select
                    aria-label="Compensation month"
                    value={coachMonth}
                    onChange={(e) => setCoachMonth(e.target.value)}
                  >
                    <option value="2026-10">October 2026</option>
                    <option value="2026-11">November 2026 · forecast</option>
                    <option value="2026-12">December 2026 · forecast</option>
                  </select>
                </div>
                <div className="infoNote">
                  {coachMonth === "2026-10"
                    ? "Recomputed roster accrual; compare with the historical ledger below."
                    : "Forecast from the imported roster; not an approved payable. Starts, pauses, and eligibility must be reverified."}{" "}
                  Payout: {(data.accruals[coachMonth] || [])[0]?.payout}.
                </div>
                {table(data.accruals[coachMonth] || [], [
                  { label: "Student", key: "student" },
                  { label: "Coach", key: "coach" },
                  { label: "Program", key: "program" },
                  { label: "Monthly rate", render: (r) => money(r.rate, 2) },
                  { label: "Paused days", render: (r) => r.pausedDays },
                  {
                    label: "Amount",
                    render: (r) => <strong>{money(r.amount, 2)}</strong>,
                  },
                ])}
                <div className="tableTotal">
                  Calculated total{" "}
                  <strong>
                    {money(sum(data.accruals[coachMonth] || [], "amount"), 2)}
                  </strong>
                </div>
              </section>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Historical coach balances</h3>
                    <p>
                      Workbook snapshot · all recorded periods · bank transfers
                      not reconciled
                    </p>
                  </div>
                </div>
                {table(data.coaches, [
                  { label: "Coach", key: "Coach" },
                  { label: "Assigned students", key: "Assigned students" },
                  { label: "Started students", key: "Started students" },
                  {
                    label: "Earned to date",
                    render: (r) => money(r["Earned to date"], 2),
                  },
                  { label: "Paid", render: (r) => money(r.Paid, 2) },
                  {
                    label: "Outstanding",
                    render: (r) => money(r.Outstanding, 2),
                  },
                ])}
              </section>
            </>
          )}
          {page === "Leads & marketing" && (
            <>
              <div className="kpiGrid three">
                {kpi(
                  "New contacts",
                  leads.length,
                  "By contact creation date",
                  Users,
                )}
                {kpi(
                  "Contacts with strategy calls",
                  leads.filter((c) => c.scheduling?.includes("STRATEGY_CALL"))
                    .length,
                  "Current scheduling status; not completed calls",
                  CalendarDays,
                )}
                {kpi(
                  "Attributed contacts",
                  leads.filter((c) => c.source !== "Unattributed").length,
                  "UTM source present",
                  Compass,
                )}
              </div>
              <div className="overviewGrid">
                <section className="panel">
                  <div className="panelHeader">
                    <div>
                      <h3>Lead sources</h3>
                      <p>Contact count by imported UTM source</p>
                    </div>
                  </div>
                  {table(
                    Object.entries(
                      leads.reduce((a, c) => {
                        a[c.source] = (a[c.source] || 0) + 1;
                        return a;
                      }, {}),
                    )
                      .sort((a, b) => b[1] - a[1])
                      .map(([source, count]) => ({ source, count })),
                    [
                      { label: "Source", key: "source" },
                      { label: "Contacts", key: "count" },
                      {
                        label: "Share",
                        render: (r) => (
                          <div className="share">
                            <div
                              style={{
                                width:
                                  Math.max(
                                    2,
                                    (r.count / (leads.length || 1)) * 100,
                                  ) + "%",
                              }}
                            />
                            <span>
                              {Math.round(
                                (r.count / (leads.length || 1)) * 100,
                              )}
                              %
                            </span>
                          </div>
                        ),
                      },
                    ],
                  )}
                </section>
                <section className="panel">
                  <div className="panelHeader">
                    <div>
                      <h3>Monthly lead generation</h3>
                      <p>Imported contact creation date</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={Object.entries(
                        leads.reduce((a, c) => {
                          const m = c.date?.slice(0, 7) || "Unknown";
                          a[m] = (a[m] || 0) + 1;
                          return a;
                        }, {}),
                      )
                        .sort()
                        .map(([month, count]) => ({ month, count }))}
                    >
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar
                        isAnimationActive={false}
                        dataKey="count"
                        name="Contacts"
                        fill="#B0785F"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </section>
              </div>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Contact directory</h3>
                    <p>
                      No completed-call or close rate inferred from contact
                      statuses.
                    </p>
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search contacts"
                      placeholder="Find a contact"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                {table(
                  leads
                    .filter((c) =>
                      [c.name, c.source, c.stage]
                        .join(" ")
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .slice(0, 100),
                  [
                    { label: "Contact", key: "name" },
                    { label: "Created", key: "date" },
                    { label: "Source", key: "source" },
                    { label: "Stage", key: "stage" },
                    {
                      label: "Scheduling status",
                      render: (r) => (
                        <Badge tone="neutral">
                          {r.scheduling || "Not recorded"}
                        </Badge>
                      ),
                    },
                    { label: "Closer", key: "closer" },
                  ],
                )}
                <div className="infoNote">
                  Showing up to 100 matching contacts. {leads.length} total in
                  the selected period.
                </div>
              </section>
            </>
          )}
          {page === "Data & reconciliation" && (
            <>
              <div className="connectionBanner">
                <Database size={25} />
                <div>
                  <h3>
                    {data.storage === "supabase"
                      ? "Connected to Supabase"
                      : "Private local snapshot"}
                  </h3>
                  <p>
                    {data.storage === "supabase"
                      ? "Reading the imported source snapshot from your project."
                      : "Supabase adapter and migration prepared. Project credentials are not configured yet."}
                  </p>
                </div>
                <Badge tone={data.storage === "supabase" ? "green" : "amber"}>
                  {data.storage === "supabase"
                    ? "Connected"
                    : "Connection pending"}
                </Badge>
              </div>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Reconciliation queue</h3>
                    <p>
                      These records need review before payroll approval or
                      financial decisions.
                    </p>
                  </div>
                  <Badge tone="amber">{data.issues.length} open</Badge>
                </div>
                {data.issues.map((issue, i) => (
                  <div className="issue" key={i}>
                    <AlertCircle size={19} />
                    <div>
                      <h4>{issue.title}</h4>
                      <p>{issue.detail}</p>
                      <small>{issue.source}</small>
                    </div>
                    <Badge tone="amber">{issue.severity}</Badge>
                  </div>
                ))}
              </section>
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <h3>Source inventory</h3>
                    <p>
                      All 21 financial tabs preserved with cached values,
                      formulas, and original row numbers.
                    </p>
                  </div>
                  <button className="button" onClick={load}>
                    <RefreshCw size={15} /> Reload snapshot
                  </button>
                </div>
                {table(
                  [
                    { name: "iClosed · Contacts", rows: data.contacts.length },
                    ...data.inventory,
                  ],
                  [
                    { label: "Worksheet", key: "name" },
                    { label: "Preserved populated rows", key: "rows" },
                  ],
                )}
              </section>
              <div className="infoNote">
                Bank and Commas webhooks are planned, not connected. This demo
                is read-only and has no payment execution. Authentication and
                staff permissions are required before public deployment.
              </div>
            </>
          )}
          <footer>
            <span>
              <BookOpen size={14} /> Built for the business behind the stories.
            </span>
            <span>
              Snapshot · Nov 10, 2026 <span className="dotSep">·</span>{" "}
              Financial Command Center
            </span>
          </footer>
        </div>
      </main>
      {detail && (
        <div className="modalBackdrop" onClick={() => setDetail(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panelHeader">
              <div>
                <div className="eyebrow">PAYMENT RECORD</div>
                <h2 id="detail-title">{detail.Student}</h2>
              </div>
              <button
                aria-label="Close payment details"
                className="iconButton"
                onClick={() => setDetail(null)}
              >
                <X />
              </button>
            </div>
            <div className="modalAmount">{money(detail.amount, 2)}</div>
            <Badge tone={detail.manual ? "amber" : "green"}>
              {detail.manual
                ? "Manual · needs verification"
                : "Recorded succeeded payment"}
            </Badge>
            <dl>
              {[
                ["Transaction ID", detail["Transaction ID"]],
                ["Paid at", detail["Paid at"]],
                ["Payer email", detail.Email],
                ["Offer", detail.Offer || "Not recorded"],
                ["Processing fee", money(detail.fee, 2)],
                ["Net received", money(detail.net, 2)],
                ["Setter", detail.Setter || "None recorded"],
                ["Closer", detail.Closer || "None recorded"],
                ["Source", `Payments · row ${detail._sourceRow}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="infoNote">{detail.Notes}</div>
            <p className="modalFoot">
              Payer and student identity can differ. This record preserves the
              workbook payer label.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
