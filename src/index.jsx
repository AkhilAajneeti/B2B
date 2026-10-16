import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const container = document.getElementById("root");
const root = createRoot(container);

// App-wide query defaults. Previously `new QueryClient()` used the library
// defaults (staleTime: 0 + refetchOnWindowFocus/Mount/Reconnect: true), so every
// query WITHOUT its own staleTime refetched on each mount and every time the tab
// regained focus — a major source of redundant API traffic. These defaults make
// such queries cache-first for 5 minutes and stop the focus/reconnect refetch
// storm. Hooks that set their own staleTime/refetch options still override this,
// and mutations' invalidateQueries still force a refetch, so nothing that needs
// fresh data breaks.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — serve cache instead of refetching on mount
      gcTime: 30 * 60 * 1000, // keep unused cache around for 30 min
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
