import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import KPICard from "./components/KPICard";
import ActivityFunnel from "./components/ActivityFunnel";
import InsightSheet from "./components/InsightSheet";
import DashboardSummaryAlert from "./components/DashboardSummaryAlert";
import { fetchLeads } from "services/leads.service";
import { fetchMeeting } from "services/meeting.service";
import { useLeadsCount } from "hooks/useLeads";
import { useQuery } from "@tanstack/react-query";

// Heavy chart components — lazy so the dashboard shell paints instantly.
// Each chart pulls in recharts + framer-motion + its own per-bucket
// fetch loop; loading them up front blocks first paint. Splitting into
// per-chart chunks lets Vite stream them in parallel, and Suspense
// shows a skeleton in their place until the chunk + first data arrive.
// KPICard and DashboardSummaryAlert stay eager (above the fold).
const PipelineChart = lazy(() => import("./components/PipelineChart"));
const MultiLineChart = lazy(() => import("./components/MultiLineChart"));
const RightRail = lazy(() => import("./components/RightRail"));

// Skeleton placeholder for a chart card — same outer card shape as the
// real chart so there's no layout shift when the real one slots in.
const ChartSkeleton = ({ height = 320 }) => (
  <div className="bg-card border border-border rounded-xl p-4 sm:p-6 animate-pulse">
    <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
    <div className="bg-slate-100 rounded-lg" style={{ height }} />
  </div>
);
const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeInsight, setActiveInsight] = useState(null);
  const [insightData, setInsightData] = useState([]);

  // update by filter

  const getTodayRange = () => {
    const now = new Date();

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  };
  const { start, end } = getTodayRange();
  // ✅ 1. HOOKS FIRST
  const thisMonthQuery = useLeadsCount([
    { type: "currentMonth", attribute: "createdAt" }
  ]);

  const todayQuery = useLeadsCount([
    {
      type: "today",
      attribute: "createdAt",
    },
  ]);

  const interestedQuery = useLeadsCount([
    {
      type: "in",
      attribute: "status",
      value: ["Interested"],
    },
    {
      type: "currentMonth",
      attribute: "createdAt",
    },
  ]);

  const lastMonthQuery = useLeadsCount([
    { type: "lastMonth", attribute: "createdAt" }
  ]);
  // yesterday 
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const yesterdayStart = new Date(yesterdayDate);
  yesterdayStart.setHours(0, 0, 0, 0);

  const yesterdayEnd = new Date(yesterdayDate);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const yesterdayQuery = useLeadsCount([
    {
      type: "between",
      attribute: "createdAt",
      value: [
        yesterdayStart.toISOString(),
        yesterdayEnd.toISOString(),
      ],
      dateTime: true,
    },
  ]);

  const interestedLastMonthQuery = useLeadsCount([
    { type: "lastMonth", attribute: "createdAt" },
    { type: "equals", attribute: "status", value: "Interested" }
  ]);

  // ✅ 2. EXTRACT DATA
  const thisMonth = thisMonthQuery.data || 0;
  const today = todayQuery.data || 0;
  const interested = interestedQuery.data || 0;

  const lastMonth = lastMonthQuery.data || 0;
  const yesterday = yesterdayQuery.data || 0;
  const interestedLastMonth = interestedLastMonthQuery.data || 0;

  // ✅ 3. CALCULATIONS
  const monthGrowth =
    lastMonth === 0
      ? 0
      : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  const todayDiff = today - yesterday;

  const interestedGrowth =
    interestedLastMonth === 0
      ? 0
      : Math.round(
        ((interested - interestedLastMonth) / interestedLastMonth) * 100
      );


  // leads
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: () => fetchLeads({ limit: 200, page: 1 }),

    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,

    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const leads = data?.list || [];

  const { data: meetingData = [] } = useQuery({
    queryKey: ["meetings"],
    queryFn: fetchMeeting
  });

  const meetingsList = meetingData?.list || [];
  const isSameMonth = (date1, date2) => {
    const d1 = new Date(date1);
    return (
      d1.getMonth() === date2.getMonth() &&
      d1.getFullYear() === date2.getFullYear()
    );
  };
  // EspoCRM transports datetimes as "YYYY-MM-DD HH:mm:ss" in UTC.
  // Append Z so JS interprets as UTC, then format/compare in local tz.
  const toLocalDate = (value) => {
    if (!value) return null;
    const s = typeof value === "string" ? value.trim() : value;
    if (typeof s === "string" && s.length > 10) {
      return new Date(`${s.replace(" ", "T")}Z`);
    }
    return new Date(s);
  };
  const formatDate = (date) => {
    if (!date) return "—"; // null / undefined / empty

    const parsedDate = toLocalDate(date);

    if (!parsedDate || isNaN(parsedDate.getTime())) return "—"; // invalid date
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })?.format(parsedDate);
  };
  const formatTime = (value) => {
    if (!value) return "—";

    const date = toLocalDate(value);
    if (!date) return "—";

    if (isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const isToday = (date) => {
    const d = toLocalDate(date);
    if (!d || isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isYesterday = (date) => {
    const d = toLocalDate(date);
    if (!d || isNaN(d.getTime())) return false;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  };
  // calculate
  const now = new Date();

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const meetings = meetingsList.filter((m) => {
    const createdToday =
      m.createdAt &&
      isToday(m.createdAt);

    const scheduledToday =
      m.dateStart &&
      isToday(m.dateStart);

    return createdToday || scheduledToday;
  }).length;

  // Leads whose status was set to "Purchased" today — a closed-won counter.
  const purchased = leads.filter(
    (l) => l.status === "Purchased" && isToday(l.modifiedAt),
  ).length;

  const siteVisits = leads.filter(
    (l) => l.status === "Site Visit Done" && isToday(l.modifiedAt),
  ).length;

  // Leads moved into "Site Visit Scheduled" today — new bookings counter.
  const siteVisitsScheduled = leads.filter(
    (l) => l.status === "Site Visit Scheduled" && isToday(l.modifiedAt),
  ).length;
  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e?.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Opens the drill-down sheet for a funnel stage. Each stage filters a
  // different source (meetings vs. leads-by-status), all scoped to today.
  const openInsight = (key) => {
    let filtered = [];
    if (key === "meetings") {
      filtered = meetingsList
        .filter((m) => {
          const createdToday = m.createdAt && isToday(m.createdAt);
          const scheduledToday = m.dateStart && isToday(m.dateStart);
          return createdToday || scheduledToday;
        })
        .map((m) => {
          const createdToday = m.createdAt && isToday(m.createdAt);
          const scheduledToday = m.dateStart && isToday(m.dateStart);
          return {
            ...m,
            insightType:
              createdToday && scheduledToday
                ? "Created & Scheduled Today"
                : createdToday
                  ? "Created Today"
                  : "Scheduled Today",
          };
        });
    } else if (key === "purchased") {
      filtered = leads.filter(
        (l) => l.status === "Purchased" && isToday(l.modifiedAt),
      );
    } else if (key === "visits") {
      filtered = leads.filter(
        (l) => l.status === "Site Visit Done" && isToday(l.modifiedAt),
      );
    } else if (key === "siteVisitsScheduled") {
      filtered = leads.filter(
        (l) => l.status === "Site Visit Scheduled" && isToday(l.modifiedAt),
      );
    }
    setInsightData(filtered);
    setActiveInsight(key);
  };

  const kpiData = [
    {
      title: "This Month Leads",
      value: thisMonth,
      change: `${monthGrowth}%`,
      changeType: monthGrowth >= 0 ? "positive" : "negative",
      icon: "Users",
      iconBg: "bg-blue-100",
      iconColor: "#3B82F6",
      comparisonLabel: "last month",
    },
    {
      title: "Today Leads",
      value: today,
      // Day-over-day is an absolute count, not a %: daily percentages are too
      // noisy to be meaningful. The "vs yesterday" label marks it as a count.
      change: todayDiff >= 0 ? `+${todayDiff}` : `${todayDiff}`,
      changeType: todayDiff >= 0 ? "positive" : "negative",
      icon: "Calendar",
      iconBg: "bg-green-100",
      iconColor: "#10B981",
      comparisonLabel: "yesterday",
    },
    {
      // Shortened from "Interested Leads (This Month)" — the parenthetical
      // forced a 3-line wrap on the compact card and knocked the number off
      // the row's baseline. "vs last month" already implies the period.
      title: "Interested",
      value: interested,
      change: `${interestedGrowth}%`,
      changeType: interestedGrowth >= 0 ? "positive" : "negative",
      icon: "Star",
      iconBg: "bg-yellow-100",
      iconColor: "#F59E0B",
      comparisonLabel: "last month",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={handleMenuToggle} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
      <main className="lg:ml-64 pt-16">
        <div className="m-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your sales today.
          </p>
        </div>

        {/* Summary alert — overdue + follow-up-today leads. Plays a chime,
            lists clickable leads that open the lead drawer. Tighter mobile
            margin so the inner card has more breathing room. */}
        <div className="mx-2 sm:mx-5">
          <DashboardSummaryAlert />
        </div>

        {/* KPI Cards — responsive by design, never orphans the 3rd card:
              • md+  : 3 equal columns (hero drops to col-span-1)
              • < md : 2-col grid; hero (index 0) spans full width on top,
                       the two secondary metrics share the row below. */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 m-3 sm:m-5">
          {kpiData?.map((kpi, index) => (
            <motion.div
              key={index}
              className={`h-full ${index === 0 ? 'col-span-2 md:col-span-1' : 'col-span-1'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <KPICard {...kpi} featured={index === 0} isLoading={
                thisMonthQuery.isLoading ||
                todayQuery.isLoading ||
                interestedQuery.isLoading
              } />
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-0 xl:pr-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >


              {/* Pipeline Chart — lazy. Suspense shows a skeleton card
                  until the chunk downloads + the chart's first render. */}
              <div className="sm:m-5 py-3">
                <Suspense fallback={<ChartSkeleton />}>
                  <PipelineChart leads={leads} />
                </Suspense>
              </div>
              <div className="sm:m-5 py-3">
                <Suspense fallback={<ChartSkeleton />}>
                  <MultiLineChart leads={leads} />
                </Suspense>
              </div>


              {/* Today's Activity funnel */}
              <div className="sm:m-5 py-3">
                <ActivityFunnel
                  values={{
                    meetings,
                    siteVisitsScheduled,
                    visits: siteVisits,
                    purchased,
                  }}
                  activeInsight={activeInsight}
                  onSelect={openInsight}
                />
                {/* <RecentActivities activities={activities} /> */}
              </div>
              <InsightSheet
                activeInsight={activeInsight}
                data={insightData}
                onClose={() => setActiveInsight(null)}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            </motion.div>
          </div>

          {/* Right Rail — lazy. Contains StatusChart + IndustryChart
              which each fire ~17 and ~30 per-bucket fetches respectively;
              keeping them out of the initial chunk is a big TTI win. */}
          <div className="hidden xl:block max-w-96 p-6 border-l border-border bg-background">
            <Suspense fallback={<ChartSkeleton height={420} />}>
              <RightRail leads={leads} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
