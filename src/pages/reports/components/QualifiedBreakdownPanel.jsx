import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "../../../components/AppIcon";

/**
 * The drawer that opens under the Genuinely Qualified card, splitting its total
 * across the individual statuses that make it up.
 *
 * The card answers "how many"; this answers "made of what". Keeping them as one
 * card plus a drawer rather than six more cards matters — six tiles of 3 to 631
 * would read as six equally important things, when the point is that they are
 * parts of one number.
 *
 * Counts come from the same base filters and the same status list the card
 * itself uses, so the rows always add up to the headline. They are fetched only
 * once the drawer is opened.
 *
 * The bars are proportional to the LARGEST status, not to the total. With a
 * distribution this skewed — hundreds in Follow up, single digits in Purchased —
 * scaling to the total would collapse every small status into an invisible
 * sliver. The percentage beside each row still reads against the total, so no
 * information is lost; the bar is there for ranking at a glance.
 */

/* Teal through indigo, following pipeline order: further along the pipeline,
   deeper the colour. Decorative chrome rather than a data encoding — the number
   and the bar carry the value, so this reinforces sequence without being the
   thing the reader has to decode. */
const STAGE_STYLES = {
  "Follow up": { accent: "#14B8A6", icon: "TrendingUp" },
  Interested: { accent: "#0D9488", icon: "Heart" },
  "Site Visit Scheduled": { accent: "#0E7490", icon: "CalendarCheck" },
  "Invitation Sent": { accent: "#0369A1", icon: "Send" },
  "Site Visit Done": { accent: "#1D4ED8", icon: "MapPin" },
  Purchased: { accent: "#4338CA", icon: "CheckCircle2" },
};

const LABELS = {
  "Site Visit Scheduled": "Visit Scheduled",
  "Site Visit Done": "Visit Done",
};

const QualifiedBreakdownPanel = ({ open, rows = [], total = 0, isLoading }) => {
  const max = rows.reduce((n, r) => Math.max(n, r.value || 0), 0);
  const sum = rows.reduce((n, r) => n + (r.value || 0), 0);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="qualified-breakdown"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="relative mb-8 rounded-2xl border border-[#99F6E4] bg-gradient-to-br from-[#F0FDFA] via-white to-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_28px_rgba(13,148,136,.10)] sm:p-6">
            {/* Notch pointing back at the card that opened this, so the drawer
                reads as belonging to it rather than floating under the row. */}
            <span className="absolute -top-[7px] left-10 h-3 w-3 rotate-45 border-l border-t border-[#99F6E4] bg-[#F0FDFA]" />

            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  What makes up the qualified leads
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Each lead counted once, in the status it holds right now.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                <span className="text-lg font-bold tracking-tight text-teal-700">
                  {sum.toLocaleString()}
                </span>{" "}
                across {rows.length} statuses
              </p>
            </div>

            {isLoading && sum === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading breakdown…
              </div>
            ) : (
              <div className="space-y-2.5">
                {rows.map((row, i) => {
                  const style = STAGE_STYLES[row.status] || {
                    accent: "#0D9488",
                    icon: "Circle",
                  };
                  const share = total ? (row.value / total) * 100 : 0;
                  const width = max ? Math.max(2, (row.value / max) * 100) : 0;

                  return (
                    <motion.div
                      key={row.status}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: 0.04 * i }}
                      className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-[#CCFBF1] hover:bg-white"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${style.accent}, ${style.accent}cc)`,
                        }}
                      >
                        <Icon name={style.icon} size={16} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {LABELS[row.status] || row.status}
                          </p>
                          <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                            {row.value.toLocaleString()}
                            <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                              {share.toFixed(share < 1 && share > 0 ? 1 : 0)}%
                            </span>
                          </p>
                        </div>

                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.5, delay: 0.06 * i, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, ${style.accent}, ${style.accent}aa)`,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <p className="mt-4 border-t border-[#CCFBF1] pt-3 text-[11px] leading-relaxed text-slate-500">
              Bars are scaled to the largest status so the small ones stay
              visible; the percentage is of the qualified total. Qualified Due To
              Delay is counted on its own card and is not included here.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QualifiedBreakdownPanel;
