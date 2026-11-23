import { useEffect } from "react";
import { useLocation, matchPath } from "react-router-dom";

/**
 * The browser tab title, set in ONE place for every route.
 *
 * WHY THIS EXISTS
 * ---------------
 * Titles used to be set per page with <Helmet>, and 9 of the 22 routes never
 * set one at all — activities, dashboard, settings, import, integrations,
 * profile, emails, sales-team and the 404. A page that sets no title does not
 * get a default one; it INHERITS whatever the last page set. So opening
 * Pipeline and then navigating to Activities left the tab reading
 * "Pipeline - Aajneeti Connect ltd" while showing the Activities page, and a
 * tab parked on Settings kept whichever title it happened to arrive with.
 *
 * Scattering one more <Helmet> into each of those 9 files would have fixed
 * today's symptom and left the trap armed: the next page anyone adds has the
 * same bug, silently, and nothing in the code says a title is required. A
 * route-keyed map cannot drift that way — a new route with no entry falls back
 * to the bare product name rather than impersonating the previous page.
 *
 * FORMAT: "Page · CRM". Page name first because Chrome truncates a narrow tab
 * to roughly 15 characters, and the part worth keeping is which page it is,
 * not which product. The separator is a middot rather than a hyphen so it
 * cannot be read as part of a page name.
 */
const SUFFIX = "CRM";

// Exact paths. Checked first and by lookup, so these never pay for pattern
// matching.
const TITLES = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/login": "Sign In",
  "/leads": "Leads",
  "/inactive-leads": "Inactive Leads",
  "/campaigns": "My Projects",
  "/project": "Projects",
  "/pipeline": "Pipeline",
  "/tasks": "Tasks",
  "/activities": "Activities",
  "/meeting": "Meetings",
  "/sitevisite": "Site Visits",
  "/call": "Training",
  "/reports": "Reports",
  "/team-performance": "Team Performance",
  "/sales-team": "Sales Team",
  "/emails": "Emails",
  "/import": "Import",
  "/integrations": "Integrations",
  "/settings": "Settings",
  "/profile": "Profile",
  "/help": "Help",
};

/**
 * Parameterised routes, tried in order when no exact path matched.
 *
 * Deliberately NOT showing the record's name — "Rajesh Kumar · CRM" would be
 * the obvious improvement and is the wrong call here: the title would have to
 * wait for a fetch, so the tab would read one thing and then change under the
 * user, and on a shared or screenshotted screen it would put a customer's name
 * into the window chrome, where the rest of this CRM takes care not to.
 */
const PATTERNS = [
  ["/leads/:leadId", "Lead"],
  ["/tasks/:taskId", "Task"],
  ["/help/:categoryId/:articleId", "Help"],
  ["/help/:categoryId", "Help"],
];

export const titleForPath = (pathname) => {
  const exact = TITLES[pathname];
  if (exact) return `${exact} · ${SUFFIX}`;

  for (const [pattern, label] of PATTERNS) {
    if (matchPath(pattern, pathname)) return `${label} · ${SUFFIX}`;
  }

  // Any unmatched path is the 404 screen. Named plainly rather than left to
  // inherit, because "Pipeline" on a page that says "This page doesn't exist"
  // is exactly the confusion this component was written to remove.
  return `Page not found · ${SUFFIX}`;
};

/**
 * Opt-in override for a page whose title depends on what it loaded — Help,
 * where the article's own name is more use than a flat "Help".
 *
 * Safe in a way the old per-page <Helmet> was not, because it is an OVERRIDE
 * on top of a default that always exists: forgetting to call it gives the
 * route's mapped title, never the previous page's. Pass a falsy value and the
 * mapped title stands, which is what a page should do while its data is still
 * loading rather than flashing a placeholder into the tab.
 *
 * Effects run in tree order and DocumentTitle is mounted above the routes, so
 * its effect has already run by the time this one does — the override lands
 * last and wins.
 */
export const useDocumentTitle = (title) => {
  useEffect(() => {
    if (title) document.title = `${title} · ${SUFFIX}`;
  }, [title]);
};

/**
 * Renders nothing. Mounted once inside the router, next to ScrollToTop, which
 * it mirrors — both are navigation side effects that belong to the app rather
 * than to any one page.
 */
const DocumentTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname]);

  return null;
};

export default DocumentTitle;
