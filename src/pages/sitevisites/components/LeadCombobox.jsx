import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "../../../components/AppIcon";
import { searchLeads } from "services/leads.service";

const PAGE_SIZE = 15;

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

/**
 * Searchable, paginated lead picker.
 * - Focus → shows recent leads; typing → debounced multi-field search.
 * - Infinite scroll for large datasets (only one page loaded at a time).
 * - Full keyboard nav (↑ ↓ Enter Esc) + ARIA combobox semantics.
 */
const LeadCombobox = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | loadingMore | error
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const optionRefs = useRef([]);
  const reqId = useRef(0);
  const offsetRef = useRef(0);

  const hasMore = total != null && items.length < total;

  const load = useCallback(
    async (reset) => {
      const myReq = ++reqId.current;
      const offset = reset ? 0 : offsetRef.current;
      setStatus(reset ? "loading" : "loadingMore");
      try {
        const data = await searchLeads({ query, limit: PAGE_SIZE, offset });
        if (myReq !== reqId.current) return; // a newer request superseded this
        const list = data?.list || [];
        offsetRef.current = offset + list.length;
        setItems((prev) => (reset ? list : [...prev, ...list]));
        setTotal(typeof data?.total === "number" ? data.total : null);
        setStatus("idle");
        if (reset) setActiveIndex(0);
      } catch {
        if (myReq !== reqId.current) return;
        setStatus("error");
      }
    },
    [query],
  );

  // Debounced (300ms) search whenever the query changes while open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(true), 300);
    return () => clearTimeout(t);
  }, [query, open, load]);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keep the active option scrolled into view.
  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onListScroll = (e) => {
    const el = e.currentTarget;
    if (
      hasMore &&
      status === "idle" &&
      el.scrollHeight - el.scrollTop - el.clientHeight < 64
    ) {
      load(false);
    }
  };

  const select = (lead) => {
    onChange(lead);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIndex]) select(items[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ---- Selected state -------------------------------------------------
  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{value.name}</p>
          <p className="truncate text-xs text-slate-500">
            {value.cProject || value.cProjectName || "—"}
            {value.phoneNumber ? ` · ${value.phoneNumber}` : ""}
          </p>
        </div>
        <button
          onClick={() => onChange(null)}
          className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[#AC2334] hover:bg-[#AC2334]/10"
        >
          Change
        </button>
      </div>
    );
  }

  // ---- Search state ---------------------------------------------------
  return (
    <div ref={containerRef} className="relative">
      <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls="lead-combobox-list"
        aria-autocomplete="list"
        aria-activedescendant={open && items[activeIndex] ? `lead-opt-${activeIndex}` : undefined}
        value={query}
        autoFocus
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder="Search by name, phone, email or project…"
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#AC2334] focus:ring-2 focus:ring-[#AC2334]/10"
      />

      {open && (
        <div
          id="lead-combobox-list"
          role="listbox"
          ref={listRef}
          onScroll={onListScroll}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {/* Loading (initial) */}
          {status === "loading" && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
              <Icon name="Loader2" size={15} className="animate-spin" />
              Searching…
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex items-center justify-between px-3 py-3 text-sm">
              <span className="text-red-600">Couldn't load leads.</span>
              <button onClick={() => load(true)} className="font-medium text-[#AC2334] hover:underline">
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {status === "idle" && items.length === 0 && (
            <p className="px-3 py-3 text-sm text-slate-400">
              {query.trim() ? "No leads match your search." : "No leads found."}
            </p>
          )}

          {/* Results */}
          {items.map((lead, i) => (
            <button
              key={lead.id}
              id={`lead-opt-${i}`}
              ref={(el) => (optionRefs.current[i] = el)}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => select(lead)}
              className={`flex w-full items-start justify-between gap-3 border-b border-slate-50 px-3 py-2.5 text-left last:border-0 ${
                i === activeIndex ? "bg-[#AC2334]/5" : "hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{lead.name || "Unnamed lead"}</p>
                <p className="truncate text-xs text-slate-500">
                  {lead.phoneNumber || "No phone"}
                  {(lead.cProject || lead.cProjectName)
                    ? ` · ${lead.cProject || lead.cProjectName}`
                    : ""}
                </p>
              </div>
              <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                  {initials(lead.assignedUserName)}
                </span>
                <span className="max-w-[90px] truncate">{lead.assignedUserName || "Unassigned"}</span>
              </span>
            </button>
          ))}

          {/* Loading more */}
          {status === "loadingMore" && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400">
              <Icon name="Loader2" size={14} className="animate-spin" />
              Loading more…
            </div>
          )}

          {/* Load more (fallback to the scroll trigger) */}
          {status === "idle" && hasMore && (
            <button
              onClick={() => load(false)}
              className="w-full px-3 py-2 text-center text-xs font-medium text-[#AC2334] hover:bg-slate-50"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadCombobox;
