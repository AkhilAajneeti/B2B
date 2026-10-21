import React from 'react';
import { motion } from 'framer-motion';
import Icon from '../../../components/AppIcon';

// Shares the dashboard's premium language: white surface, burst-gradient icon
// tile, accent glow on hover. Compact so four tile 2×2 on mobile without a long
// scroll; the description shows on desktop only (the title carries the meaning
// on its own).
const hexToRgba = (hex = '#10B981', a = 1) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  // eslint-disable-next-line no-bitwise
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * `share` puts the number in context — "6,382" alone means nothing without
 * "15% of all leads" beside it, and the denominator used to live two cards
 * away, leaving the reader to do the arithmetic.
 *
 * `expandable` / `expanded` give the one card that opens a drawer a chevron,
 * because every card on this page looks identical while three different things
 * happen on click: some filter the table, one opens a drawer, and the rest do
 * nothing at all. A card with no handler now renders as a plain div — no
 * pointer, no hover lift, no button semantics — so the ones that do something
 * are the ones that look like they will.
 */
const MetricsCard = ({
  title,
  value,
  icon,
  from = '#10B981',
  to = '#059669',
  description,
  share,
  onClick,
  selected = false,
  expandable = false,
  expanded = false,
}) => {
  const display = typeof value === 'number' ? value.toLocaleString('en-IN') : value;
  const interactive = typeof onClick === 'function';
  const Root = interactive ? motion.button : motion.div;

  return (
    <Root
      {...(interactive
        ? { type: 'button', onClick, 'aria-pressed': selected, 'aria-expanded': expandable ? expanded : undefined }
        : {})}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        '--card-glow': hexToRgba(from, 0.3),
        '--card-ring': from,
        ...(selected ? { borderColor: from, boxShadow: `0 0 0 1.5px ${from}` } : {}),
      }}
      className={`group relative h-full w-full overflow-hidden rounded-2xl border border-[rgba(20,20,30,0.07)] bg-card p-4 sm:p-5 text-left shadow-[0_1px_2px_rgba(16,24,40,.04),0_2px_8px_rgba(16,24,40,.05)] transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--card-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
        interactive
          ? 'cursor-pointer hover:-translate-y-1 hover:border-[rgba(20,20,30,0.12)] hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_20px_44px_-16px_var(--card-glow)] motion-reduce:hover:translate-y-0'
          : 'cursor-default'
      }`}
    >
      {/* Soft accent glow, brightens on hover. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
        style={{ background: `radial-gradient(circle, ${hexToRgba(from, 0.22)}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground"
            title={title}
          >
            {title}
          </h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-2xl sm:text-3xl font-bold leading-none tabular-nums tracking-tight text-foreground">
              {display}
            </p>
            {share != null && (
              <span
                className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground"
                title="Share of all leads in this view"
              >
                {share}
              </span>
            )}
          </div>
        </div>

        <span
          className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl text-white shadow-[0_4px_10px_-2px_var(--card-glow)] transition-transform duration-300 ease-premium group-hover:scale-105 motion-reduce:transition-none"
          style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          <Icon name={icon} size={20} />
        </span>
      </div>

      {/* Desktop-only helper line — omitted on the compact mobile tile. */}
      {(description || expandable) && (
        <p className="relative mt-3 hidden items-center gap-1 text-[12px] text-muted-foreground sm:flex">
          <span className="min-w-0 flex-1">{description}</span>
          {expandable && (
            <Icon
              name={expanded ? 'ChevronUp' : 'ChevronDown'}
              size={14}
              className="shrink-0"
            />
          )}
        </p>
      )}
    </Root>
  );
};

export default MetricsCard;
