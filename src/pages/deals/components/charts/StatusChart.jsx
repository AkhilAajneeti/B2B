import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import Button from "components/ui/Button";

const COLORS = {
  Active: "#6366F1",
  Converted: "#22C55E",
  Lost: "#F43F5E",
  Invalid: "#94A3B8",
};

const StatusChart = ({ leads = [] }) => {
  const [viewType, setViewType] = useState("monthly");
  const isMobile = window.innerWidth < 640;
  const mapStatusToGroup = (status) => {
    const active = [
      "New",
      "Follow up",
      "Call Later",
      "Interested",
      "Site Visit Scheduled",
    ];

    const converted = ["Site Visit Done", "Purchased"];

    const lost = [
      "Dead",
      "Not Interested",
      "Low Budget",
      "Low Interest",
      "Other Location",
    ];

    const invalid = [
      "Fake Lead",
      "Invalid Number",
      "Switch Off",
      "Call Not Picked",
      "Call Not Connecting",
      "Broker",
    ];

    if (active.includes(status)) return "Active";
    if (converted.includes(status)) return "Converted";
    if (lost.includes(status)) return "Lost";
    if (invalid.includes(status)) return "Invalid";

    return "Invalid";
  };
  const chartData = useMemo(() => {
    const now = new Date();

    if (viewType === "daily") {
      const days = [...Array(7)].map((_, i) => {
        const day = new Date();
        day.setDate(now.getDate() - (6 - i));

        const dayName = day.toLocaleDateString("en-IN", {
          weekday: "short",
        });

        const dayLeads = leads.filter(
          (l) => new Date(l.createdAt).toDateString() === day.toDateString(),
        );

        const grouped = {
          Active: 0,
          Converted: 0,
          Lost: 0,
          Invalid: 0,
        };

        dayLeads.forEach((lead) => {
          const group = mapStatusToGroup(lead.status);
          grouped[group] += 1;
        });

        return {
          label: dayName,
          ...grouped,
        };
      });

      return days;
    }

    // MONTHLY VIEW (Jan–Dec)
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

    const year = now.getFullYear();

    return months.map((month, index) => {
      const monthLeads = leads.filter((l) => {
        const d = new Date(l.createdAt);
        return d.getFullYear() === year && d.getMonth() === index;
      });

      const grouped = {
        Active: 0,
        Converted: 0,
        Lost: 0,
        Invalid: 0,
      };

      monthLeads.forEach((lead) => {
        const group = mapStatusToGroup(lead.status);
        grouped[group] += 1;
      });

      return {
        label: month,
        ...grouped,
      };
    });
  }, [leads, viewType]);

  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-6 shadow-elevation-1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Status Trend (Line)</h3>
          <p className="text-sm text-muted-foreground">
            Status movement over time
          </p>
        </div>

        <div className="flex space-x-2 mt-5">
          {["monthly", "weekly", "daily"].map((type) => (
            <Button
              key={type}
              size="sm"
              variant={viewType === type ? "default" : "outline"}
              onClick={() => setViewType(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={
              isMobile
                ? { top: 0, right: 0, left: 0, bottom: 5 }
                : { top: 20, right: 30, left: 20, bottom: 5 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis width={35}
              allowDecimals={false}
              domain={[0, "dataMax + 1"]}/>
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="Active"
              stroke={COLORS.Active}
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Converted"
              stroke={COLORS.Converted}
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Lost"
              stroke={COLORS.Lost}
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Invalid"
              stroke={COLORS.Invalid}
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default StatusChart;
