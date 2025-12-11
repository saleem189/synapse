// ================================
// User Activity Line Chart (Recharts)
// ================================

"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useOnlineUsers } from "@/hooks/use-online-users";

const MAX_DATA_POINTS = 30;

interface DataPoint {
  time: string;
  online: number;
  timestamp: number;
}

export function UserActivityLineChart() {
  // Use centralized online users hook
  const { onlineCount } = useOnlineUsers();
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // Initialize with empty data
    const initialData: DataPoint[] = [];
    for (let i = MAX_DATA_POINTS - 1; i >= 0; i--) {
      const time = new Date(Date.now() - i * 2000);
      initialData.push({
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        online: 0,
        timestamp: time.getTime(),
      });
    }
    setData(initialData);
  }, []);

  // Update chart every 2 seconds with current online count
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: DataPoint = {
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        online: onlineCount,
        timestamp: now.getTime(),
      };

      setData((prev) => {
        const updated = [...prev.slice(1), newPoint];
        return updated;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [onlineCount]);

  const maxValue = Math.max(...data.map((d) => d.online), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            User Activity (Real-time)
          </h3>
          <p className="text-2xl font-bold text-foreground">
            {onlineCount}
            <span className="text-sm text-muted-foreground ml-1">online</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradient-green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            domain={[0, maxValue]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px",
            }}
            formatter={(value: number) => [value, "Users Online"]}
          />
          <Area
            type="monotone"
            dataKey="online"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradient-green)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

