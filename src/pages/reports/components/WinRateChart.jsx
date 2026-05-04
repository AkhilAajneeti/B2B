import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";

const WinRateChart = ({ data, pieData, summary }) => {
  const [chartType, setChartType] = useState("line");

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0]?.payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-elevation-2">
          <p className="font-medium text-popover-foreground">{label} 2024</p>
          <p className="text-sm text-success">Won: {data?.won} deals</p>
          <p className="text-sm text-error">Lost: {data?.lost} deals</p>
          <p className="text-sm text-muted-foreground">
            Win Rate: {data?.winRate}%
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0];
      const total = pieData?.reduce((sum, item) => sum + item?.value, 0);
      const percentage = ((data?.value / total) * 100)?.toFixed(1);

      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-elevation-2">
          <p className="font-medium text-popover-foreground">{data?.name}</p>
          <p className="text-sm text-muted-foreground">
            {data?.value} deals ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Win Rate Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Monthly win rate trends and distribution
          </p>
        </div>

        <div className="flex items-center space-x-2 pt-3">
          <Button
            variant={chartType === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("line")}
            iconName="TrendingUp"
            iconPosition="left"
          >
            Trend
          </Button>
          <Button
            variant={chartType === "pie" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("pie")}
            iconName="PieChart"
            iconPosition="left"
          >
            Distribution
          </Button>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                domain={[0, 'dataMax + 1']}
                tickFormatter={(value) => `${value}%`}
                width={35}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="winRate"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: "#8B5CF6", strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          ) : (
            <PieChart data={pieData}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                animationDuration={1000}
              >
                {pieData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.fill} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
        {summary && (
          <>
            {/* ✅ Total Won */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-success rounded-full" />
                <span className="text-sm font-medium text-foreground">
                  Total Won
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {summary.totalWon}
              </p>
              <p className="text-xs text-muted-foreground">deals closed</p>
            </div>

            {/* ✅ Total Lost */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-error rounded-full" />
                <span className="text-sm font-medium text-foreground">
                  Total Lost
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {summary.totalLost}
              </p>
              <p className="text-xs text-muted-foreground">deals lost</p>
            </div>

            {/* ✅ Overall Win Rate */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Icon name="Target" size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Win Rate
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {summary.overallWinRate}%
              </p>
              <p className="text-xs text-muted-foreground">this year</p>
            </div>

            {/* ✅ Best Month */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Icon name="TrendingUp" size={16} className="text-success" />
                <span className="text-sm font-medium text-foreground">
                  Best Month
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {summary.bestMonth.winRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.bestMonth.month} 2024
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default WinRateChart;
