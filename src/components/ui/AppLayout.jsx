import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

/**
 * The persistent chrome: Header and Sidebar mount ONCE for the session, and
 * only the routed content below them swaps.
 *
 * Previously every page rendered its own <Header /> and <Sidebar />, so each
 * navigation unmounted both and mounted fresh copies. The sidebar you saw after
 * a click was never the same element — it just looked identical. Three things
 * fell out of that:
 *
 *   - any transient sidebar state (scroll position, collapse animation) reset
 *     on every navigation;
 *   - the Suspense fallback for a lazily-loaded page blanked the WHOLE screen,
 *     chrome included, because the chrome lived inside the chunk being loaded;
 *   - the chrome was re-painted on every navigation, which for twelve
 *     backdrop-filtered icon tiles is not free.
 *
 * Both components are `position: fixed`, so pages keep their existing
 * `lg:ml-64 pt-16` content wrappers unchanged — this only changes WHERE the
 * chrome is mounted, not how content is laid out around it.
 */
const AppLayout = () => {
  // Owned here now rather than duplicated in every page. The mobile menu
  // button in Header toggles it; Sidebar closes it on navigation.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <Header
        onMenuToggle={() => setIsSidebarOpen((open) => !open)}
        isSidebarOpen={isSidebarOpen}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <Outlet />
    </>
  );
};

export default AppLayout;
