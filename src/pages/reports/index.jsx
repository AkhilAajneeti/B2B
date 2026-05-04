import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import MetricsCard from "./components/MetricsCard";
import FilterControls from "./components/FilterControls";
import ConversionFunnelChart from "./components/ConversionFunnelChart";
import WinRateChart from "./components/WinRateChart";
import TablePagination from "./components/TablePagination";
import { fetchSources, fetchStatus } from "services/others.service";
import Button from "components/ui/Button";
import Icon from "../../components/AppIcon";
import DealsTable from "./components/DealsTable";
import { fetchLeads } from "services/leads.service";

const Reports = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [source, setSource] = useState([]);
  const [status, setStatus] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    days: "",
    source: "",
    assignUser: "",
    closeDateFrom: "",
    closeDateTo: "",
  });

    useEffect(() => {
    const loadSource = async () => {
      try {
        const data = await fetchSources();
        setSource(data.options || []);
        // console.log(data.list);
      } catch (error) {
        console.log("failed to fetch data", error);
      } finally {
        
      }
    };
    loadSource();
  }, []);

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "",
      days: "",
      source: "",
      assignUser: "",
      closeDateFrom: "",
      closeDateTo: "",
    });
    setCurrentPage(1);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };
  const handleSelectDeal = (dealId, isSelected) => {
    if (isSelected) {
      setSelectedDeals([...selectedDeals, dealId]);
    } else {
      setSelectedDeals(selectedDeals?.filter((id) => id !== dealId));
    }
  };
  const handleFiltersChange = (newFilters) => {
    setIsLoading(true);
    setFilters(newFilters);

    // Simulate data loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Close sidebar on route change or outside click
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  // fetch status
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await fetchStatus();
        setStatus(data.options || []);
        console.log(data.list);
      } catch (error) {
        console.log("failed to fetch data", error);
      } finally {
      }
    };
    loadStatus();
  }, []);
  useEffect(() => {
    const loadContact = async () => {
      try {
        const data = await fetchLeads();
        setLeads(data.list);
        console.log(data.list);
      } catch (error) {
        console.log("failed to fetch data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadContact();
  }, []);

  const isWithinSelectedDays = (createdAt, selectedDay) => {
    if (!selectedDay) return true;

    const createdDate = new Date(createdAt?.replace(" ", "T"));
    const today = new Date();

    // Reset time for accurate comparison
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(createdDate);
    compareDate.setHours(0, 0, 0, 0);

    const diffInDays = (today - compareDate) / (1000 * 60 * 60 * 24);

    switch (selectedDay) {
      case "Today":
        return diffInDays === 0;

      case "Yesterday":
        return diffInDays === 1;

      case "Last 3 Days":
        return diffInDays >= 0 && diffInDays <= 2;

      case "Last 7 Days":
        return diffInDays >= 0 && diffInDays <= 6;

      case "Current Month":
        return (
          createdDate.getMonth() === today.getMonth() &&
          createdDate.getFullYear() === today.getFullYear()
        );

      default:
        return true;
    }
  };

  // Filter and sort deals
  const filteredAndSortedDeals = useMemo(() => {
    let filtered = leads?.filter((deal) => {
      const search = filters?.search?.toLowerCase();

      const matchesSearch =
        !search ||
        deal?.name?.toLowerCase()?.includes(search) ||
        deal?.emailAddress?.toLowerCase()?.includes(search) ||
        deal?.phoneNumber?.includes(search) ||
        deal?.accountName?.toLowerCase()?.includes(search);

      const matchesStatus =
        !filters?.status || deal?.status === filters?.status;

      const matchesSource =
        !filters?.source || deal?.source === filters?.source;

      const matchesDays =
        !filters?.days || isWithinSelectedDays(deal?.createdAt, filters?.days);

      const matchesAssignUser =
        !filters?.assignUser || deal?.assignedUserId === filters?.assignUser;

      const matchesCreatedFrom =
        !filters?.closeDateFrom ||
        new Date(deal?.createdAt?.replace(" ", "T")) >=
          new Date(filters?.closeDateFrom);

      const matchesCreatedTo =
        !filters?.closeDateTo ||
        new Date(deal?.createdAt?.replace(" ", "T")) <=
          new Date(filters?.closeDateTo);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSource &&
        matchesAssignUser &&
        matchesCreatedFrom &&
        matchesCreatedTo &&
        matchesDays
      );
    });

    // ✅ SAFE SORTING
    if (sortConfig?.key) {
      filtered.sort((a, b) => {
        let aValue = a?.[sortConfig.key];
        let bValue = b?.[sortConfig.key];

        if (sortConfig.key === "opportunityAmount") {
          aValue = Number(aValue ?? 0);
          bValue = Number(bValue ?? 0);
        } else if (sortConfig.key === "createdAt") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [leads, filters, sortConfig]);
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };
  const totalPages = Math.ceil(filteredAndSortedDeals?.length / itemsPerPage);
  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig?.key === key && prevConfig?.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const metricsData = useMemo(() => {
    const countByStatus = (data, statusName) =>
      data?.filter((deal) => deal?.status === statusName)?.length || 0;

    const calculateGrowth = (current, previous) => {
      if (!previous) return "0%";
      const growth = ((current - previous) / previous) * 100;
      return growth.toFixed(1) + "%";
    };

    // 🔥 IMPORTANT CHANGE
    const currentMonthLeads = filteredAndSortedDeals;
    const lastMonthLeads = []; // ya same rakhna ho to filteredAndSortedDeals

    const buildMetric = (title, statusName, icon, iconColor, description) => {
      const current = countByStatus(currentMonthLeads, statusName);
      const previous = countByStatus(lastMonthLeads, statusName);
      const growth = calculateGrowth(current, previous);

      return {
        title,
        value: current,
        change: growth,
        changeType: parseFloat(growth) >= 0 ? "positive" : "negative",
        icon,
        iconColor,
        description,
      };
    };

    return [
      buildMetric(
        "Follow Up",
        "Follow up",
        "TrendingUp",
        "bg-success",
        "Leads awaiting action",
      ),
      buildMetric(
        "Call Not Picked",
        "Call Not Picked",
        "PhoneOff",
        "bg-primary",
        "Leads not reachable on call",
      ),
      buildMetric(
        "Call Later",
        "Call Later",
        "Clock",
        "bg-purple-400",
        "Leads scheduled for future follow-up",
      ),
      buildMetric(
        "Not Interested",
        "Not Interested",
        "XCircle",
        "bg-red-400",
        "Leads marked as not interested",
      ),
    ];
  }, [filteredAndSortedDeals]);

  const repConversionData = useMemo(() => {
    if (!filteredAndSortedDeals?.length) return [];

    const WON_STATUSES = ["Converted"];

    const weeksToShow = 8;
    const now = new Date();

    // ✅ Proper Monday-based week start (00:00:00 safe)
    const getWeekStart = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    };

    // ✅ Generate last 8 weeks properly
    const weekStarts = [];
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i * 7);
      weekStarts.push(getWeekStart(date));
    }

    const grouped = {};

    filteredAndSortedDeals.forEach((lead) => {
      if (!lead.createdAt || !lead.assignedUserId) return;

      const leadDate = new Date(lead.createdAt.replace(" ", "T"));
      const repId = lead.assignedUserId;
      const repName = lead.assignedUserName || "Unknown";

      if (!grouped[repId]) {
        grouped[repId] = {
          id: repId,
          name: repName,
          role: "Sales Rep",
          trend: weekStarts.map((weekStart) => ({
            weekStart,
            deals: 0,
            won: 0,
          })),
        };
      }

      grouped[repId].trend.forEach((weekObj) => {
        const weekEnd = new Date(weekObj.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        if (leadDate >= weekObj.weekStart && leadDate <= weekEnd) {
          // ✅ Efficiency Mode (counts ALL leads)
          weekObj.deals += 1;

          if (WON_STATUSES.includes(lead.status)) {
            weekObj.won += 1;
          }
        }
      });
    });

    return Object.values(grouped).map((rep, index) => {
      const trend = rep.trend.map((week, i) => ({
        period: `W${i + 1}`,
        value: week.deals
          ? Number(((week.won / week.deals) * 100).toFixed(1))
          : 0,
      }));

      // ✅ Week-over-week growth (last vs previous)
      const last = trend[trend.length - 1]?.value || 0;
      const prev = trend[trend.length - 2]?.value || 0;
      const growth = Number((last - prev).toFixed(1));

      // ✅ 8 week average (better KPI)
      const average = trend.reduce((sum, t) => sum + t.value, 0) / trend.length;

      return {
        id: rep.id,
        name: rep.name,
        role: rep.role,
        trend,
        current: Number(average.toFixed(1)), // shows 8-week avg
        change: `${growth >= 0 ? "+" : ""}${growth}%`,
        positive: growth >= 0,
        color: [
          "#10B981",
          "#8B5CF6",
          "#06B6D4",
          "#F59E0B",
          "#EC4899",
          "#84CC16",
        ][index % 6],
      };
    });
  }, [filteredAndSortedDeals]);

  const monthlyWinRateData = useMemo(() => {
    if (!filteredAndSortedDeals?.length) return [];

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // 🔥 Step 1: Pre-create all 12 months with 0 values
    const grouped = months.reduce((acc, month) => {
      acc[month] = {
        month,
        deals: 0,
        won: 0,
        lost: 0,
        winRate: 0,
      };
      return acc;
    }, {});

    // 🔥 Step 2: Fill actual data
    filteredAndSortedDeals.forEach((lead) => {
      if (!lead.createdAt) return;

      const date = new Date(lead.createdAt.replace(" ", "T"));
      const monthName = months[date.getMonth()];

      grouped[monthName].deals += 1;

      if (lead.status === "Converted") {
        grouped[monthName].won += 1;
      }

      if (["Not Interested", "Dead"].includes(lead.status)) {
        grouped[monthName].lost += 1;
      }
    });

    // 🔥 Step 3: Calculate winRate for ALL months
    return months.map((month) => {
      const item = grouped[month];

      return {
        ...item,
        winRate: item.deals
          ? Number(((item.won / item.deals) * 100).toFixed(1))
          : 0,
      };
    });
  }, [filteredAndSortedDeals]);

  const pieData = useMemo(() => {
    const won = filteredAndSortedDeals.filter(
      (l) => l.status === "Interested",
    ).length;
    const newLead = filteredAndSortedDeals.filter(
      (l) => l.status === "New",
    ).length;
    const Sitevisit = filteredAndSortedDeals.filter(
      (l) => l.status === "Site Visit Scheduled",
    ).length;

    const lost = leads.filter((l) =>
      ["Not Interested", "Dead", "Low Budget"].includes(l.status),
    ).length;

    return [
      { name: "Interested", value: won, fill: "#10B981" },
      { name: "Lost", value: lost, fill: "#EF4444" },
      { name: "New Leads", value: newLead, fill: "#a3d9a5" },
      { name: "Site Visit Scheduled", value: Sitevisit, fill: "#06B6D4" },
    ];
  }, [filteredAndSortedDeals]);

  const monthlyInsights = useMemo(() => {
    if (!filteredAndSortedDeals?.length) return null;

    const WON_STATUSES = ["Converted"];

    const monthly = {};

    filteredAndSortedDeals.forEach((lead) => {
      if (!lead.createdAt) return;

      const date = new Date(lead.createdAt.replace(" ", "T"));
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthly[monthKey]) {
        monthly[monthKey] = {
          month: date.toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
          total: 0,
          won: 0,
        };
      }

      monthly[monthKey].total += 1;

      if (WON_STATUSES.includes(lead.status)) {
        monthly[monthKey].won += 1;
      }
    });

    const results = Object.values(monthly).map((m) => ({
      ...m,
      winRate: m.total ? Number(((m.won / m.total) * 100).toFixed(1)) : 0,
    }));

    if (!results.length) return null;

    const bestMonth = results.reduce((prev, current) =>
      current.winRate > prev.winRate ? current : prev,
    );

    const totalDeals = results.reduce((sum, m) => sum + m.total, 0);
    const totalWon = results.reduce((sum, m) => sum + m.won, 0);

    const overallWinRate = totalDeals
      ? Number(((totalWon / totalDeals) * 100).toFixed(1))
      : 0;

    return {
      bestMonth,
      overallWinRate,
      totalDeals,
    };
  }, [filteredAndSortedDeals]);
  const summary = useMemo(() => {
    if (!monthlyWinRateData?.length) return null;

    let totalWon = 0;
    let totalLost = 0;

    monthlyWinRateData.forEach((month) => {
      totalWon += month.won;
      totalLost += month.lost;
    });

    const totalDeals = totalWon + totalLost;

    const overallWinRate = totalDeals
      ? Number(((totalWon / totalDeals) * 100).toFixed(1))
      : 0;

    const bestMonth = monthlyWinRateData.reduce((prev, current) =>
      current.winRate > prev.winRate ? current : prev,
    );

    return {
      totalWon,
      totalLost,
      overallWinRate,
      bestMonth,
    };
  }, [monthlyWinRateData]);
  return (
    <>
      <Helmet>
        <title>CRM Reports</title>
        <meta
          name="description"
          content="Comprehensive sales analytics with interactive visualizations and export capabilities for data-driven decision making"
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header
          onMenuToggle={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
        />
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />

        <main className="lg:ml-64 pt-16">
          <div className="p-4 lg:p-8">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Reports & Analytics
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Comprehensive sales insights and performance metrics
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    <span>Live data</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Key Metrics Cards */}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8"
            >
              {metricsData?.map((metric, index) => (
                <MetricsCard
                  key={metric?.title}
                  title={metric?.title}
                  value={metric?.value}
                  change={metric?.change}
                  changeType={metric?.changeType}
                  icon={metric?.icon}
                  iconColor={metric?.iconColor}
                  description={metric?.description}
                />
              ))}
            </motion.div>

            {/* Filter Controls */}
            <FilterControls
              filters={filters}
              status={status}
              source={source}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              dealCount={filteredAndSortedDeals?.length}
              selectedCount={selectedDeals?.length}
              toggleAnalytics={() => setShowAnalytics((prev) => !prev)}
            />

            {/* Charts Grid */}
            {showAnalytics && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Report Analytics</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAnalytics((prev) => !prev)}
                  >
                    <Icon name="X" size={20} />
                  </Button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                  {/* Conversion Funnel */}
                  <ConversionFunnelChart
                    data={repConversionData}
                    isLoading={isLoading}
                  />

                  {/* Win Rate Analytics */}
                  <WinRateChart
                    data={monthlyWinRateData}
                    pieData={pieData}
                    summary={summary}
                  />
                </div>
              </>
            )}
            {/* table */}
            <DealsTable
              deals={filteredAndSortedDeals}
              sortConfig={sortConfig}
              onSelectDeal={handleSelectDeal}
              onSort={handleSort}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              isLoading={isLoading}
            />
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedDeals?.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />

            {/* Revenue Forecasting - Full Width */}
            {/* <div className="mb-8">
              
              <RevenueChart />
            </div> */}

            {/* Export Controls */}
            {/* <ExportControls /> */}

            {/* Additional Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 bg-card border border-border rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Key Insights
              </h3>

              {monthlyInsights && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* ✅ Best Month */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">
                      Top Performing Month
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {monthlyInsights.bestMonth.month} achieved the highest win
                      rate at {monthlyInsights.bestMonth.winRate}% with{" "}
                      {monthlyInsights.bestMonth.won} deals closed
                    </p>
                  </div>

                  {/* ✅ Overall Win Rate */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">
                      Overall Conversion Rate
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      The team closed {monthlyInsights.totalDeals} leads with an
                      overall win rate of {monthlyInsights.overallWinRate}%
                    </p>
                  </div>

                  {/* ✅ Improvement Suggestion */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">
                      Conversion Opportunity
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Increasing win rate by just 5% could significantly improve
                      monthly performance.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Reports;
