import React, { useState } from "react";
import toast from "react-hot-toast";
import Icon from "../../../components/AppIcon";
import { useUsers } from "hooks/useUsers";
import { scheduleSiteVisit } from "services/sitevisite.service";
import DateTimePicker from "./DateTimePicker";
import LeadCombobox from "./LeadCombobox";

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

  const [lead, setLead] = useState(null);
  const [repId, setRepId] = useState("");
  const [when, setWhen] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLeadChange = (l) => {
    setLead(l);
    setRepId(l?.assignedUserId || "");
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
          {/* Lead */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Lead</label>
            <LeadCombobox value={lead} onChange={handleLeadChange} />
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
