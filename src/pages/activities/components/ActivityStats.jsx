import React, { useMemo } from "react";
import Icon from "../../../components/AppIcon";

const ActivityStats = ({ activities = [] }) => {
  /* =========================
     STATUS HELPERS
  ========================= */
  const ACTIONABLE_TYPES = ["Task", "Meeting"];

  const isActionable = (activity) => {
    return ["Task", "Meeting"].includes(activity.parentType);
  };
  const getActivityStatus = (activity) => {
    if (activity.type === "Create") {
      return activity.data?.statusValue || null;
    }
    if (activity.type === "Update") {
      return activity.data?.value || null;
    }
    if (activity.type === "Post") {
      return activity.data?.value || null;
    }

    return null;
  };

  const getEndDate = (activity) => {
    return activity.data?.attributes?.became?.dateEnd || null;
  };

  const isCompleted = (activity) => {
    if (!isActionable(activity)) return false;

    const status = getActivityStatus(activity);
    return ["Completed", "Held"].includes(status);
  };

  // ✅ TODAY logic
  const isToday = (activity) => {
    if (!isActionable(activity) || isCompleted(activity)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1️⃣ Case: has end date → compare with today
    const endDate = getEndDate(activity);
    if (endDate) {
      const due = new Date(endDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    }

    // 2️⃣ Case: NO end date → use createdAt
    const created = new Date(activity.createdAt);
    created.setHours(0, 0, 0, 0);

    return created.getTime() === today.getTime();
  };

  const isPending = (activity) => {
    if (!isActionable(activity)) return false;

    return !isCompleted(activity) && !isToday(activity);
  };

  /* =========================
     STATS
  ========================= */

  const stats = useMemo(() => {
    const total = activities.length;

    const actionableActivities = activities.filter(isActionable);

    const completed = actionableActivities.filter(isCompleted).length;
    const today = actionableActivities.filter(isToday).length;
    const pending = actionableActivities.filter(isPending).length;

    return { total, completed, pending, today };
  }, [activities]);

  /* =========================
     UI
  ========================= */

  const statCards = [
    {
      label: "Total Activities",
      value: stats.total,
      icon: "Activity",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: "CheckCircle",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: "Clock",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      label: "Today",
      value: stats.today,
      icon: "Calendar",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>

            <div
              className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}
            >
              <Icon name={stat.icon} size={24} className={stat.color} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityStats;
