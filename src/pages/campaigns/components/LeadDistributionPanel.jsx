import React, { useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import {
  buildMembers,
  planSplit,
  serializeConfiguration,
} from "../utils/distribution";

/**
 * Who on this campaign receives leads, and how many each.
 *
 * Lives in the campaign drawer because that is where the data lives — the
 * fields it edits (collaboratorsIds, configuration, enableConfiguration) all
 * belong to the campaign record. A copy of this in Settings would mean two
 * screens writing the same three fields, which is how they end up disagreeing.
 *
 * SAVES PER ACTION, ONE FIELD AT A TIME. Toggling someone off sends only
 * `collaboratorsIds`; changing a number sends only `configuration`. EspoCRM
 * treats PUT as a partial update, so the rest of the campaign is untouched and
 * there is no Save button to forget.
 *
 * A paused member keeps their `configuration` line even though they are out of
 * `collaboratorsIds`. The backend ignores an orphan line — they are not a
 * collaborator, so they receive nothing — but their number is still there when
 * they come back, instead of silently resetting to the default.
 */

const COLORS = [
  "#2563EB", "#C2410C", "#0D9488", "#7C3AED",
  "#BE185D", "#0369A1", "#B45309", "#4338CA",
];

const colorFor = (id = "") => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
};

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";

const ModeCard = ({ active, title, body, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex-1 rounded-xl border p-4 text-left transition-all ${
      active
        ? "border-[#AC2334] bg-[#AC2334]/[0.04] shadow-sm"
        : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
    }`}
  >
    <span className="flex items-center gap-2">
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
          active ? "border-[#AC2334]" : "border-muted-foreground/40"
        }`}
      >
        {active && <span className="h-2 w-2 rounded-full bg-[#AC2334]" />}
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </span>
    <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
      {body}
    </span>
  </button>
);

const LeadDistributionPanel = ({ deal, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  // Planning input only — never persisted. It answers "if N leads arrive
  // today, who gets them", which is a question about the future, not a
  // property of the campaign.
  const [expected, setExpected] = useState(10);

  // Local mirror so a toggle feels instant; the PUT follows behind it.
  const [local, setLocal] = useState(() => ({
    collaboratorsIds: Array.isArray(deal?.collaboratorsIds) ? deal.collaboratorsIds : [],
    configuration: deal?.configuration || "",
    enableConfiguration: !!deal?.enableConfiguration,
  }));

  const members = useMemo(
    () =>
      buildMembers({
        collaboratorsIds: local.collaboratorsIds,
        collaboratorsNames: deal?.collaboratorsNames,
        configuration: local.configuration,
      }),
    [local.collaboratorsIds, local.configuration, deal?.collaboratorsNames],
  );

  const equalMode = !local.enableConfiguration;
  const split = useMemo(
    () => planSplit(members, expected, equalMode),
    [members, expected, equalMode],
  );

  const paused = members.filter((m) => m.paused);
  const activeCount = members.length - paused.length;

  const save = async (patch) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    if (!deal?.id || typeof onUpdate !== "function") return;
    try {
      setSaving(true);
      await onUpdate(deal.id, patch);
    } finally {
      setSaving(false);
    }
  };

  const setMode = (custom) => save({ enableConfiguration: custom });

  const togglePaused = (member) => {
    const ids = local.collaboratorsIds;
    const next = member.paused
      ? [...ids, member.id]
      : ids.filter((id) => id !== member.id);

    // Pausing writes BOTH fields: the id leaves collaborators (so they stop
    // receiving) while their configuration line is written back (so their
    // number survives). Resuming only needs the id restored.
    if (member.paused) {
      save({ collaboratorsIds: next });
      return;
    }

    const rows = members.map((m) => ({
      id: m.id,
      name: m.name,
      count: m.count ?? 1,
    }));
    save({
      collaboratorsIds: next,
      configuration: serializeConfiguration(rows),
    });
  };

  const removeMember = (member) => {
    const rows = members
      .filter((m) => m.id !== member.id)
      .map((m) => ({ id: m.id, name: m.name, count: m.count ?? 1 }));
    save({
      collaboratorsIds: local.collaboratorsIds.filter((id) => id !== member.id),
      configuration: serializeConfiguration(rows),
    });
  };

  const setCount = (member, raw) => {
    const trimmed = String(raw).trim();
    // Blank means Auto — they share whatever the fixed numbers leave behind.
    // Dropping their row entirely is how "Auto" is expressed, since the stored
    // format has no way to say "no fixed number".
    const rows = members
      .map((m) => {
        if (m.id !== member.id) return { id: m.id, name: m.name, count: m.count ?? 1 };
        if (!trimmed) return null;
        const n = parseInt(trimmed, 10);
        if (!Number.isFinite(n) || n < 1) return null;
        return { id: m.id, name: m.name, count: n };
      })
      .filter(Boolean);
    save({ configuration: serializeConfiguration(rows) });
  };

  const nextUp = split.find((m) => m.share > 0);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ mode */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground">
          How should leads be shared?
        </h3>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <ModeCard
            active={equalMode}
            title="Equal (Round robin)"
            body="Leads go one by one to each active member in turn. Everyone gets the same number."
            onClick={() => setMode(false)}
          />
          <ModeCard
            active={!equalMode}
            title="Custom numbers"
            body="Fix how many leads a day someone gets. Everyone else shares the rest equally."
            onClick={() => setMode(true)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span className="text-sm font-medium text-foreground">
            Expected leads per day
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpected((n) => Math.max(0, n - 1))}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              aria-label="Fewer leads"
            >
              <Icon name="Minus" size={14} />
            </button>
            <input
              value={expected}
              onChange={(e) =>
                setExpected(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              inputMode="numeric"
              className="h-8 w-16 rounded-lg border border-border bg-background text-center text-sm font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setExpected((n) => n + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              aria-label="More leads"
            >
              <Icon name="Plus" size={14} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Used to plan the split. Not saved — if more leads come in, they keep
            rotating.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ members */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">
            Team ({members.length})
          </h3>
          {saving && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {equalMode
            ? "Everyone active shares the day equally. Switch to Custom numbers to fix someone's share."
            : "Type a number to fix someone's leads per day. Leave it blank for Auto: they share whatever is left, equally."}
        </p>

        {members.length === 0 ? (
          <p className="mt-4 text-sm italic text-muted-foreground">
            No collaborators on this campaign yet. Add them under Teams /
            Collaborators.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {members.map((m) => (
              <div
                key={m.id}
                className={`flex flex-wrap items-center gap-3 py-3 ${
                  m.paused ? "opacity-60" : ""
                }`}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: colorFor(m.id) }}
                >
                  {initials(m.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {m.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.paused
                      ? "Paused — not receiving leads"
                      : m.count != null
                        ? `${m.count} a day`
                        : "Auto"}
                  </p>
                </div>

                <input
                  defaultValue={m.count ?? ""}
                  onBlur={(e) => setCount(m, e.target.value)}
                  placeholder="Auto"
                  inputMode="numeric"
                  disabled={equalMode || m.paused}
                  title={
                    equalMode
                      ? "Switch to Custom numbers to set a fixed share"
                      : "Leads per day. Blank = Auto"
                  }
                  className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => togglePaused(m)}
                  role="switch"
                  aria-checked={m.paused}
                  title={
                    m.paused
                      ? "Resume — start sending leads again"
                      : "Pause — stop sending leads while they are away"
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    m.paused ? "bg-[#C2410C]" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      m.paused ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => removeMember(m)}
                  title="Remove from this campaign"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ plan */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground">
          Today&apos;s split
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Based on {expected} lead{expected === 1 ? "" : "s"} today. A plan, not
          a record — the CRM does not store who received what on a given day.
        </p>

        {split.some((m) => m.share > 0) ? (
          <>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
              {split
                .filter((m) => m.share > 0)
                .map((m) => (
                  <span
                    key={m.id}
                    style={{
                      width: `${(m.share / expected) * 100}%`,
                      background: colorFor(m.id),
                    }}
                    title={`${m.name}: ${m.share}`}
                  />
                ))}
            </div>

            <div className="mt-4 space-y-2">
              {split.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colorFor(m.id) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {m.name}{" "}
                    <span className="text-muted-foreground">
                      {m.auto ? "auto" : "fixed"}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {m.share}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm italic text-muted-foreground">
            Nobody is set to receive leads on this campaign.
          </p>
        )}

        {paused.length > 0 && (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Paused: {paused.map((m) => m.name).join(", ")}.
            </span>{" "}
            Their share goes to the rest of the team.
          </p>
        )}

        {nextUp && activeCount > 0 && (
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: colorFor(nextUp.id) }}
            >
              {initials(nextUp.name)}
            </span>
            <span className="text-sm text-muted-foreground">
              Next lead goes to{" "}
              <span className="font-semibold text-foreground">
                {nextUp.name}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDistributionPanel;
