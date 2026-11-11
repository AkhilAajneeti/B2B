import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Pie,
  PieChart,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label,
} from "recharts";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";
import Select from "../../../components/ui/Select";
import Input from "../../../components/ui/Input";
import { fetchLeadsCount } from "services/leads.service";
import { todayLocal } from "../../../utils/dateFilter";
const COLORS = [
  "#1877F2",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];



const IndustryChart = () => {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const ACTIVITY_DATE_FILTERS = [
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "lastSevenDays" },
    { label: "This Month", value: "currentMonth" },
    { label: "On", value: "on" }
  ];

  const [filters, setFilters] = useState({
    dateType: "today",        // 👈 NEW (today, before, between, etc.)
    closeDateFrom: "",
    closeDateTo: "",
    xDays: ""            // 👈 for "Last X Days", "After X Days"
  });
  const showDateInputs = filters?.dateType === "on";
  const getSectorData = async (filtersState) => {
    const baseFilters = buildDateFilter(filtersState);

    const IMPORTANT_SECTORS = [
      "Real Estate",
      "Contact form",
      "B2B",
      "AppDev",
      "Automobiles",
      "Banquet Hall",
      "BridalMakeup",
      "CaseStudy",
      "ContentMarketing",
      "CoWorking",
      "DJMusic",
      "DubaiRELG",
      "FacebookAds",
      "FoodCatering",
      "GoogleAds",
      "HigherEducation",
      "Interior",
      "Leasing",
      "LinkedinAds",
      "LuxuryEventPlanners",
      "LuxuryTransportation",
      "ORM",
      "PhotographersVideographers",
      "PlotsRELG",
      "Political",
      "PreWedding",
      "RealEstateCityPages",
      "SEO",
      "Study abroad",
      "LogoDesign",
      "Tour_Travel",
      "WebDev",
      "WeddingFloralDecor",
      "WikipediaBrands",
      "WikipediaPoliticians",
    ];

    // BATCHED, and allSettled rather than all.
    //
    // This fired all 35 sector counts at once. Browsers allow roughly six
    // concurrent connections per host, so the other 29 queued — and every
    // other request the dashboard needs (KPIs, the summary alert, the other
    // charts) queued behind them. That is the dashboard "not loading
    // properly": the data was coming, just last.
    //
    // Promise.all made it worse: one rejected sector threw the whole chart
    // away, so a single slow or failing count rendered an empty panel. With
    // allSettled a failed sector is simply 0 and the rest still draw.
    //
    // Batched at 5, matching MultiLineChart's existing treatment, which leaves
    // room in the connection budget for the rest of the page.
    const BATCH_SIZE = 5;
    const results = [];

    for (let i = 0; i < IMPORTANT_SECTORS.length; i += BATCH_SIZE) {
      const settled = await Promise.allSettled(
        IMPORTANT_SECTORS.slice(i, i + BATCH_SIZE).map((sector) =>
          fetchLeadsCount([
            ...baseFilters,
            {
              type: "equals",
              attribute: "industry",
              value: sector,
            },
          ])
        )
      );
      settled.forEach((r) => results.push(r.status === "fulfilled" ? r.value : 0));
    }

    const data = IMPORTANT_SECTORS.map((sector, i) => ({
      name: sector,
      value: results[i],
    }));

    // Total can fail too; 0 simply means no "Others" slice rather than a
    // rejected promise taking the whole chart with it.
    const total = await fetchLeadsCount(baseFilters).catch(() => 0);

    const knownTotal = results.reduce((sum, val) => sum + val, 0);

    const others = Math.max(total - knownTotal, 0);

    if (others > 0) {
      data.push({ name: "Others", value: others });
    }

    return data;
  };
  useEffect(() => {
    if (filters.dateType === "on" && !filters.closeDateFrom) return;

    setLoading(true);

    getSectorData(filters)
      .then(setChartData)
      .catch((err) => {
        // Without this the promise rejected unhandled and chartData kept its
        // previous value behind a spinner that never cleared.
        console.error("Sector chart failed to load", err);
        setChartData([]);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const buildDateFilter = (filters) => {
    if (!filters?.dateType) return [];

    const { dateType, closeDateFrom } = filters;

    const base = {
      attribute: "createdAt",
      dateTime: true,
    };

    switch (dateType) {
      case "today":
      case "lastSevenDays":
      case "currentMonth":
        return [
          {
            type: dateType,
            ...base,
          },
        ];

      case "on":
        if (!closeDateFrom) return [];

        // 🔥 convert ON → BETWEEN (same date)
        return [
          {
            type: "between",
            attribute: "createdAt",
            value: [closeDateFrom, closeDateFrom],
            dateTime: true,
          },
        ];

      default:
        return [];
    }
  };
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };



  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const isEmpty = total === 0;
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-elevation-2">
          <p className="font-medium text-popover-foreground mb-1">
            {data.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Leads: {isEmpty ? 0 : data.value}
          </p>
        </div>
      );
    }
    return null;
  };
  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-6 shadow-elevation-1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-col">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Leads by Sector
          </h3>
          <p className="text-sm text-muted-foreground">
            Lead distribution across sectors
          </p>
        </div>

        <div className="w-full  mt-5 scrollbar-hide">
          <div className="flex gap-1 w-auto ">
            <Select
              className="w-full"
              placeholder="Filter by date"
              options={ACTIVITY_DATE_FILTERS}
              value={filters?.dateType || ""}
              onChange={(value) => handleFilterChange("dateType", value)}
            />

            {showDateInputs && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  max={todayLocal()}
                  value={filters?.closeDateFrom || ""}
                  onChange={(e) =>
                    handleFilterChange("closeDateFrom", e.target.value)
                  }
                />

                {filters?.dateType === "between" && (
                  <Input
                    type="date"
                    max={todayLocal()}
                    min={filters?.closeDateFrom || undefined}
                    value={filters?.closeDateTo || ""}
                    onChange={(e) =>
                      handleFilterChange("closeDateTo", e.target.value)
                    }
                  />
                )}
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart key={JSON.stringify(chartData)}>
            <Pie
              data={isEmpty ? [{ name: "No Data", value: 1 }] : chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              paddingAngle={1}
            >
              {(isEmpty ? [{ name: "No Data" }] : chartData).map(
                (entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={isEmpty ? "#d1d5db" : COLORS[index % COLORS.length]}
                    opacity={isEmpty ? 0.4 : 1}
                  />
                ),
              )}
              <Label
                value={`Total\n${total}`}
                position="center"
                className="text-sm font-semibold"
              />
            </Pie>

            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Summary */}
      <div className="flex flex-wrap justify-start gap-6 mt-6 pt-4 border-t border-border text-sm">
        <div className="flex items-center space-x-2 font-semibold">
          <Icon name="Target" size={16} />
          <span>Total: {total}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(IndustryChart);
