/**
 * Lead ↔ campaign matching — the single source of truth.
 *
 * There is NO project id on a lead. The linkage is text, and it is spread
 * inconsistently across `cProject`, `cProjectName` and `cProjectNomen` (the
 * leads table renders whichever is populated, which is why the column can look
 * right while a filter on one field finds nothing).
 *
 * A campaign is identified by the CLIENT + PROJECT PAIR, not by the project
 * name alone — two clients can run a campaign under the same project nomen,
 * because "Prestige" and "Godrej" are builder names rather than campaign
 * names. DealDrawer already treats the pair as the identity when it looks up a
 * lead's WhatsApp template; this file now matches it.
 *
 * This lived inline in ProjectCard while the KPI row counted leads globally,
 * which is exactly how the two ended up disagreeing (cards showing 103 leads
 * under a "7743 Total Leads" KPI). Both now build their filters from here, so
 * the row and the cards can never drift apart again — and both now agree with
 * the Leads page filter too, since all three go through
 * `projectExactLeadCondition` for the project half of the match.
 */

/**
 * The ESPO condition that matches one campaign's leads.
 * Returns a single condition object (not an array) so it can be composed into
 * a larger `or` group across many campaigns.
 */
export const projectLeadCondition = (project = {}) => {
  // THE PAIR IS THE IDENTITY — the same rule DealDrawer already uses to find a
  // lead's campaign for the WhatsApp template:
  //
  //     lead.cClientNomen  === project.clientNomen
  //     lead.cProjectNomen === project.projectNomen
  //
  // Two clients can run a campaign under the same project nomen. "Prestige",
  // "Godrej" and the like are builder names, not campaign names, so a
  // project-only match counts every client's Prestige leads into each one.
  //
  // The previous rule here was client-blind AND substring-based
  // (`cProject CONTAINS projectNomen`), so a brand-new "prestige" campaign
  // opened reading 84 leads: one real, the rest other clients' — and
  // `contains` also swept in PrestigeParkGrove, PrestigeCityHyderabad and
  // anything else carrying those letters.
  const client = (project.clientNomen || "").trim();
  const projectArm = projectExactLeadCondition(project);

  // Nothing identifying at all: match nothing rather than everything. An
  // impossible condition is deliberate — returning null here would read as
  // "no scope" to projectsLeadScope and count the whole company.
  if (!client && !projectArm) {
    return { type: "equals", attribute: "id", value: "__no_project_scope__" };
  }

  // A campaign with no client label can only be identified by its project.
  if (!client) return projectArm;

  const clientArm = {
    type: "equals",
    attribute: "cClientNomen",
    value: client,
  };

  // No usable project token (a "Default" nomen and no name) — the campaign is
  // client-level, which is what the old code did for this case too.
  if (!projectArm) return clientArm;

  return { type: "and", value: [clientArm, projectArm] };
};

/** whereGroup (array form) for a single campaign — what ProjectCard counts on. */
export const projectLeadFilter = (project = {}) => [
  projectLeadCondition(project),
];

/**
 * whereGroup that matches the leads of ANY campaign in `projects`.
 *
 * Uses one `or` group rather than summing per-campaign counts, so a lead that
 * matches two campaigns is counted once instead of twice.
 *
 * Returns `null` when there is nothing to scope by — callers treat that as
 * "no campaign scope" (count everything). Note the difference from an EMPTY
 * project list, which callers must handle as "match nothing": a filter that
 * matched zero campaigns should show 0 leads, not all of them.
 */
export const projectsLeadScope = (projects = []) => {
  const conditions = (projects || []).map(projectLeadCondition).filter(Boolean);
  if (conditions.length === 0) return null;
  if (conditions.length === 1) return [conditions[0]];
  return [{ type: "or", value: conditions }];
};

/**
 * The project half of the match for ONE project — exact, and deliberately
 * narrow.
 *
 * Used BOTH by the Leads page filter and (as of the client+project pair fix)
 * by `projectLeadCondition` above, so a campaign card, the KPI row and the
 * Leads filter all count the same leads. They previously did not: counting
 * used `contains` for tolerance, and tolerance is exactly wrong here —
 * `cProject CONTAINS "MigsunRohini"` also returns every "MigsunRohiniCentral"
 * lead, and a rep filtering to one project wants that one project.
 *
 * Two unknowns are covered by brute force instead of assumption:
 *   - WHICH TOKEN identifies the project on a lead — its short `projectNomen`
 *     ("MigsunRohini") or its full `name` ("ShubhamShakyaPropshopMigsunRohini").
 *   - WHICH FIELD holds it — leads spread the label across `cProject`,
 *     `cProjectName` and `cProjectNomen` inconsistently (the table renders
 *     whichever is populated, which is why the column can look right while a
 *     filter on one field finds nothing).
 * Every token × field pair is OR'd as an exact `equals`. Exact matching means
 * the extra arms cost recall nothing and can't reintroduce prefix bleed:
 * `equals "MigsunRohini"` never matches "MigsunRohiniCentral".
 *
 * `equals` is also the one operator this codebase already relies on everywhere
 * — an earlier attempt here used `notContains` / `isEmpty`, which Espo is only
 * ever asked for as date filters in this app, and the whole query failed.
 */
const PROJECT_LEAD_ATTRIBUTES = ["cProject", "cProjectName", "cProjectNomen"];

export const projectExactLeadCondition = (project = {}) => {
  const tokens = [];
  const seen = new Set();
  for (const raw of [project.projectNomen, project.name]) {
    const token = (raw || "").trim();
    if (!token || token === "Default") continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(token);
  }
  if (tokens.length === 0) return null;

  const value = tokens.flatMap((token) =>
    PROJECT_LEAD_ATTRIBUTES.map((attribute) => ({
      type: "equals",
      attribute,
      value: token,
    })),
  );

  // A single clause doesn't need the `or` wrapper around it.
  return value.length === 1 ? value[0] : { type: "or", value };
};
