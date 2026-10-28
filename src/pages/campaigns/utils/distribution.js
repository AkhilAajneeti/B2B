/**
 * Lead distribution — the one place that understands how a campaign's
 * per-collaborator lead counts are stored.
 *
 * THE MODEL, because it is not obvious from the field names:
 *
 *   collaboratorsIds   WHO receives leads. Being in this list is the entire
 *                      on/off switch — out of it means out of the rotation.
 *   configuration      HOW MANY each one gets, as a newline-separated string
 *                      of "id:name:count" rows.
 *   enableConfiguration
 *                      false -> Equal (round robin): the counts are ignored
 *                               and leads split evenly across collaborators.
 *                      true  -> Custom: the counts above are used.
 *
 * Switching to Equal therefore does NOT need every count rewritten to 1 — the
 * flag alone is enough, and leaving the numbers untouched means switching back
 * to Custom restores exactly what was there.
 *
 * Extracted from DealDrawer rather than copied: two implementations of a
 * hand-rolled string format drift, and the first symptom would be a campaign
 * silently losing someone's count.
 */

/**
 * "id:name:count" rows -> [{ id, name, count }].
 *
 * Names can contain a colon ("Dr: Foo"), so each row is split on its FIRST and
 * LAST colon only: id is the head, count the tail, name whatever is between.
 */
export const parseConfiguration = (raw) => {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const firstColon = line.indexOf(":");
      const lastColon = line.lastIndexOf(":");
      if (firstColon === -1 || lastColon === firstColon) return null;
      const id = line.slice(0, firstColon);
      const name = line.slice(firstColon + 1, lastColon);
      const count = parseInt(line.slice(lastColon + 1), 10);
      if (!id || !name || Number.isNaN(count)) return null;
      return { id, name, count };
    })
    .filter(Boolean);
};

/** [{ id, name, count }] -> "id:name:count" rows. */
export const serializeConfiguration = (items = []) =>
  items
    .filter((i) => i?.id && i?.name)
    .map((i) => `${i.id}:${i.name}:${i.count || 1}`)
    .join("\n") + (items.length ? "\n" : "");

/**
 * Every row a campaign knows about, each marked paused or active.
 *
 * A row whose id is NOT in collaboratorsIds is someone who has been paused:
 * their line is deliberately left in `configuration` so their number survives
 * the pause. Without that, pausing and resuming silently resets them to 1 and
 * nobody notices until their lead volume quietly drops.
 */
export const buildMembers = ({ collaboratorsIds = [], collaboratorsNames = {}, configuration = "" }) => {
  const ids = Array.isArray(collaboratorsIds) ? collaboratorsIds : [];
  const active = new Set(ids);
  const configured = parseConfiguration(configuration);
  const byId = new Map(configured.map((c) => [c.id, c]));

  // Active collaborators first, in the campaign's own order, then anyone
  // paused — so the people currently receiving leads are what you see first.
  const rows = ids.map((id) => ({
    id,
    name: byId.get(id)?.name || collaboratorsNames?.[id] || id,
    count: byId.get(id)?.count ?? null, // null = Auto (no fixed number)
    paused: false,
  }));

  configured.forEach((c) => {
    if (!active.has(c.id)) {
      rows.push({ id: c.id, name: c.name, count: c.count, paused: true });
    }
  });

  return rows;
};

/**
 * How today's leads would be split, given the fixed counts and a daily volume.
 *
 * A PLAN, not a record of what happened — the CRM stores no per-day assignment
 * history, so this answers "if N leads arrive, who gets them" and nothing more.
 *
 * Fixed numbers are honoured first; whatever is left is shared equally between
 * the Auto members. In Equal mode every active member is Auto by definition.
 */
export const planSplit = (members = [], expectedPerDay = 0, equalMode = false) => {
  const active = members.filter((m) => !m.paused);
  if (!active.length || expectedPerDay <= 0) {
    return active.map((m) => ({ ...m, share: 0 }));
  }

  if (equalMode) {
    const base = Math.floor(expectedPerDay / active.length);
    let spare = expectedPerDay - base * active.length;
    return active.map((m) => {
      const extra = spare > 0 ? 1 : 0;
      spare -= extra;
      return { ...m, share: base + extra, auto: true };
    });
  }

  const fixed = active.filter((m) => m.count != null);
  const auto = active.filter((m) => m.count == null);

  // Fixed allocations are capped at the day's volume, so a campaign whose
  // numbers add up to more than it receives does not report a split larger
  // than the leads that exist.
  let remaining = expectedPerDay;
  const fixedRows = fixed.map((m) => {
    const share = Math.max(0, Math.min(m.count, remaining));
    remaining -= share;
    return { ...m, share, auto: false };
  });

  const base = auto.length ? Math.floor(remaining / auto.length) : 0;
  let spare = auto.length ? remaining - base * auto.length : 0;
  const autoRows = auto.map((m) => {
    const extra = spare > 0 ? 1 : 0;
    spare -= extra;
    return { ...m, share: base + extra, auto: true };
  });

  // Back into the original order so the preview matches the list above it.
  const byId = new Map([...fixedRows, ...autoRows].map((m) => [m.id, m]));
  return active.map((m) => byId.get(m.id));
};
