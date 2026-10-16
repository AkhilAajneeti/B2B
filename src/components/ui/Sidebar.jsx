import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../AppIcon";
import Button from "./Button";
import { getStoredUser, isSupAdmin, isMaskedUser } from "../../utils/permission";


// Per-item icon colour. Keyed by route so the navigationItems array stays
// about navigation and this stays about appearance.
//
// Hues are semantic where the item allows it — Inactive Leads is deliberately
// the only grey one, Site Visits green for "go", Campaigns amber for outbound
// — and otherwise spaced around the wheel so adjacent rows never share a tone.
//
// Full literal class strings, not composed ones: Tailwind's JIT scans source
// text, so `text-${hue}-500` would never be generated and the icon would ship
// unstyled.
const NAV_ICON_STYLES = {
  "/dashboard": {
    icon: "text-indigo-500",
    row: "hover:bg-indigo-50",
    tile: "group-hover:bg-indigo-100",
    bar: "bg-indigo-500",
  },
  "/leads": {
    icon: "text-rose-500",
    row: "hover:bg-rose-50",
    tile: "group-hover:bg-rose-100",
    bar: "bg-rose-500",
  },
  "/inactive-leads": {
    icon: "text-slate-400",
    row: "hover:bg-slate-100",
    tile: "group-hover:bg-slate-200",
    bar: "bg-slate-400",
  },
  "/campaigns": {
    icon: "text-amber-500",
    row: "hover:bg-amber-50",
    tile: "group-hover:bg-amber-100",
    bar: "bg-amber-500",
  },
  "/pipeline": {
    icon: "text-violet-500",
    row: "hover:bg-violet-50",
    tile: "group-hover:bg-violet-100",
    bar: "bg-violet-500",
  },
  "/sitevisite": {
    icon: "text-emerald-500",
    row: "hover:bg-emerald-50",
    tile: "group-hover:bg-emerald-100",
    bar: "bg-emerald-500",
  },
  "/tasks": {
    icon: "text-blue-500",
    row: "hover:bg-blue-50",
    tile: "group-hover:bg-blue-100",
    bar: "bg-blue-500",
  },
  "/activities": {
    icon: "text-fuchsia-500",
    row: "hover:bg-fuchsia-50",
    tile: "group-hover:bg-fuchsia-100",
    bar: "bg-fuchsia-500",
  },
  "/reports": {
    icon: "text-cyan-600",
    row: "hover:bg-cyan-50",
    tile: "group-hover:bg-cyan-100",
    bar: "bg-cyan-600",
  },
  "/import": {
    icon: "text-sky-500",
    row: "hover:bg-sky-50",
    tile: "group-hover:bg-sky-100",
    bar: "bg-sky-500",
  },
  "/settings": {
    icon: "text-zinc-500",
    row: "hover:bg-zinc-100",
    tile: "group-hover:bg-zinc-200",
    bar: "bg-zinc-500",
  },
  "/help": {
    icon: "text-teal-500",
    row: "hover:bg-teal-50",
    tile: "group-hover:bg-teal-100",
    bar: "bg-teal-500",
  },
};

const DEFAULT_NAV_ICON_STYLE = {
  icon: "text-slate-500",
  row: "hover:bg-slate-100",
  tile: "group-hover:bg-slate-200",
  bar: "bg-slate-400",
};

const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isUpgradeCardVisible, setIsUpgradeCardVisible] = useState(true);

  // Desktop-only collapse: shrink the sidebar down to an icon rail and back.
  // Persisted so the choice survives reloads + page navigation. A
  // `sidebar-collapsed` class on <body> lets the page-content margins
  // (lg:ml-64) and header offset (ml-64) follow — see index.css. Mobile keeps
  // the full drawer regardless (all collapse styles are `lg:`-scoped).
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
    } catch {
      /* ignore storage errors (private mode etc.) */
    }
    document.body.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);

  // Items marked `adminOnly` are visible to elevated users only.
  // "Elevated" = type=admin OR has the Owner / Manager role.
  //
  // Role storage in the login object follows EspoCRM's plural-keyed shape:
  //   - `rolesIds:   ["id123"]`                ← we don't need these
  //   - `rolesNames: { id123: "Owner" }`       ← name lookup, what we use
  // We also accept the singular-keyed variants (`role`, `roles`, `roleNames`)
  // for forward compatibility in case the auth response shape changes.
  // All sources are normalized + lowercased before membership check.
  const storedUser = getStoredUser();
  const userRoles = [
    storedUser?.role,
    ...(Array.isArray(storedUser?.roles) ? storedUser.roles : []),
    ...Object.values(storedUser?.rolesNames || {}),
    ...Object.values(storedUser?.roleNames || {}),
  ]
    .filter(Boolean)
    .map((r) => (typeof r === "string" ? r : r?.name || ""))
    .map((r) => r.toLowerCase());
  const isAdmin =
    isSupAdmin() ||
    userRoles.includes("owner") ||
    userRoles.includes("manager");

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "LayoutDashboard",
      badge: null,
    },
    // {
    //   label: "Sales Team",
    //   path: "/sales-team",
    //   icon: "Users",
    //   badge: null,
    // },
    {
      label: "Leads",
      path: "/leads",
      icon: "Target",

    },
    {
      label: "Inactive Leads",
      path: "/inactive-leads",
      // Was "Recycle", which reads as re-engagement rather than "out of play".
      icon: "UserX",
    },
    {
      label: "My Campaigns",
      path: "/campaigns",
      // Was "Layers" — generic stacking, nothing to do with campaigns.
      icon: "Megaphone",
      // Visible only to elevated users — type=admin, role=owner, or
      // role=manager. The check happens via the `isAdmin` flag computed
      // at the top of this component (see the comment there for the full
      // truth table).
      // adminOnly: true,
    },
    
        {
      label: "Pipeline",
      path: "/pipeline",
      icon: "Filter",
      badge: null,
    },
    {
      label: "Site Visits",
      path: "/sitevisite",
      icon: "CalendarCheck",
      // Temporarily hidden from reps while the section is being built —
      // visible to admin / owner / manager only. Remove this once done.
      adminOnly: true,
    },
    // {
    //   label: "Meeting",
    //   path: "/meeting",
    //   icon: "Projector",

    // },
    {
      label: "Task",
      path: "/tasks",
      icon: "ListChecks",

    },
    // {
    //   label: "Training",
    //   path: "/call",
    //   icon: "Phone",

    // },
    {
      label: "Activities",
      path: "/activities",
      // Was "Calendar", a near-duplicate of Site Visits' CalendarCheck two rows
      // above — two calendar glyphs in one list are hard to tell apart at 18px.
      icon: "Activity",
      badge: null,
    },
    {
      label: "Reports",
      path: "/reports",
      icon: "BarChart3",
      badge: null,
    },
    {
      label: "Import",
      path: "/import",
      icon: "Upload",
      // Same elevated-only gate as My Campaigns — type=admin, role=owner,
      // or role=manager. Reps shouldn't see the bulk-import surface.
      isSupAdmin: true,
    },
    {
      label: "Settings",
      path: "/settings",
      icon: "Settings",
      badge: null,
      // Restricted accounts don't get Settings. The /settings route is guarded
      // too (see Routes.jsx) — hiding the button alone would still leave the
      // page reachable by typing the URL.
      hideWhenMasked: true,
    },
    {
      label: "Help Center",
      path: "/help",
      // LifeBuoy is the near-universal help affordance; a notebook reads as
      // documentation or notes.
      icon: "LifeBuoy",
      badge: null,
    },

    // {  
    //   label: "Integrations",
    //   path: "/integrations",
    //   icon: "Puzzle",
    //   badge: null,
    // },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) {
      onClose();
    } 
  };

  const handleUpgradeClick = () => {
    navigate("/billing");
    if (onClose) {
      onClose();
    }
  };

  const handleUpgradeClose = () => {
    setIsUpgradeCardVisible(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 ${collapsed ? "lg:w-16" : "lg:w-64"} bg-sidebar border-r border-border z-50 lg:z-30
          transform transition-all duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `} >
        {/* Collapse / expand toggle — desktop only. Straddles the right edge. */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex absolute -right-3 top-24 z-40 w-6 h-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted transition-smooth"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "ChevronRight" : "ChevronLeft"} size={14} />
        </button>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className={`flex items-center justify-between p-6 border-b border-border ${
              collapsed ? "lg:px-3" : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              {/* The real mark, rendered clean rather than boxed.
                  aajneeti-favicon.png is a cluster of small hexagons, so it
                  needs its full footprint to be legible: inside a tinted tile
                  at 24px it collapsed into unreadable specks and stopped
                  looking like the brand at all. No background, no inset — the
                  artwork carries its own colour.
                  Absolute src: a relative one resolves against the current
                  path and 404s on nested routes like
                  /help/:category/:article. */}
              <img
                src="/assets/images/aajneeti-favicon.png"
                alt="Aajneeti"
                className="w-9 h-9 shrink-0 object-contain"
              />
              <div
                className={`flex items-center space-x-2 min-w-0 ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                <span className="text-lg font-semibold flag-flow">
                  CRM
                </span>
                {/* whitespace-nowrap: the pill was wrapping onto two lines in
                    the 16rem rail, which broke the pill shape. */}
                <span className="whitespace-nowrap px-2 py-0.5 text-[11px] font-medium bg-accent text-accent-foreground rounded-full">
                  By Aajneeti Connect ltd.
                </span>
              </div>
            </div>

            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
              aria-label="Close navigation menu"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-3 space-y-1">
              {navigationItems
                ?.filter((item) => {
                  // `adminOnly` — visible to admin / owner / manager.
                  // `isSupAdmin` — visible ONLY to type=admin (stricter
                  //   than adminOnly; owner / manager are hidden too).
                  // Both flags can coexist on an item; the strictest one
                  //   wins.
                  if (item.adminOnly && !isAdmin) return false;
                  if (item.isSupAdmin && !isSupAdmin()) return false;
                  // `hideWhenMasked` — hidden from restricted accounts.
                  if (item.hideWhenMasked && isMaskedUser()) return false;
                  return true;
                })
                .map((item) => {
                const isActive = location?.pathname === item?.path;
                const iconStyle =
                  NAV_ICON_STYLES[item?.path] || DEFAULT_NAV_ICON_STYLE;

                return (
                  <button
                    key={item?.path}
                    onClick={() => handleNavigation(item?.path)}
                    title={item?.label}
                    className={`
                      group relative w-full flex items-center gap-2
                      rounded-xl py-2.5 text-sm font-medium
                      transition-all duration-200 ease-out
                      ${/* justify-between was unconditional, so with the label
                           hidden the lone icon was pushed to the START of a
                           full-width row rather than centred — and the
                           lg:justify-center override only applied above lg.
                           Collapsed now owns its own justification and
                           padding outright. */ ""}
                      ${/* No horizontal padding when collapsed. The rail is
                           lg:w-16 (64px) and the nav container already spends
                           24px of that on its own px-3, leaving 40px. A px-2
                           here took 16px more, so the 32px icon tile had only
                           24px to sit in — and being shrink-0 it couldn't
                           compress, so it overflowed to one side instead of
                           centring. With px-0 the tile gets the full 40px and
                           lands dead centre with 4px either side. */ ""}
                      ${collapsed ? "justify-center px-0" : "justify-between px-3"}
                      ${isActive
                        ? "linearbg-1 text-white shadow-[0_6px_18px_-8px_rgba(172,35,52,0.75)]"
                        : `text-slate-600 hover:text-slate-900 ${iconStyle.row} ${
                            /* The hover nudge reads as motion in the full
                               sidebar, but in the narrow rail it just knocks a
                               centred icon off centre. */
                            collapsed ? "" : "motion-safe:hover:translate-x-0.5"
                          }`
                      }
                    `}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* Accent bar — wipes in from the left on hover. Gives the
                        row a direction of travel instead of just a colour
                        change, and costs nothing when idle because it is
                        scaled to zero rather than unmounted. Suppressed on the
                        active row, which already carries the gradient. */}
                    {!isActive && (
                      <span
                        className={`pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 origin-center scale-y-0 rounded-r-full transition-transform duration-200 ease-out group-hover:scale-y-100 ${iconStyle.bar}`}
                      />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon tile. Giving the glyph its own surface makes the
                          list read as designed rows rather than floating
                          icons, and gives the hover somewhere to land. */}
                      <span
                        className={`
                          grid h-8 w-8 shrink-0 place-items-center rounded-lg
                          transition-colors duration-200
                          ${isActive
                            ? "bg-white/15"
                            : `bg-white/70 ring-1 ring-slate-900/[0.04] shadow-[0_1px_2px_rgba(16,24,40,0.07)] backdrop-blur-sm ${iconStyle.tile} group-hover:shadow-[0_2px_6px_rgba(16,24,40,0.10)]`
                          }
                        `}
                      >
                        <Icon
                          name={item?.icon}
                          size={18}
                          className={`
                            transition-transform duration-200 motion-safe:group-hover:scale-110
                            ${isActive ? "text-white" : iconStyle.icon}
                          `}
                        />
                      </span>
                      <span className={collapsed ? "lg:hidden" : "truncate"}>
                        {item?.label}
                      </span>
                    </div>
                    {item?.badge > 0 && (
                      <span
                        className={`
                          px-2 py-0.5 text-xs font-semibold rounded-full tabular-nums
                          ${collapsed ? "lg:hidden" : ""}
                          ${isActive
                            ? "bg-white/20 text-white"
                            : "bg-primary/10 text-primary"
                          }
                        `}
                      >
                        {item?.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div
            className={`p-4 border-t border-border ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <div className="text-xs text-muted-foreground text-center">
              Developed by Aajneeti connect ltd.
              <br />© 2026 All rights reserved.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
