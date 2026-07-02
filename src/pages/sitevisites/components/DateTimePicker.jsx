import React, { useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Future-oriented shortcuts (this is a scheduling flow, not a history range).
const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "Next month", days: 30 },
];

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const sameYMD = (a, b) =>
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const buildCells = (y, m) => {
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = startDow - 1; i >= 0; i--)
    cells.push({ date: new Date(y, m - 1, prevDays - i), cur: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(y, m, d), cur: true });
  let nd = 1;
  while (cells.length < 42) cells.push({ date: new Date(y, m + 1, nd++), cur: false });
  return cells;
};

const DateTimePicker = ({ value, title = "Pick date & time", onApply, onClose }) => {
  const base = value ? new Date(value) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const [selected, setSelected] = useState(value ? new Date(value) : null);

  const init12 = ((base.getHours() % 12) || 12);
  const [hour, setHour] = useState(init12);
  const [minute, setMinute] = useState(base.getMinutes());
  const [ampm, setAmpm] = useState(base.getHours() >= 12 ? "PM" : "AM");

  const cells = useMemo(() => buildCells(view.y, view.m), [view]);
  const years = useMemo(() => {
    const c = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => c - 1 + i);
  }, []);

  const shift = (delta) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  const applyPreset = (days) => {
    const d = addDays(new Date(), days);
    setSelected(d);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const handleApply = () => {
    const d = selected ? new Date(selected) : new Date(view.y, view.m, 1);
    let h = hour % 12;
    if (ampm === "PM") h += 12;
    d.setHours(h, Number(minute) || 0, 0, 0);
    onApply(d);
  };

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Presets */}
          <div className="flex flex-col gap-1 border-b border-slate-100 p-4 sm:w-40 sm:border-b-0 sm:border-r">
            {PRESETS.map((p) => {
              const active = sameYMD(selected, addDays(new Date(), p.days));
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.days)}
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "border border-slate-200 font-medium text-slate-800 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Calendar */}
          <div className="flex-1 p-4">
            {/* Month / year nav */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={view.m}
                  onChange={(e) => setView({ ...view, m: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-[#AC2334]"
                >
                  {MONTH_NAMES.map((mn, i) => (
                    <option key={mn} value={i}>{mn}</option>
                  ))}
                </select>
                <select
                  value={view.y}
                  onChange={(e) => setView({ ...view, y: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-[#AC2334]"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => shift(-1)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                  <Icon name="ChevronLeft" size={16} />
                </button>
                <button onClick={() => shift(1)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                  <Icon name="ChevronRight" size={16} />
                </button>
              </div>
            </div>

            {/* Weekday header */}
            <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
              {DOW.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
              {cells.map(({ date, cur }, i) => {
                const isSel = sameYMD(date, selected);
                const isToday = sameYMD(date, new Date());
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(date)}
                    className={`mx-auto grid h-9 w-9 place-items-center rounded-full transition-colors ${
                      isSel
                        ? "bg-[#AC2334] font-semibold text-white"
                        : cur
                          ? "text-slate-700 hover:bg-slate-100"
                          : "text-slate-300 hover:bg-slate-50"
                    } ${!isSel && isToday ? "ring-1 ring-[#AC2334]/40" : ""}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Time + actions */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5">
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-[#AC2334]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="font-semibold text-slate-400">:</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-[#AC2334]"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                  ))}
                </select>
                <select
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-[#AC2334]"
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!selected}
                  className="rounded-lg bg-[#AC2334] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#961e2d] disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;
