// ================================
// Real-time Line Chart Component (Recharts)
// ================================

"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
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

const MAX_DATA_POINTS = 30;

interface DataPoint {
  time: string;
  value: number;
  timestamp: number;
}

export function RealtimeLineChart({ title, unit = "", color = "#3b82f6" }: { title: string; unit?: string; color?: string }) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [currentValue, setCurrentValue] = useState(0);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Initialize with empty data
    const initialData: DataPoint[] = [];
    for (let i = MAX_DATA_POINTS - 1; i >= 0; i--) {
      const time = new Date(Date.now() - i * 3000);
      initialData.push({
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        value: 0,
        timestamp: time.getTime(),
      });
    }
    setData(initialData);

    setData(initialData);

    if (!socket || !isConnected) return;

    let count = 0;

    const handleReceiveMessage = () => {
      count++;
    };

    socket.on("receive-message", handleReceiveMessage);

    // Update every 3 seconds
    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: DataPoint = {
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        value: count,
        timestamp: now.getTime(),
      };

      setCurrentValue(count);
      setData((prev) => {
        const updated = [...prev.slice(1), newPoint];
        return updated;
      });

      count = 0;
    }, 3000);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      clearInterval(interval);
    };
  }, [socket, isConnected]);

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-2xl font-bold text-foreground">
            {currentValue * 20}
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Updating every 3s
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-surface-700" />
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
            formatter={(value: number) => [value, "Messages"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

