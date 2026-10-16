import React, { memo } from 'react';
import Icon from '../../../components/AppIcon';

// Each card's accent (blue / green / amber) drives its icon tile, corner glow,
// and hover halo. Deriving all three from one hex keeps them in lockstep and
// means the caller only passes `iconColor`.
const hexToRgba = (hex = '#3B82F6', a = 1) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  // eslint-disable-next-line no-bitwise
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const KPICard = ({
  title,
  value,
  change,
  changeType,
  icon,
  iconColor = '#3B82F6',
  comparisonLabel,
  isLoading,
  // `featured` = the hero card (full-width on mobile). Bigger number + roomier
  // padding so it earns the extra space through type, not dead air.
  featured = false,
  // Draws a slowly rotating mandala into the bottom-right corner. Opt-in per
  // card so it stays an accent rather than wallpaper repeated three times.
  ornament = false,
}) => {
  const tint = hexToRgba(iconColor, 0.12); // icon tile background
  const glow = hexToRgba(iconColor, 0.35); // hover halo shadow
  const blob = hexToRgba(iconColor, 0.22); // corner radial glow
  const ornamentTint = hexToRgba(iconColor, 0.3); // mandala line colour

  return (
    <div
      style={{ '--kpi-glow': glow }}
      className={`group relative h-full overflow-hidden rounded-2xl border border-[rgba(20,20,30,0.07)] bg-card shadow-[0_1px_2px_rgba(16,24,40,.04),0_2px_8px_rgba(16,24,40,.05)] transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-[rgba(20,20,30,0.12)] hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_20px_44px_-16px_var(--kpi-glow)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        featured ? 'p-5 sm:p-6 md:p-6' : 'p-4 sm:p-5'
      } ${isLoading ? 'kpi-shimmer kpi-glow' : ''}`}
    >
      {/* Soft corner glow — brightens on hover for a subtle "alive" feel. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 rounded-full blur-2xl opacity-70 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none ${
          featured ? 'h-36 w-36' : 'h-28 w-28'
        }`}
        style={{ background: `radial-gradient(circle, ${blob}, transparent 70%)` }}
      />

      {/* Mandala — drawn rather than loaded as an image so it inherits the
          card's accent (one component serves a blue, green or amber card
          instead of one PNG per colour), stays crisp at any size, and can
          rotate without a second asset.

          Sits under the content: the card already clips with overflow-hidden,
          so pushing it past the corner crops it exactly as in the design.
          90s per turn — slow enough to read as drift rather than spin.
          motion-safe so it holds still for reduced-motion users. */}
      {ornament && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-12 -right-12 motion-safe:animate-[spin_90s_linear_infinite] ${
            featured ? 'h-48 w-48' : 'h-40 w-40'
          }`}
          style={{ color: ornamentTint }}
        >
          <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
            {/* Concentric rings */}
            <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="74" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="10" stroke="currentColor" strokeWidth="1.5" />
            {/* Dotted ring, echoing the reference's stippled band */}
            <circle
              cx="100"
              cy="100"
              r="57"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="0.5 7"
            />
            {/* Outer petal ring */}
            {Array.from({ length: 16 }).map((_, i) => (
              <ellipse
                key={`outer-${i}`}
                cx="100"
                cy="57"
                rx="9"
                ry="22"
                stroke="currentColor"
                strokeWidth="1.5"
                transform={`rotate(${i * 22.5} 100 100)`}
              />
            ))}
            {/* Inner petal ring, offset half a step so the two interleave */}
            {Array.from({ length: 12 }).map((_, i) => (
              <ellipse
                key={`inner-${i}`}
                cx="100"
                cy="75"
                rx="6"
                ry="13"
                stroke="currentColor"
                strokeWidth="1.5"
                transform={`rotate(${i * 30 + 15} 100 100)`}
              />
            ))}
          </svg>
        </div>
      )}

      <div className={`relative flex h-full items-center justify-between gap-3 ${isLoading ? 'opacity-50' : ''}`}>
        <div className="min-w-0">
          <p
            className="truncate text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground"
            title={title}
          >
            {title || 'Loading...'}
          </p>

          <p
            className={`mt-2 font-bold leading-none tabular-nums tracking-tight text-card-foreground ${
              featured ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
            }`}
          >
            {isLoading ? '0' : value}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                changeType === 'positive'
                  ? 'bg-success/10 text-success'
                  : changeType === 'negative'
                    ? 'bg-error/10 text-error'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {!isLoading && changeType === 'positive' && <Icon name="TrendingUp" size={12} />}
              {!isLoading && changeType === 'negative' && <Icon name="TrendingDown" size={12} />}
              <span>{isLoading ? '--' : change}</span>
            </span>

            <span className="text-[11px] text-muted-foreground">
              vs {comparisonLabel || '...'}
            </span>
          </div>
        </div>

        <div
          className={`grid shrink-0 place-items-center rounded-xl transition-transform duration-300 ease-premium group-hover:scale-105 motion-reduce:transition-none ${
            featured ? 'h-12 w-12 md:h-14 md:w-14' : 'h-10 w-10 sm:h-11 sm:w-11'
          }`}
          style={{ backgroundColor: isLoading ? undefined : tint }}
        >
          <Icon name={icon} size={featured ? 26 : 22} color={iconColor} />
        </div>
      </div>
    </div>
  );
};

export default memo(KPICard);
