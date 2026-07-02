import React, { useMemo, useState, useEffect } from "react";
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

// A styled select with a right-aligned chevron (native arrow suppressed).
const Select = ({ value, onChange, children }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className="appearance-none rounded-lg border border-slate-200 bg-none py-1.5 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-[#AC2334]"
    >
      {children}
    </select>
    <Icon
      name="ChevronDown"
      size={15}
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </div>
);

// Type a value OR step with the ▲/▼ arrows (wraps around).
const Stepper = ({ value, onChange, min, max, step = 1 }) => {
  const [text, setText] = useState(String(value).padStart(2, "0"));
  useEffect(() => setText(String(value).padStart(2, "0")), [value]);

  const wrap = (v) => (v > max ? min : v < min ? max : v);

  const handleType = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setText(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
  };
  const handleBlur = () => {
    let n = parseInt(text, 10);
    if (isNaN(n)) n = min;
    n = Math.min(max, Math.max(min, n));
    onChange(n);
    setText(String(n).padStart(2, "0"));
  };

  const arrowCls =
    "grid h-6 w-12 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#AC2334]";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button type="button" onClick={() => onChange(wrap(value + step))} className={arrowCls}>
        <Icon name="ChevronUp" size={16} />
      </button>
      <input
        value={text}
        onChange={handleType}
        onBlur={handleBlur}
        inputMode="numeric"
        className="w-12 rounded-lg border border-slate-200 py-2 text-center text-base font-semibold tabular-nums text-slate-800 outline-none transition-colors focus:border-[#AC2334]"
      />
      <button type="button" onClick={() => onChange(wrap(value - step))} className={arrowCls}>
        <Icon name="ChevronDown" size={16} />
      </button>
    </div>
  );
};

const NavBtn = ({ name, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
  >
    <Icon name={name} size={16} />
  </button>
);

const DateTimePicker = ({ value, title = "Pick date & time", onApply, onClose }) => {
  const base = value ? new Date(value) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const [selected, setSelected] = useState(value ? new Date(value) : null);

  const init12 = ((base.getHours() % 12) || 12);
  const [hour, setHour] = useState(init12);
  const [minute, setMinute] = useState((Math.round(base.getMinutes() / 5) * 5) % 60);
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
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Presets */}
          <div className="flex flex-row flex-wrap gap-1 border-b border-slate-100 p-3 sm:w-36 sm:flex-col sm:border-b-0 sm:border-r">
            {PRESETS.map((p) => {
              const active = sameYMD(selected, addDays(new Date(), p.days));
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.days)}
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-[#AC2334]/10 font-semibold text-[#AC2334]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Calendar */}
          <div className="flex-1 p-5">
            {/* Month / year + nav (grouped so arrows feel attached) */}
            <div className="mb-4 flex items-center gap-2">
              <NavBtn name="ChevronLeft" onClick={() => shift(-1)} />
              <Select value={view.m} onChange={(e) => setView({ ...view, m: Number(e.target.value) })}>
                {MONTH_NAMES.map((mn, i) => (
                  <option key={mn} value={i}>{mn}</option>
                ))}
              </Select>
              <Select value={view.y} onChange={(e) => setView({ ...view, y: Number(e.target.value) })}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
              <NavBtn name="ChevronRight" onClick={() => shift(1)} />
            </div>

            {/* Weekday header */}
            <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
              {DOW.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {cells.map(({ date, cur }, i) => {
                const isSel = sameYMD(date, selected);
                const isToday = sameYMD(date, new Date());
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(date)}
                    className={`mx-auto grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                      isSel
                        ? "bg-[#AC2334] font-semibold text-white shadow-sm"
                        : cur
                          ? "text-slate-700 hover:bg-slate-100"
                          : "text-slate-300 hover:bg-slate-50"
                    } ${!isSel && isToday ? "ring-1 ring-inset ring-[#AC2334]/50" : ""}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Time + actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <Stepper value={hour} onChange={setHour} min={1} max={12} />
                <span className="text-lg font-semibold text-slate-300">:</span>
                <Stepper value={minute} onChange={setMinute} min={0} max={59} step={5} />
                <div className="ml-1 inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm font-medium">
                  {["AM", "PM"].map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setAmpm(x)}
                      className={`px-3.5 py-2 transition-colors ${
                        ampm === x ? "bg-[#AC2334] text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!selected}
                  className="rounded-lg bg-[#AC2334] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#961e2d] disabled:cursor-not-allowed disabled:opacity-50"
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
