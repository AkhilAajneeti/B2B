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
 * EVERY CHANGE IS A DRAFT UNTIL SAVE. Toggling someone off, retyping a count
 * and switching mode all edit local state only; one PUT goes out when Save is
 * pressed, carrying just the three distribution fields.
 *
 * Batched rather than saved per action on purpose: setting up a campaign means
 * several changes in a row, and firing a request per keystroke-equivalent both
 * hammers the gateway and leaves the campaign in half-applied states if one
 * call fails. One save is also one thing to undo — Discard puts everything
 * back to what the server holds.
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

/** Section heading with a tinted icon tile, matching the drawer's other cards. */
const SectionTitle = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-wrap items-start gap-3">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#AC2334]/10 text-[#AC2334]">
      <Icon name={icon} size={17} />
    </span>
    <div className="min-w-0 flex-1">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && (
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </div>
);

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

const LeadDistributionPanel = ({ deal, onUpdate, users = [] }) => {
  const [adding, setAdding] = useState(false);
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

  // Draft edit. Nothing leaves the browser until Save.
  const save = (patch) => setLocal((prev) => ({ ...prev, ...patch }));

  // What the server currently holds, for the dirty check and for Discard.
  const serverState = useMemo(
    () => ({
      collaboratorsIds: Array.isArray(deal?.collaboratorsIds)
        ? deal.collaboratorsIds
        : [],
      configuration: deal?.configuration || "",
      enableConfiguration: !!deal?.enableConfiguration,
    }),
    [deal?.collaboratorsIds, deal?.configuration, deal?.enableConfiguration],
  );

  const dirty =
    local.enableConfiguration !== serverState.enableConfiguration ||
    local.configuration !== serverState.configuration ||
    local.collaboratorsIds.join("|") !== serverState.collaboratorsIds.join("|");

  const handleSave = async () => {
    if (!dirty || !deal?.id || typeof onUpdate !== "function") return;
    try {
      setSaving(true);
      // Only the three distribution fields. EspoCRM treats PUT as a partial
      // update, so nothing else on the campaign is touched.
      await onUpdate(deal.id, {
        collaboratorsIds: local.collaboratorsIds,
        configuration: local.configuration,
        enableConfiguration: local.enableConfiguration,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setLocal(serverState);

  // Anyone active in the CRM who is not already on this campaign — the same
  // pool the Teams tab's collaborator picker draws from.
  const addable = useMemo(() => {
    const known = new Set(members.map((m) => m.id));
    return (users || [])
      .filter((u) => u?.id && !known.has(u.id) && u?.isActive !== false)
      .sort((a, b) =>
        (a.name || a.userName || "").localeCompare(b.name || b.userName || ""),
      );
  }, [users, members]);

  /**
   * Add someone to the campaign.
   *
   * Exactly the existing operation: their id goes into collaboratorsIds. A
   * configuration row is written alongside it so a later switch to Custom
   * numbers has something to edit — the drawer's own picker does the same, via
   * the effect that keeps configurationItems in step with collaborators.
   */
  const addMember = (user) => {
    const name = user.name || user.userName || user.id;
    const rows = [
      ...members.map((m) => ({ id: m.id, name: m.name, count: m.count ?? 1 })),
      { id: user.id, name, count: 1 },
    ];
    save({
      collaboratorsIds: [...local.collaboratorsIds, user.id],
      configuration: serializeConfiguration(rows),
    });
    setAdding(false);
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
    <div className="space-y-6 pb-20">
      {/* ------------------------------------------------ mode */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionTitle
          icon="Share2"
          title="How should leads be shared?"
          subtitle="Choose a distribution method to decide how leads are assigned to team members."
        />

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
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Icon name="BarChart3" size={16} />
          </span>
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
        <SectionTitle
          icon="Users"
          title={`Team (${members.length})`}
          subtitle={
            equalMode
              ? "Everyone active shares the day equally. Switch to Custom numbers to fix someone's share."
              : "Type a number to fix someone's leads per day. Leave it blank for Auto: they share whatever is left, equally."
          }
          action={
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#AC2334] px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Icon name="Plus" size={15} />
              Add Member
            </button>
          }
        />

        {/* Adding someone here is the SAME operation as the collaborator
            picker on the Teams tab — their id goes into collaboratorsIds.
            Only the UI is new; nothing about how membership works changed. */}
        {adding && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
            {addable.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Everyone available is already on this campaign.
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Add to this project
                </p>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {addable.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addMember(u)}
                      // A clear hover surface: these rows sit on a tinted
                      // panel, so hovering to white alone was almost
                      // indistinguishable from not hovering, and you could not
                      // tell which name you were about to add.
                      className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-sm text-foreground transition-colors hover:border-[#AC2334]/25 hover:bg-[#AC2334]/[0.07] hover:text-[#AC2334]"
                    >
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: colorFor(u.id) }}
                      >
                        {initials(u.name || u.userName || "")}
                      </span>
                      <span className="truncate">{u.name || u.userName}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Column headings. Without them the number box and the toggle are two
            unlabelled controls — a reader cannot tell what either one does, or
            that the greyed box is greyed because Round robin is on. */}
        {members.length > 0 && (
          <div className="mt-4 flex items-center gap-3 border-b border-border pb-2">
            <span className="w-9 shrink-0" />
            <span className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Member
            </span>
            <span className="w-20 shrink-0 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Leads/day
            </span>
            <span className="w-[104px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <span className="w-9 shrink-0" />
          </div>
        )}

        {members.length === 0 ? (
          <p className="mt-4 text-sm italic text-muted-foreground">
            No collaborators on this project yet. Add them under Teams /
            Collaborators.
          </p>
        ) : (
          <div className="divide-y divide-border">
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
                  className="h-9 w-20 shrink-0 rounded-lg border border-border bg-background px-2 text-center text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
                />

                {/* Toggle plus the word for its state. The switch alone was
                    almost invisible when off — a pale ring with no label — so
                    nobody could tell it was a control, let alone which way it
                    was set. */}
                <span className="flex w-[104px] shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePaused(m)}
                    role="switch"
                    aria-checked={m.paused}
                    aria-label={`${m.paused ? "Resume" : "Pause"} ${m.name}`}
                    title={
                      m.paused
                        ? "Resume — start sending leads again"
                        : "Pause — stop sending leads while they are away"
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      m.paused
                        ? "border-[#C2410C] bg-[#C2410C]"
                        : "border-emerald-600 bg-emerald-500"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                        m.paused ? "translate-x-[22px]" : "translate-x-[2px]"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-semibold ${
                      m.paused ? "text-[#C2410C]" : "text-emerald-700"
                    }`}
                  >
                    {m.paused ? "Paused" : "Active"}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => removeMember(m)}
                  title="Remove from this project"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ save bar
          Sticky, and only present while there is something to save. A bar that
          is always there gets ignored; one that appears the moment you change
          something is the reminder that the change has not landed yet. */}
      {dirty && (
        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-[#AC2334]/30 bg-[#AC2334]/[0.04] px-4 py-3 backdrop-blur">
          <Icon name="AlertCircle" size={16} className="shrink-0 text-[#AC2334]" />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            You have unsaved distribution changes.
          </p>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={saving}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#AC2334] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {/* ------------------------------------------------ plan */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionTitle
          icon="PieChart"
          title="Today's split"
          subtitle={`Based on ${expected} lead${expected === 1 ? "" : "s"} today. A plan, not a record — the CRM does not store who received what on a given day.`}
        />

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
            Nobody is set to receive leads on this project.
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
