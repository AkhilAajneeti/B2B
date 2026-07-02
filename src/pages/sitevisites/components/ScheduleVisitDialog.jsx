import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Icon from "../../../components/AppIcon";
import { useUsers } from "hooks/useUsers";
import { fetchNewLeads } from "services/leads.service";
import { scheduleSiteVisit } from "services/sitevisite.service";
import DateTimePicker from "./DateTimePicker";

const fmtWhen = (d) =>
  d
    ? d.toLocaleString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const ScheduleVisitDialog = ({ onClose, onScheduled }) => {
  const { data: usersData } = useUsers();
  const reps = usersData?.list || [];

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [lead, setLead] = useState(null);
  const [repId, setRepId] = useState("");
  const [when, setWhen] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Debounced lead search by name.
  useEffect(() => {
    const q = query.trim();
    if (lead || q.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await fetchNewLeads({
          limit: 8,
          page: 1,
          filters: { search: q },
        });
        if (active) setResults(data?.list || []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, lead]);

  const pickLead = (l) => {
    setLead(l);
    setRepId(l.assignedUserId || "");
    setResults([]);
    setQuery("");
  };

  const handleSchedule = async () => {
    if (!lead || !when) return;
    setSaving(true);
    try {
      await scheduleSiteVisit(lead.id, { when, assignedUserId: repId || undefined });
      toast.success("Site visit scheduled");
      onScheduled?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Could not schedule the visit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">Schedule a site visit</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Lead search / selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Lead</label>
            {lead ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{lead.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {(lead.cProject || lead.cProjectName || "—")}
                    {lead.phoneNumber ? ` · ${lead.phoneNumber}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setLead(null)}
                  className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[#AC2334] hover:bg-[#AC2334]/10"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a lead by name…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#AC2334] focus:ring-2 focus:ring-[#AC2334]/10"
                />
                {(searching || results.length > 0) && query.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {searching && (
                      <p className="px-3 py-2 text-sm text-slate-400">Searching…</p>
                    )}
                    {!searching && results.length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-400">No leads found</p>
                    )}
                    {results.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => pickLead(l)}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-3 py-2 text-left last:border-0 hover:bg-slate-50"
                      >
                        <span className="text-sm font-medium text-slate-800">{l.name}</span>
                        <span className="text-xs text-slate-500">
                          {(l.cProject || l.cProjectName || "—")}
                          {l.phoneNumber ? ` · ${l.phoneNumber}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assigned rep */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Assigned rep</label>
            <div className="relative">
              <select
                value={repId}
                onChange={(e) => setRepId(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-none bg-white pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-[#AC2334]"
              >
                <option value="">Unassigned</option>
                {reps.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <Icon name="ChevronDown" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Date & time */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Date &amp; time</label>
            <button
              onClick={() => setPickerOpen(true)}
              className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-colors hover:border-slate-300 focus:border-[#AC2334]"
            >
              <span className={when ? "text-slate-800" : "text-slate-400"}>
                {when ? fmtWhen(when) : "Pick a date & time"}
              </span>
              <Icon name="Calendar" size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={!lead || !when || saving}
            className="rounded-lg bg-[#AC2334] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#961e2d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Scheduling…" : "Schedule visit"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <DateTimePicker
          value={when}
          title="Pick visit date & time"
          onApply={(d) => {
            setWhen(d);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

export default ScheduleVisitDialog;
