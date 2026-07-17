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
