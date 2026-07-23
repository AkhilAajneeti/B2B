import React, { memo } from 'react';
import Icon from '../../../components/AppIcon';

// Shares the KPICard visual language (white surface, accent glow, hover lift)
// so the whole dashboard reads as one system. Compact — these are secondary
// "today" drill-downs, not headline metrics.
const hexToRgba = (hex = '#3B82F6', a = 1) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  // eslint-disable-next-line no-bitwise
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const StatTile = ({ label, value, icon, accent = '#3B82F6', onClick, selected = false }) => {
  // Zero is the common case for "today" counts, so a 0 tile stays muted (gray)
  // and only lights up with its accent once there's real activity — the eye
  // lands on what happened, not on four zeros.
  const active = Number(value) > 0;
  const tint = hexToRgba(accent, 0.12);
  const glow = hexToRgba(accent, 0.35);
  const blob = hexToRgba(accent, 0.2);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        '--tile-glow': active ? glow : 'transparent',
        '--tile-ring': accent,
        ...(selected ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` } : {}),
      }}
      className="group relative h-full overflow-hidden rounded-2xl border border-[rgba(20,20,30,0.07)] bg-card p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,.04),0_2px_6px_rgba(16,24,40,.05)] transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-[rgba(20,20,30,0.12)] hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_16px_36px_-14px_var(--tile-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tile-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
          style={{ background: `radial-gradient(circle, ${blob}, transparent 70%)` }}
        />
      )}

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            title={label}
          >
            {label}
          </p>
          <p
            className={`mt-1.5 text-2xl font-bold leading-none tabular-nums tracking-tight ${
              active ? 'text-card-foreground' : 'text-muted-foreground/50'
            }`}
          >
            {value}
          </p>
        </div>

        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 ease-premium group-hover:scale-105 motion-reduce:transition-none ${
            active ? '' : 'bg-muted'
          }`}
          style={active ? { backgroundColor: tint } : undefined}
        >
          <Icon
            name={icon}
            size={18}
            color={active ? accent : undefined}
            className={active ? '' : 'text-muted-foreground'}
          />
        </div>
      </div>
    </button>
  );
};

export default memo(StatTile);
