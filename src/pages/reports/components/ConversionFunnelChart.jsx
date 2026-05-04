import React from "react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

const ConversionFunnelChart = ({ data, isLoading }) => {
  // Small-multiple sparkline data for different reps/stages
  const SparklineTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-popover border border-border rounded px-2 py-1 text-xs shadow-sm">
          <span className="text-popover-foreground">
            {payload?.[0]?.value}%
          </span>
        </div>
      );
    }
    return null;
  };
  const emptyTrend = Array.from({ length: 8 }, (_, i) => ({
    period: `W${i + 1}`,
    value: 0,
  }));
  const SkeletonCard = () => (
    <div className="bg-muted/20 rounded-lg p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-gray-300/70 rounded"></div>
          <div className="h-2 w-16 bg-gray-300/50 rounded"></div>
        </div>
        <div className="space-y-2 text-right">
          <div className="h-4 w-10 bg-gray-300/70 rounded"></div>
          <div className="h-2 w-8 bg-gray-300/50 rounded"></div>
        </div>
      </div>

      <div className="h-12 bg-gray-300/50 rounded"></div>

      <div className="flex justify-between mt-3">
        <div className="h-2 w-16 bg-gray-300/50 rounded"></div>
        <div className="h-2 w-20 bg-gray-300/50 rounded"></div>
      </div>
    </div>
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Conversion performance
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto ">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : !data?.length ? (
          <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm col-span-3">
            No conversion data available
          </div>
        ) : (
          data?.map((rep, index) => {
            const hasData = rep?.trend?.some((t) => t.value > 0);
            return (
              <motion.div
                key={rep?.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                className="bg-muted/20 rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {rep?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{rep?.role}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-lg font-semibold text-foreground">
                      {rep?.current}%
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        rep?.positive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {rep?.change}
                    </p>
                  </div>
                </div>

                <div className="h-12 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hasData ? rep?.trend : emptyTrend}>
                      <Tooltip content={<SparklineTooltip />} cursor={false} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={hasData ? rep?.color : "#d1d5db"}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 3,
                          fill: hasData ? rep?.color : "#d1d5db",
                          strokeWidth: 0,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: rep?.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      8W Trend
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rep?.trend?.[0]?.value}% →{" "}
                    {rep?.trend?.[rep?.trend?.length - 1]?.value}%
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default ConversionFunnelChart;
