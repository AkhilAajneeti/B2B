import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import Icon from "../../components/AppIcon";

/* ==================================================================== *
 * STANDALONE PROTOTYPE PAGE — a faithful, self-contained rebuild of the
 * "My Campaigns" redesign mockup. Everything (data, cards, KPIs) lives in
 * this one file with static demo data, so it touches no other feature.
 * Route: /project
 * ==================================================================== */

const BRAND = "#6E1420";

const GRADIENTS = {
  wine: "linear-gradient(135deg,#7E1524,#B5533A)",
  teal: "linear-gradient(135deg,#264F4A,#5B9187)",
  gold: "linear-gradient(135deg,#7A5A22,#C79A4A)",
  plum: "linear-gradient(135deg,#4A3550,#8B6FA0)",
  steel: "linear-gradient(135deg,#2C4A6E,#6C93BE)",
  olive: "linear-gradient(135deg,#5C6B2A,#9CB05A)",
};

// --- demo data -------------------------------------------------------
const CAMPAIGNS = [
  {
    id: "c1", name: "Gulmohar Noida", config: "2, 3 & 4 BHK · 1250–2600 sq.ft",
    price: "₹1.15 Cr – ₹2.40 Cr", developer: "Gulmohar Group", location: "Sector 150, Noida",
    status: "live", leadsTotal: 212, leadsToday: 23, trendUp: true, thumb: GRADIENTS.wine,
    distMethod: "Weighted", segments: [{ pct: 46, color: "#7A1524" }, { pct: 30, color: "#2F8F83" }, { pct: 24, color: "#E0871E" }],
    agents: [{ i: "PR", c: "#7A1524" }, { i: "RP", c: "#2F8F83" }, { i: "SC", c: "#E0871E" }],
  },
  {
    id: "c2", name: "Skyline Greens", config: "2 & 3 BHK · 1050–1850 sq.ft",
    price: "₹95 L – ₹1.6 Cr", developer: "Skyline Estates", location: "Sector 78, Noida",
    status: "live", leadsTotal: 141, leadsToday: 14, trendUp: true, thumb: GRADIENTS.steel,
    distMethod: "Round-robin", segments: [{ pct: 58, color: "#4A3550" }, { pct: 42, color: "#E0871E" }],
    agents: [{ i: "NV", c: "#3C0A12" }, { i: "SC", c: "#E0871E" }],
  },
  {
    id: "c3", name: "Riverside Residences", config: "2 & 3 BHK · 980–1650 sq.ft",
    price: "₹68 L – ₹1.1 Cr", developer: "Riverside Developers", location: "Yamuna Expressway",
    status: "paused", leadsTotal: 64, leadsToday: 0, trendUp: false, thumb: GRADIENTS.gold,
    distMethod: "Weighted", segments: [{ pct: 100, color: "#2F8F83" }],
    agents: [{ i: "RP", c: "#2F8F83" }],
  },
  {
    id: "c4", name: "Emerald Heights", config: "3 & 4 BHK · 1450–2400 sq.ft",
    price: "₹1.4 Cr – ₹2.9 Cr", developer: "Emerald Buildcon", location: "Sector 137, Noida",
    status: "live", leadsTotal: 178, leadsToday: 9, trendUp: true, thumb: GRADIENTS.teal,
    distMethod: "Weighted", segments: [{ pct: 40, color: "#7A1524" }, { pct: 35, color: "#2F8F83" }, { pct: 25, color: "#4A3550" }],
    agents: [{ i: "AV", c: "#2C4A6E" }, { i: "KS", c: "#7A1524" }],
  },
  {
    id: "c5", name: "The Valley", config: "Plots · 150–300 sq.yd",
    price: "₹45 L – ₹90 L", developer: "Valley Group", location: "Greater Noida West",
    status: "live", leadsTotal: 96, leadsToday: 5, trendUp: true, thumb: GRADIENTS.olive,
    distMethod: "Round-robin", segments: [{ pct: 34, color: "#7A1524" }, { pct: 33, color: "#2F8F83" }, { pct: 33, color: "#E0871E" }],
    agents: [{ i: "DC", c: "#4A3550" }, { i: "AK", c: "#E0871E" }, { i: "RS", c: "#2F8F83" }],
  },
  {
    id: "c6", name: "OMPEE Tower II", config: "2 & 3 BHK · 900–1500 sq.ft",
    price: "₹58 L – ₹1.05 Cr", developer: "Ompee Group", location: "Sector 1, Greater Noida",
    status: "paused", leadsTotal: 31, leadsToday: 0, trendUp: false, thumb: GRADIENTS.plum,
    distMethod: "Manual", segments: [{ pct: 60, color: "#7A1524" }, { pct: 40, color: "#8B6FA0" }],
    agents: [{ i: "RP", c: "#2F8F83" }],
  },
];

const KPIS = [
  { label: "Live Projects", value: "3", sub: "2 running · 1 paused", subTone: "text-emerald-600", icon: "Layers", rail: BRAND },
  { label: "Leads Today", value: "47", sub: "↑ 18% vs yesterday", subTone: "text-emerald-600", icon: "UserPlus", rail: "#E0871E" },
  { label: "Unassigned", value: "5", sub: "Needs distribution", subTone: "text-red-600", icon: "AlertCircle", rail: "#D8283B" },
  { label: "Avg Response", value: "4m 12s", sub: "Fastest this week", subTone: "text-emerald-600", icon: "Clock", rail: "#2F8F83" },
];

// --- small pieces ----------------------------------------------------
const Sparkline = ({ up }) => {
  const pts = up ? [16, 12, 18, 14, 22, 19, 26, 30] : [28, 24, 26, 20, 22, 17, 15, 12];
  const w = 74, h = 30, max = Math.max(...pts), min = Math.min(...pts), span = max - min || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - min) / span) * h}`).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline points={d} fill="none" stroke={up ? "#16A34A" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const KpiCard = ({ kpi }) => (
  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
    <span className="absolute bottom-0 left-0 top-0 w-1" style={{ background: kpi.rail }} />
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon name={kpi.icon} size={15} style={{ color: "#8A1B29" }} />
      {kpi.label}
    </div>
    <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{kpi.value}</div>
    <div className={`mt-1.5 text-xs font-medium ${kpi.subTone}`}>{kpi.sub}</div>
  </div>
);

const CampaignCard = ({ c }) => {
  const paused = c.status === "paused";
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* Thumbnail */}
      <div className="relative flex h-32 items-end p-3" style={{ backgroundImage: c.thumb }}>
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${paused ? "text-slate-500" : "text-emerald-600"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-slate-400" : "bg-emerald-500"}`} />
          {paused ? "Paused" : "Live"}
        </span>
        <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-[#6E1420]" title="Share">
          <Icon name="Share2" size={15} />
        </button>
        <span className="flex items-center gap-1 text-xs font-semibold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]">
          <Icon name="MapPin" size={13} />
          {c.location}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pt-4">
        <h3 className="text-[17px] font-bold tracking-tight text-foreground">{c.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{c.config}</p>
        <p className="mt-2 text-sm font-semibold text-[#6E1420]">
          {c.price}
          <span className="font-normal text-muted-foreground"> · {c.developer}</span>
        </p>

        {/* Lead stats + sparkline */}
        <div className="mt-3 flex items-end gap-6">
          <div>
            <div className="text-2xl font-bold leading-none text-foreground">{c.leadsTotal}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total leads</div>
          </div>
          <div>
            <div className="text-sm font-bold leading-none text-emerald-600">{c.leadsToday > 0 ? `+${c.leadsToday}` : "0"}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today</div>
          </div>
          <div className="ml-auto self-center"><Sparkline up={c.trendUp} /></div>
        </div>

        {/* Distribution */}
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Lead distribution · {c.distMethod}</span>
            <span>{c.agents.length} agent{c.agents.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-border">
            {c.segments.map((s, i) => (
              <span key={i} className="h-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="mt-3 flex items-center border-t border-border pt-3">
          {c.agents.map((a, i) => (
            <span key={i} className="-ml-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-card text-[10px] font-semibold text-white first:ml-0" style={{ background: a.c }}>
              {a.i}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2 border-t border-border p-3">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#6E1420] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#57101a]">
          <Icon name="ArrowUpRight" size={15} /> Open
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <Icon name="Link" size={15} /> Client page
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <Icon name="Download" size={15} /> Brochure
        </button>
      </div>
    </div>
  );
};

const Select = ({ label }) => (
  <button className="inline-flex h-11 items-center justify-between gap-8 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground hover:bg-muted">
    {label}
    <Icon name="ChevronDown" size={15} className="text-slate-400" />
  </button>
);

const ProjectPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState("cards");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? CAMPAIGNS.filter((c) => `${c.name} ${c.developer} ${c.location}`.toLowerCase().includes(q))
      : CAMPAIGNS;
  }, [search]);

  return (
    <>
      <Helmet>
        <title>Projects — Aajneeti Connect ltd</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={() => setIsSidebarOpen((o) => !o)} isSidebarOpen={isSidebarOpen} />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main className="lg:ml-64 pt-16">
          <div className="mx-auto max-w-[1220px] p-4 lg:p-6">
            {/* Header */}
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">My Campaigns</h1>
            <p className="mt-1.5 max-w-2xl text-muted-foreground">
              Every live project, the leads flowing in right now, and who on your team is working them — in one place.
            </p>

            {/* KPIs */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {KPIS.map((k) => <KpiCard key={k.label} kpi={k} />)}
            </div>

            {/* Toolbar */}
            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-slate-400 focus:border-[#6E1420]"
                />
              </div>
              <Select label="Assigned user" />
              <Select label="All status" />
              <div className="inline-flex shrink-0 rounded-xl border border-border bg-card p-0.5">
                {["cards", "table"].map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${view === v ? "bg-[#6E1420] text-white" : "text-muted-foreground hover:text-foreground"}`}>
                    {v}
                  </button>
                ))}
              </div>
              <button className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#D8283B] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#b71f2f]">
                <Icon name="Plus" size={16} /> New campaign
              </button>
            </div>

            {/* Cards / Table */}
            {view === "cards" ? (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((c) => <CampaignCard key={c.id} c={c} />)}
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">Project</th>
                      <th className="px-5 py-3">Developer</th>
                      <th className="px-5 py-3">Location</th>
                      <th className="px-5 py-3">Total leads</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3 font-semibold text-foreground">{c.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.developer}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.location}</td>
                        <td className="px-5 py-3 font-semibold text-foreground">{c.leadsTotal}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.status === "paused" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.status === "paused" ? "bg-slate-400" : "bg-emerald-500"}`} />
                            {c.status === "paused" ? "Paused" : "Live"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ProjectPage;
