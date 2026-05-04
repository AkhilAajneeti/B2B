import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";

const PipelineStats = ({ deals = [] }) => {
  const stats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let scheduled = 0;
    let budget = 0;
    let stale = 0;
    let overdue = 0;

    deals.forEach((deal) => {
      const createdAt = deal?.createdAt
        ? new Date(deal.createdAt.replace(" ", "T"))
        : null;

      const nextContact = deal?.cNextContact
        ? new Date(deal.cNextContact.replace(" ", "T"))
        : null;

      const diffCreatedDays = createdAt
        ? (now - createdAt) / (1000 * 60 * 60 * 24)
        : 0;

      // 1️⃣ Budget Issue
      if (deal.status?.toLowerCase().includes("budget")) {
        budget++;
        return;
      }

      // 2️⃣ Scheduled (future follow up)
      if (nextContact && nextContact > now) {
        scheduled++;
        return;
      }

      // 3️⃣ Overdue
      if (nextContact && nextContact < now) {
        overdue++;
        return;
      }

      // 4️⃣ Stale
      if (diffCreatedDays > 30 && !nextContact) {
        stale++;
        return;
      }

      // 5️⃣ Everything else is Active
      active++;
    });

    return { active, scheduled, budget, stale, overdue };
  }, [deals]);

  const statCards = [
    {
      title: "Active Opportunity",
      value: stats.active,
      icon: "Sparkles",
      color: "bg-indigo-100 text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Scheduled",
      value: stats.scheduled,
      icon: "Calendar",
      color: "bg-blue-100 text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Budget Issue",
      value: stats.budget,
      icon: "AlertTriangle",
      color: "bg-red-100 text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Overdue",
      value: stats.overdue,
      icon: "Clock",
      color: "bg-orange-100 text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Stale (30+ Days)",
      value: stats.stale,
      icon: "Archive",
      color: "bg-gray-100 text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`${stat.bgColor} border border-border rounded-xl p-5`}
        >
          <div className="flex items-start sm:justify-between mb-2 sm:flex-col gap-4">
            <div
              className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}
            >
              <Icon name={stat.icon} size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.title}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default PipelineStats;
