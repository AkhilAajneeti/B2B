import React, { memo } from "react";
import Icon from "../../../components/AppIcon";

// The four "today" metrics are one sales funnel, in journey order:
//   Meetings → Visit Booked (scheduled) → Site Visits (done) → Purchased.
// Colour runs cool → warm → green so the eye reads progression toward a
// close (green = won). Each stage carries a two-stop "burst" gradient (a
// slight hue rotation) for the icon tile, plus a soft tinted background.
const STAGES = [
  { key: "meetings", label: "Meetings", icon: "Calendar", from: "#3B82F6", to: "#6366F1" },
  { key: "siteVisitsScheduled", label: "Visit Booked", icon: "CalendarCheck", from: "#06B6D4", to: "#0EA5E9" },
  { key: "visits", label: "Site Visits", icon: "MapPin", from: "#F59E0B", to: "#F97316" },
  { key: "purchased", label: "Purchased", icon: "BadgeCheck", from: "#10B981", to: "#059669" },
];

const hexToRgba = (hex = "#3B82F6", a = 1) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  // eslint-disable-next-line no-bitwise
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const ActivityFunnel = ({ values = {}, activeInsight, onSelect }) => (
  <section className="rounded-2xl border border-[rgba(20,20,30,0.08)] bg-card p-4 sm:p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_2px_8px_rgba(16,24,40,.05)]">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
        Today's Activity
      </h3>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
        Pipeline flow
      </span>
    </div>

    {/* flex-wrap → 2×2 on mobile (connectors hidden, so they don't count as
        grid cells); flex-nowrap single row on md+ with chevron connectors. */}
    <div className="flex flex-wrap items-stretch gap-3 md:flex-nowrap md:gap-0">
      {STAGES.map((stage, i) => {
        const value = values[stage.key] ?? 0;
        const active = Number(value) > 0;
        const selected = activeInsight === stage.key;
        const burst = `linear-gradient(135deg, ${stage.from}, ${stage.to})`;

        return (
          <React.Fragment key={stage.key}>
            <button
              type="button"
              onClick={() => onSelect(stage.key)}
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(stage.from, 0.1)}, ${hexToRgba(stage.to, 0.05)})`,
                "--stage-glow": hexToRgba(stage.from, 0.3),
                "--stage-ring": stage.from,
                ...(selected ? { boxShadow: `0 0 0 1.5px ${stage.from}` } : {}),
              }}
              className="group relative basis-[calc(50%-0.375rem)] overflow-hidden rounded-2xl border border-[rgba(20,20,30,0.06)] p-4 text-left transition-all duration-300 ease-premium hover:-translate-y-1 hover:shadow-[0_16px_36px_-14px_var(--stage-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--stage-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:basis-0 md:flex-1 md:mx-1.5 md:first:ml-0 md:last:mr-0"
            >
              {/* burst glow behind the icon, intensifies on hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
                style={{ background: `radial-gradient(circle, ${hexToRgba(stage.from, 0.35)}, transparent 70%)` }}
              />

              <div className="relative flex items-center justify-between gap-2">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-[0_4px_10px_-2px_var(--stage-glow)] transition-transform duration-300 ease-premium group-hover:scale-105 motion-reduce:transition-none"
                  style={{ backgroundImage: burst }}
                >
                  <Icon name={stage.icon} size={20} />
                </span>
                <span
                  className={`text-3xl font-bold leading-none tabular-nums tracking-tight ${
                    active ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {value}
                </span>
              </div>

              <p className="relative mt-3 truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground" title={stage.label}>
                {stage.label}
              </p>
            </button>

            {/* Connector — desktop only. `hidden` removes it from the mobile
                wrap so segments tile 2×2 cleanly. */}
            {i < STAGES.length - 1 && (
              <div className="hidden shrink-0 items-center justify-center self-center text-muted-foreground/30 md:flex" aria-hidden="true">
                <Icon name="ChevronRight" size={18} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  </section>
);

export default memo(ActivityFunnel);
