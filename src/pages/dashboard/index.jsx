import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import KPICard from "./components/KPICard";
import PipelineChart from "./components/PipelineChart";
import Icon from "../../components/AppIcon";
import RightRail from "./components/RightRail";
import { fetchLeads } from "services/leads.service";
import MultiLineChart from "./components/MultiLineChart";
import { fetchMeeting } from "services/meeting.service";
import Button from "../../components/ui/Button";
import { useLeadsCount } from "hooks/useLeads";
import { useQuery } from "@tanstack/react-query";
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

  const yesterdayQuery = useLeadsCount([
    { type: "yesterday", attribute: "createdAt" }
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
    queryKey: ["leads"],
    queryFn: fetchLeads({ limit: 1000, page: 0 })
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
  const formatDate = (date) => {
    if (!date) return "—"; // null / undefined / empty

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) return "—"; // invalid date
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })?.format(new Date(date));
  };
  const formatTime = (value) => {
    if (!value) return "—";

    const safe = value.replace(" ", "T"); // EspoCRM fix
    const date = new Date(safe);

    if (isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const isToday = (date) => {
    const d = new Date(date);
    const now = new Date();
    return (
      d.toDateString() === now.toDateString() &&
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isYesterday = (date) => {
    const d = new Date(date);
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
      isToday(m.createdAt.replace(" ", "T"));

    const scheduledToday =
      m.dateStart &&
      isToday(m.dateStart.replace(" ", "T"));

    return createdToday || scheduledToday;
  }).length;

  const proposals = leads.filter(
    (l) => l.status === "Proposal Shared" && isToday(l.modifiedAt),
  ).length;

  const siteVisits = leads.filter(
    (l) => l.status === "Site Visit Done" && isToday(l.modifiedAt),
  ).length;

  const closedDeals = leads.filter(
    (l) => l.status === "Deal Closed" && isToday(l.modifiedAt),
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

  const kpiData = [
    {
      title: "This Month Leads",
      value: thisMonth,
      change: `${monthGrowth}%`,
      changeType: monthGrowth >= 0 ? "positive" : "negative",
      icon: "Users",
      iconBg: "bg-blue-100",
      iconColor: "#3B82F6",
      comparisonLabel: "compared to last month",
    },
    {
      title: "Today Leads",
      value: today,
      change: todayDiff >= 0 ? `+${todayDiff}` : `${todayDiff}`,
      changeType: todayDiff >= 0 ? "positive" : "negative",
      icon: "Calendar",
      iconBg: "bg-green-100",
      iconColor: "#10B981",
      comparisonLabel: "since yesterday",
    },
    {
      title: "Interested Leads (This Month)",
      value: interested,
      change: `${interestedGrowth}%`,
      changeType: interestedGrowth >= 0 ? "positive" : "negative",
      icon: "Star",
      iconBg: "bg-yellow-100",
      iconColor: "#F59E0B",
      comparisonLabel: "compared to last month",
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 m-3 sm:m-5">
          {kpiData?.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <KPICard {...kpi} isLoading={
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


              {/* Pipeline Chart */}
              <div className="sm:m-5 py-3">
                <PipelineChart leads={leads} />
              </div>
              <div className="sm:m-5 py-3">
                <MultiLineChart leads={leads} />
              </div>


              {/* Recent Activities */}
              <div className="sm:m-5 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Meetings Held */}
                  <div
                    onClick={() => {
                      const filtered = meetingsList
                        .filter((m) => {
                          const createdToday =
                            m.createdAt &&
                            isToday(m.createdAt.replace(" ", "T"));

                          const scheduledToday =
                            m.dateStart &&
                            isToday(m.dateStart.replace(" ", "T"));

                          return createdToday || scheduledToday;
                        })
                        .map((m) => {
                          const createdToday =
                            m.createdAt &&
                            isToday(m.createdAt.replace(" ", "T"));

                          const scheduledToday =
                            m.dateStart &&
                            isToday(m.dateStart.replace(" ", "T"));

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

                      setInsightData(filtered);
                      setActiveInsight("meetings");
                    }}
                    className="cursor-pointer bg-blue-50 border border-blue-100 rounded-2xl p-6 
  hover:shadow-lg transition-all duration-300 
  flex items-center justify-between min-h-[110px]"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                        Meetings Scheduling
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {meetings}
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Icon
                        name="Calendar"
                        size={22}
                        className="text-blue-600"
                      />
                    </div>
                  </div>

                  {/* Proposals Shared */}
                  <div
                    onClick={() => {
                      const filtered = leads.filter(
                        (l) =>
                          l.status === "Proposal Shared" &&
                          isToday(l.modifiedAt),
                      );

                      setInsightData(filtered);
                      setActiveInsight("proposals");
                    }}
                    className="cursor-pointer bg-purple-50 border border-purple-100 rounded-2xl p-6 
hover:shadow-lg transition-all duration-300 flex items-center justify-between min-h-[110px]"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-wide text-purple-700 uppercase">
                        Total Proposals
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {proposals}
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Icon
                        name="FileText"
                        size={22}
                        className="text-purple-600"
                      />
                    </div>
                  </div>

                  {/* Site Visits */}
                  <div
                    onClick={() => {
                      const filtered = leads.filter(
                        (l) =>
                          l.status === "Site Visit Done" &&
                          isToday(l.modifiedAt),
                      );

                      setInsightData(filtered);
                      setActiveInsight("visits");
                    }}
                    className="cursor-pointer bg-amber-50 border border-amber-100 rounded-2xl p-6 
hover:shadow-lg transition-all duration-300 flex items-center justify-between min-h-[110px]"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-wide text-amber-700 uppercase">
                        Site Visits
                      </p>
                      <p className="text-3xl font-bold text-amber-600">
                        {siteVisits}
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Icon
                        name="MapPin"
                        size={22}
                        className="text-amber-600"
                      />
                    </div>
                  </div>

                  {/* Deals Closed */}
                  <div
                    onClick={() => {
                      const filtered = leads.filter(
                        (l) =>
                          l.status === "Lead Closed" && isToday(l.modifiedAt),
                      );

                      setInsightData(filtered);
                      setActiveInsight("deals");
                    }}
                    className="cursor-pointer bg-green-50 border border-green-100 rounded-2xl p-6 
hover:shadow-lg transition-all duration-300 flex items-center justify-between min-h-[110px]"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-wide text-green-700 uppercase">
                        Client Onboarded
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {closedDeals}
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Icon
                        name="CheckCircle"
                        size={22}
                        className="text-green-600"
                      />
                    </div>
                  </div>
                </div>
                {/* <RecentActivities activities={activities} /> */}
              </div>
              {activeInsight && (
                <div className="m-5 bg-card border border-border rounded-lg overfl ow-hidden">
                  {/* Header */}
                  <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/40">
                    <h3 className="text-base font-semibold text-foreground">
                      {activeInsight === "meetings" && "Today's Meetings"}
                      {activeInsight === "proposals" && "Proposal Shared Leads"}
                      {activeInsight === "visits" && "Site Visits"}
                      {activeInsight === "deals" && "Closed Deals"}
                    </h3>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveInsight(null)}
                    >
                      Close
                    </Button>
                  </div>

                  {insightData.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      No records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium">
                              Name
                            </th>

                            {activeInsight === "meetings" ? (
                              <>
                                <th className="text-left px-6 py-3 text-sm font-medium">
                                  Join URL
                                </th>
                                <th className="text-left px-6 py-3 text-sm font-medium">
                                  Start
                                </th>
                                <th className="text-left px-6 py-3 text-sm font-medium">
                                  End
                                </th>
                                <th className="text-left px-6 py-3 text-sm font-medium">
                                  Type
                                </th>
                              </>
                            ) : (
                              <>
                                <th className="text-left px-6 py-3 text-sm font-medium">
                                  Assigned User
                                </th>
                                <th className="text-left px-6 py-3 text-sm font-medium">
                                  Created By
                                </th>
                                <th className="text-left px-6 py-3 text-sm font-medium">
                                  Created
                                </th>
                              </>
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                          {insightData.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-muted/30 transition"
                            >
                              {/* Name */}
                              <td className="px-6 py-4">
                                <div className="font-medium text-foreground">
                                  {item.name}
                                </div>
                              </td>

                              {/* Dynamic Column */}
                              {activeInsight === "meetings" ? (
                                <>
                                  <td className="px-6 py-4">
                                    {item.joinUrl ? (
                                      <div className="flex items-center gap-2 max-w-xs">
                                        <a
                                          href={item.joinUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary text-sm truncate hover:underline"
                                        >
                                          {item.joinUrl}
                                        </a>

                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              item.joinUrl,
                                            );
                                          }}
                                          className="p-1 rounded hover:bg-muted transition"
                                        >
                                          <Icon name="Copy" size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </td>

                                  <td className="px-6 py-4 text-sm">
                                    {formatTime(item.dateStart)}
                                  </td>

                                  <td className="px-6 py-4 text-sm">
                                    {formatTime(item.dateEnd)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${item.insightType === "Created Today"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                                        }`}
                                    >
                                      {item.insightType}
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-6 py-4 text-sm">
                                    {item.assignedUserName || "—"}
                                  </td>

                                  <td className="px-6 py-4 text-sm">
                                    {item.createdByName || "—"}
                                  </td>

                                  <td className="px-6 py-4 text-sm">
                                    {formatDate(item.createdAt)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Rail */}
          <div className="hidden xl:block max-w-96 p-6 border-l border-border bg-background">
            <RightRail leads={leads} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
