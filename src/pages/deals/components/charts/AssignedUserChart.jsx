import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#8B5CF6",
];

const AssignedUserChart = ({ leads = [] }) => {
  const chartData = useMemo(() => {
    const grouped = {};

    leads.forEach((lead) => {
      const fullName = lead.assignedUserName || "Unassigned";
      const firstName = fullName?.trim()?.split(" ")[0];

      const status = lead.status || "Others";

      if (!grouped[firstName]) {
        grouped[firstName] = {
          name: firstName,
          interested: 0,
          notInterested: 0,
          followUp: 0,
          others: 0,
        };
      }

      if (status === "Interested") grouped[firstName].interested += 1;
      else if (status === "Not Interested")
        grouped[firstName].notInterested += 1;
      else if (status === "Follow up") grouped[firstName].followUp += 1;
      else grouped[firstName].others += 1;
    });

    return Object.values(grouped);
  }, [leads]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-6 shadow-elevation-1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold mb-1">Leads by Assigned User</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Lead distribution across sales team
      </p>

      <div className="h-[360px]">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col justify-center gap-4 px-4">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                {/* Y-axis label */}
                <div className="w-16 h-3 bg-gray-200 rounded" />

                {/* Bar skeleton */}
                <div className="flex-1 h-4 bg-gray-200 rounded" />
              </div>
            ))}

            {/* Optional message */}
            <p className="text-center text-sm text-gray-400 mt-4">
              No data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />

              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 12 }}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "10px",
                  border: "none",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                }}
              />
              <Legend />

              <Bar
                dataKey="interested"
                stackId="a"
                fill="#22C55E"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="followUp"
                stackId="a"
                fill="#F59E0B"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="notInterested"
                stackId="a"
                fill="#EF4444"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="others"
                stackId="a"
                fill="#6366F1"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border text-sm font-semibold">
        Total Leads: {total}
      </div>
    </motion.div>
  );
};

export default AssignedUserChart;
