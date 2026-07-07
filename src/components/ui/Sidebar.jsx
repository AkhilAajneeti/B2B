import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../AppIcon";
import Button from "./Button";
import { getStoredUser, isSupAdmin } from "../../utils/permission";

const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isUpgradeCardVisible, setIsUpgradeCardVisible] = useState(true);

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
    //   label: "Accounts",
    //   path: "/accounts",
    //   icon: "Building2",
    //   badge: null,
    // },
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
      label: "My Campaigns",
      path: "/campaigns",
      icon: "Layers",
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
      icon: "Calendar",
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
    },
    {
      label: "Help Center",
      path: "/help",
      icon: "NotebookText",
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
          fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-border z-50 lg:z-30
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `} >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Zap" size={20} color="white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-foreground">
                  CRM
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground rounded-full">
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
                  return true;
                })
                .map((item) => {
                const isActive = location?.pathname === item?.path;

                return (
                  <button
                    key={item?.path}
                    onClick={() => handleNavigation(item?.path)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg
                      transition-smooth group
                      ${isActive
                        ? "linearbg-1 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-mahroon"
                      }
                    `}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        name={item?.icon}
                        size={18}
                        className={`
                          ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}
                        `}
                      />
                      <span>{item?.label}</span>
                    </div>
                    {item?.badge > 0 && (
                      <span
                        className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-mahroon-400 text-accent-foreground"
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
          <div className="p-4 border-t border-border">
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
