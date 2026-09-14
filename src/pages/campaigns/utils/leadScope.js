/**
 * Lead ↔ campaign matching — the single source of truth.
 *
 * The linkage is inconsistent: some leads carry the clean label in
 * `cProjectNomen` (with a messy `cProject`), others have it in `cProject`
 * (with a null `cProjectNomen`). So we match EITHER — `cProjectNomen` equals OR
 * `cProject` contains the projectNomen. For a "Default" projectNomen (no real
 * per-campaign label) we scope by `cClientNomen` (client-level) instead.
 *
 * This lived inline in ProjectCard while the KPI row counted leads globally,
 * which is exactly how the two ended up disagreeing (cards showing 103 leads
 * under a "7743 Total Leads" KPI). Both now build their filters from here, so
 * the row and the cards can never drift apart again.
 */

/**
 * The ESPO condition that matches one campaign's leads.
 * Returns a single condition object (not an array) so it can be composed into
 * a larger `or` group across many campaigns.
 */
export const projectLeadCondition = (project = {}) => {
  const hasNomen = project.projectNomen && project.projectNomen !== "Default";

  if (hasNomen) {
    return {
      type: "or",
      value: [
        {
          type: "equals",
          attribute: "cProjectNomen",
          value: project.projectNomen,
        },
        {
          type: "contains",
          attribute: "cProject",
          value: project.projectNomen,
        },
      ],
    };
  }

  if (project.clientNomen) {
    return {
      type: "equals",
      attribute: "cClientNomen",
      value: project.clientNomen,
    };
  }

  return { type: "contains", attribute: "cProject", value: project.name };
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
 * The token `projectLeadCondition` matches leads on — mirrors its three
 * branches exactly. Returns null for the clientNomen branch, which scopes by
 * an exact `cClientNomen` equals and therefore has no `contains` arm to guard.
 */
export const projectMatchToken = (project = {}) => {
  if (project.projectNomen && project.projectNomen !== "Default") {
    return project.projectNomen;
  }
  if (project.clientNomen) return null;
  return project.name || null;
};

/**
 * Tokens belonging to OTHER projects that this project's `contains` arm would
 * sweep up.
 *
 * `projectLeadCondition` deliberately matches `cProject CONTAINS <token>` so it
 * still finds leads whose project text is messy. The cost is that a token which
 * is a substring of another project's token drags that project's leads in too —
 * pick "MigsunRohini" and every "MigsunRohiniCentral" lead appears with it.
 *
 * Rather than trade the messy-data tolerance away for an exact match (which
 * would silently hide leads), we keep `contains` and subtract the siblings: the
 * caller turns each token returned here into a `notContains` clause. The list
 * comes from the already-cached project list, so this costs no extra request.
 *
 * Matched by `includes`, not `startsWith` — "NewMigsunRohini" would be pulled
 * in by a contains on "MigsunRohini" just as surely as a suffixed name is.
 */
export const projectSiblingTokens = (project = {}, allProjects = []) => {
  const token = (projectMatchToken(project) || "").trim();
  if (!token) return [];

  const lower = token.toLowerCase();
  const seen = new Set();

  return (allProjects || [])
    .map((p) => (projectMatchToken(p) || "").trim())
    .filter((candidate) => {
      if (!candidate) return false;
      const key = candidate.toLowerCase();
      // The project's own token is what we're matching ON, not excluding.
      if (key === lower) return false;
      if (!key.includes(lower)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/**
 * Sibling tokens → whereGroup conditions. Top-level whereGroup entries are
 * ANDed, so these sit alongside the match condition and subtract from it.
 *
 * Each exclusion is OR'd with `isEmpty` so a lead that matched on a clean
 * `cProjectNomen` but carries no `cProject` text at all isn't dropped by a
 * NOT LIKE that never evaluates true for an empty column.
 *
 * Kept separate from `projectSiblingTokens` so callers can persist the plain
 * token strings in UI state and build the query shape only at request time.
 */
export const projectExclusionConditions = (tokens = []) =>
  (tokens || [])
    .filter(Boolean)
    .map((token) => ({
      type: "or",
      value: [
        { type: "isEmpty", attribute: "cProject" },
        { type: "notContains", attribute: "cProject", value: token },
      ],
    }));
