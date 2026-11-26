/**
 * The export picker's date ranges, with a live count on each row.
 *
 * WHY THE COUNT IS THE POINT. The picker used to offer "First 100 / 250 /
 * 500", which never said WHICH leads those were — the answer depended on the
 * sort and changed every time a lead was created. Ranges are a question a
 * person can answer before clicking, but only if the row says how big the
 * range is: the export caps at EXPORT_SELECTION_LIMIT, so a month holding
 * 1,200 leads would otherwise hand back the newest 500 under a label
 * promising the month.
 *
 * ONE REQUEST PER RANGE, `maxSize=1` — the rows are discarded, only `total`
 * is wanted. Four small requests when the dialog opens, none before.
 *
 * A COUNT THAT FAILS IS A MISSING HINT, NOT A BLOCKED EXPORT. countLeadsInRange
 * resolves null rather than throwing, and a null simply leaves the row's hint
 * blank; the range still exports.
 */

import { useEffect, useMemo, useState } from "react";
import {
  EXPORT_DATE_RANGES,
  EXPORT_SELECTION_LIMIT,
  countLeadsInRange,
} from "services/leads.service";

export const useExportRanges = ({ filters, enabled }) => {
  // key -> number (count), null (failed) or undefined (still counting).
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    // Cleared on every open so a reopened dialog never shows counts from the
    // filter that was set last time.
    setCounts({});

    EXPORT_DATE_RANGES.forEach((range) => {
      countLeadsInRange({ filters, dateType: range.dateType }).then((total) => {
        if (cancelled) return;
        setCounts((prev) => ({ ...prev, [range.key]: total }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, filters]);

  const options = useMemo(
    () =>
      EXPORT_DATE_RANGES.map((range) => {
        const total = counts[range.key];
        const counting = total === undefined;
        const failed = total === null;
        const empty = total === 0;
        const overCap = typeof total === "number" && total > EXPORT_SELECTION_LIMIT;

        let hint = "";
        if (counting) hint = "Counting…";
        else if (failed) hint = "";
        else if (empty) hint = "No leads in this range";
        else if (overCap)
          // Stated plainly rather than silently truncated. This is the one
          // case where the label and the file would otherwise disagree.
          // "first", not "newest": the collection follows the page's CURRENT
          // sort, so these are the newest only under the default createdAt
          // desc — under Name A→Z they are the first 500 alphabetically.
          hint = `${total.toLocaleString()} leads — exports the first ${EXPORT_SELECTION_LIMIT}`;
        else hint = `${total.toLocaleString()} lead${total === 1 ? "" : "s"}`;

        return {
          key: range.key,
          value: range.key,
          label: range.label,
          hint,
          // Nothing to export, and nothing to explain afterwards. Still
          // clickable while counting, so a slow count never blocks someone
          // who already knows what they want.
          disabled: empty,
        };
      }),
    [counts],
  );

  return { options, counts };
};

export default useExportRanges;
