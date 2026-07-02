import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import Icon from "../../components/AppIcon";
import { useSiteVisits } from "hooks/useSiteVisits";
import { updateSiteVisit } from "services/sitevisite.service";
import DateTimePicker from "./components/DateTimePicker";

/* ------------------------------------------------------------------ *
 * Site Visits — fully backend-driven. A single fetch of every
 * site-visit lead (status IN Site Visit Scheduled / Site Visit Done)
 * feeds the hero metrics, the tab counts, and the table, so all
 * sections stay consistent.
 *
 * Status mapping (backend has only two site-visit statuses):
 *   "Site Visit Scheduled" → Scheduled  (needs confirming)
 *   "Site Visit Done"      → Visited    (outcome)
 * Confirmed / Rescheduled / No-show have no backend field yet.
 * ------------------------------------------------------------------ */

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Deterministic avatar palette; picked by a hash of the rep name.
const AVATAR_COLORS = [
  "bg-[#AC2334]", "bg-violet-600", "bg-blue-600", "bg-teal-600",
  "bg-amber-600", "bg-rose-600", "bg-indigo-600", "bg-emerald-600",
];

// EspoCRM datetimes arrive as "YYYY-MM-DD HH:mm:ss" (UTC, space-separated).
const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(String(s).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
};
const fmtDate = (d) => (d ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()}` : "—");
const fmtTime = (d) =>
  d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const initialsFrom = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const avatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};

const mapStatus = (raw) =>
  raw === "Site Visit Done" ? "Visited" : "Scheduled";

const isOutcome = (s) => s === "Visited" || s === "No-show";

// The current weekend (Sat + Sun) relative to `now`.
const getWeekend = (now) => {
  const day = now.getDay();
  const sat = new Date(now);
  sat.setDate(now.getDate() + (day === 0 ? -1 : 6 - day));
  sat.setHours(0, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { sat, sun };
};
const sameDay = (a, b) =>
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const STATUS_STYLES = {
  Rescheduled: { dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700" },
  Scheduled: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700" },
  Confirmed: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  Visited: { pill: "bg-emerald-600 text-white", icon: "Check" },
  "No-show": { pill: "bg-red-50 text-red-600", icon: "X" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || {};
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.pill}`}>
      {s.icon ? (
        <Icon name={s.icon} size={12} strokeWidth={3} />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      )}
      {status}
    </span>
  );
};

const IconAction = ({ name, label, href }) => {
  const cls =
    "grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={cls}>
      <Icon name={name} size={15} />
    </a>
  ) : (
    <button type="button" aria-label={label} className={cls}>
      <Icon name={name} size={15} />
    </button>
  );
};

const RowActions = ({ visit, onMarkVisited, onReschedule, saving }) => {
  const tel = visit.phone ? `tel:${visit.phone.replace(/\s/g, "")}` : undefined;
  const waNum = visit.whatsapp?.replace(/\D/g, "");
  const wa = waNum ? `https://wa.me/${waNum}` : undefined;

  if (visit.status === "Visited") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
        <Icon name="ArrowRight" size={14} />
        Site visit done
      </span>
    );
  }

  // Scheduled → reschedule (change the visit date) or mark the visit done.
  return (
    <div className="flex items-center justify-end gap-2">
      <IconAction name="Phone" label="Call" href={tel} />
      <IconAction name="MessageCircle" label="WhatsApp" href={wa} />
      <button
        onClick={() => onReschedule(visit)}
        disabled={saving}
        className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        Reschedule
      </button>
      <button
        onClick={() => onMarkVisited(visit)}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        <Icon name="Check" size={14} strokeWidth={3} />
        Mark visited
      </button>
    </div>
  );
};

const ProgressRing = ({ done, total, size = 64, stroke = 6 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#4ade80"
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">
        {done}/{total}
      </div>
    </div>
  );
};

const DayCard = ({ day, count, confirmed }) => (
  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{day}</p>
    <p className="text-2xl font-bold leading-tight">{count}</p>
    <p className="text-[11px] text-white/60">{confirmed} confirmed</p>
  </div>
);

const SiteVisitePage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [repFilter, setRepFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [savingId, setSavingId] = useState(null);
  // Date-time picker: { open, visit } — visit is null when scheduling a new one.
  const [picker, setPicker] = useState({ open: false, visit: null });
  const queryClient = useQueryClient();

  // Single source of truth: every site-visit lead (service scopes the query
  // to the site-visit statuses). High page size so metrics are accurate.
  const { data, isLoading } = useSiteVisits({ limit: 200, page: 1, filters: {} });

  const visits = useMemo(
    () =>
      (data?.list || []).map((lead) => {
        const d = parseDate(lead.cSiteVisitAt || lead.cNextContactAt);
        return {
          id: lead.id,
          lead: lead.name || "Unnamed lead",
          project: lead.cProject || lead.cProjectName || "—",
          config: lead.cProjectType || "",
          phone: lead.phoneNumber || "",
          whatsapp: lead.cWhatsapp || lead.phoneNumber || "",
          rep: lead.assignedUserName || "Unassigned",
          initials: initialsFrom(lead.assignedUserName),
          visitDate: d,
          status: mapStatus(lead.status),
        };
      }),
    [data],
  );

  const now = useMemo(() => new Date(), []);
  const weekend = useMemo(() => getWeekend(now), [now]);
  const isThisWeekend = (v) =>
    v.visitDate && (sameDay(v.visitDate, weekend.sat) || sameDay(v.visitDate, weekend.sun));

  const inTab = (v, tab) => {
    if (tab === "needs") return v.status === "Scheduled";
    if (tab === "weekend") return isThisWeekend(v);
    if (tab === "outcomes") return isOutcome(v.status);
    return true;
  };

  const counts = useMemo(
    () => ({
      all: visits.length,
      needs: visits.filter((v) => v.status === "Scheduled").length,
      weekend: visits.filter(isThisWeekend).length,
      outcomes: visits.filter((v) => isOutcome(v.status)).length,
    }),
    [visits], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const TABS = [
    { key: "all", label: "All visits", count: counts.all },
    { key: "needs", label: "Needs confirming", count: counts.needs },
    { key: "weekend", label: "This weekend", count: counts.weekend },
    { key: "outcomes", label: "Outcomes", count: counts.outcomes },
  ];

  // Rep list for the filter dropdown, from real data.
  const reps = useMemo(
    () => [...new Set(visits.map((v) => v.rep))].sort(),
    [visits],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits
      .filter((v) => inTab(v, activeTab))
      .filter((v) => (repFilter ? v.rep === repFilter : true))
      .filter((v) => (statusFilter ? v.status === statusFilter : true))
      .filter((v) =>
        q ? [v.lead, v.project, v.phone].join(" ").toLowerCase().includes(q) : true,
      )
      .sort((a, b) => {
        const ao = isOutcome(a.status), bo = isOutcome(b.status);
        if (ao !== bo) return ao ? 1 : -1; // outcomes last
        return (a.visitDate?.getTime() || 0) - (b.visitDate?.getTime() || 0);
      });
  }, [visits, activeTab, repFilter, statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Weekend hero metrics — all derived from real data.
  const weekendVisits = useMemo(() => visits.filter(isThisWeekend), [visits]); // eslint-disable-line react-hooks/exhaustive-deps
  const satVisits = weekendVisits.filter((v) => sameDay(v.visitDate, weekend.sat));
  const sunVisits = weekendVisits.filter((v) => sameDay(v.visitDate, weekend.sun));
  const doneOf = (list) => list.filter((v) => v.status === "Visited").length;
  const weekendDone = doneOf(weekendVisits);
  const weekendPending = weekendVisits.length - weekendDone;
  const weekendLabel = `${weekend.sat.getDate()}–${weekend.sun.getDate()} ${MONTHS[weekend.sun.getMonth()]}`;
  // Always-visible status pill, worded for the actual day of week.
  const dayBadge = (() => {
    const day = now.getDay();
    if (day === 5) return "It's Friday — confirmation day";
    if (day === 6) return "It's Saturday — visit day";
    if (day === 0) return "It's Sunday — visit day";
    const toFri = (5 - day + 7) % 7;
    return `${toFri} day${toFri > 1 ? "s" : ""} to confirmation day`;
  })();

  const handleMarkVisited = async (visit) => {
    try {
      setSavingId(visit.id);
      await updateSiteVisit(visit.id, { status: "Site Visit Done" });
      queryClient.invalidateQueries({ queryKey: ["site-visits"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["leads"], exact: false });
      toast.success("Marked as visited");
    } catch (err) {
      console.error(err);
      toast.error("Could not update the visit");
    } finally {
      setSavingId(null);
    }
  };

  // Open the designed date-time picker — for an existing visit (reschedule)
  // or a brand-new one (top "Schedule visit" button).
  const openReschedule = (visit) => setPicker({ open: true, visit });
  const openSchedule = () => setPicker({ open: true, visit: null });
  const closePicker = () => setPicker({ open: false, visit: null });

  // Format a Date to EspoCRM's "YYYY-MM-DD HH:mm:00" shape.
  const toBackendDate = (d) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
  };

  const doReschedule = async (visit, date) => {
    try {
      setSavingId(visit.id);
      await updateSiteVisit(visit.id, { cSiteVisitAt: toBackendDate(date) });
      queryClient.invalidateQueries({ queryKey: ["site-visits"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["leads"], exact: false });
      toast.success("Visit rescheduled");
    } catch (err) {
      console.error(err);
      toast.error("Could not reschedule the visit");
    } finally {
      setSavingId(null);
    }
  };

  const handlePickerApply = (date) => {
    const { visit } = picker;
    closePicker();
    if (visit) {
      doReschedule(visit, date);
    } else {
      // No create flow yet — a new visit needs a lead to attach to.
      toast("Scheduling a new visit is linked to a lead — coming soon", {
        icon: "📅",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Site Visits - CRM</title>
        <meta name="description" content="Confirm scheduled site visits and track which leads actually show up." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={() => setIsSidebarOpen((o) => !o)} isSidebarOpen={isSidebarOpen} />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main className="lg:ml-64 pt-16">
          <div className="p-4 lg:p-6">
            {/* Page header */}
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Site Visits</h1>
                <p className="mt-1 text-muted-foreground">
                  Confirm scheduled visits and track who actually shows up.
                </p>
              </div>
              <button
                onClick={openSchedule}
                className="inline-flex items-center gap-2 self-start rounded-lg bg-[#AC2334] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#961e2d]"
              >
                <Icon name="Plus" size={16} />
                Schedule visit
              </button>
            </div>

            {/* Weekend confirmation hero */}
            <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#7a1420] via-[#5a0f18] to-[#360a10] p-6 text-white shadow-lg">
              {/* Subtle graph-paper grid pattern (inline style so the nested
                  commas in the gradients compile reliably) */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "34px 34px",
                }}
              />

              <div className="relative mb-5 flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/70">
                  This weekend · {weekendLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  {dayBadge}
                </span>
              </div>

              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <DayCard day="Sat" count={satVisits.length} confirmed={doneOf(satVisits)} />
                  <DayCard day="Sun" count={sunVisits.length} confirmed={doneOf(sunVisits)} />
                  <div className="flex items-center gap-3 pl-2">
                    <ProgressRing done={weekendDone} total={weekendVisits.length} />
                    <div>
                      <p className="font-semibold">Weekend confirmations</p>
                      <p className="text-sm text-white/60">
                        {weekendDone} of {weekendVisits.length} visits locked in
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="AlertTriangle" size={18} className="text-amber-300" />
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-amber-400/90 px-1.5 text-xs font-bold text-[#5a0f18]">
                      {weekendPending}
                    </span>
                    <span className="text-white/85">still need confirming</span>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#7a1420] transition-colors hover:bg-white/90">
                    <Icon name="Phone" size={15} />
                    Start Friday calls
                  </button>
                </div>
              </div>
            </div>

            {/* Card: tabs + filters + table */}
            <div className="rounded-2xl border border-border bg-card">
              {/* Tabs */}
              <div className="flex flex-wrap gap-6 border-b border-border px-5">
                {TABS.map((t) => {
                  const active = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`relative -mb-px flex items-center gap-2 py-4 text-sm font-medium transition-colors ${
                        active ? "text-[#AC2334]" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {t.label}
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                        active ? "bg-[#AC2334]/10 text-[#AC2334]" : "bg-slate-100 text-slate-500"
                      }`}>
                        {t.count}
                      </span>
                      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#AC2334]" />}
                    </button>
                  );
                })}
              </div>

              {/* Filter row */}
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by lead, project or phone..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#AC2334] focus:ring-2 focus:ring-[#AC2334]/10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#AC2334]"
                >
                  <option value="">All statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Visited">Visited</option>
                </select>
                <select
                  value={repFilter}
                  onChange={(e) => setRepFilter(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#AC2334]"
                >
                  <option value="">All reps</option>
                  {reps.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-y border-border text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Lead</th>
                      <th className="px-5 py-3">Assigned Rep</th>
                      <th className="px-5 py-3">Visit</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                          Loading site visits…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                          No site visits match this view.
                        </td>
                      </tr>
                    ) : (
                      rows.map((v) => (
                        <tr key={v.id} className="border-b border-border/70 last:border-0 hover:bg-slate-50/60">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{v.lead}</span>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {v.project}{v.config ? ` · ${v.config}` : ""}
                            </p>
                            {v.phone && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                <Icon name="Phone" size={11} />
                                {v.phone}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white ${avatarColor(v.rep)}`}>
                                {v.initials}
                              </span>
                              <span className="text-sm font-medium text-slate-700">{v.rep}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {fmtDate(v.visitDate)}
                            </p>
                            {v.visitDate && (
                              <p className="mt-0.5 text-sm text-slate-700">{fmtTime(v.visitDate)}</p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={v.status} />
                          </td>

                          <td className="px-5 py-4">
                            <RowActions
                              visit={v}
                              onMarkVisited={handleMarkVisited}
                              onReschedule={openReschedule}
                              saving={savingId === v.id}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {picker.open && (
          <DateTimePicker
            value={picker.visit?.visitDate || null}
            title={picker.visit ? "Reschedule site visit" : "Schedule site visit"}
            onApply={handlePickerApply}
            onClose={closePicker}
          />
        )}
      </div>
    </>
  );
};

export default SiteVisitePage;
