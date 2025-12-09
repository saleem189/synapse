// ================================
// Message Activity Chart Component (Recharts)
// ================================

"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { useSocket } from "@/hooks/use-socket";

interface DataPoint {
  minute: string;
  messages: number;
  time: string;
}

export function MessageActivityChart() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [liveMessages, setLiveMessages] = useState(0);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Initialize with 24 empty data points (one per minute)
    const initialData: DataPoint[] = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60000);
      initialData.push({
        minute: `${23 - i}`,
        messages: 0,
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
    setData(initialData);

    setData(initialData);

    if (!socket || !isConnected) return;

    let messageCount = 0;

    const handleReceiveMessage = () => {
      messageCount++;
      setLiveMessages(messageCount);
    };

    socket.on("receive-message", handleReceiveMessage);

    // Update chart every minute
    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: DataPoint = {
        minute: "23",
        messages: messageCount,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setData((prev) => {
        const updated = [...prev.slice(1), newPoint];
        return updated;
      });

      messageCount = 0;
      setLiveMessages(0);
    }, 60000);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      clearInterval(interval);
    };
  }, [socket, isConnected]);

  // Update current minute with live messages
  const dataWithLive = data.map((point, index) => {
    if (index === data.length - 1) {
      return { ...point, messages: point.messages + liveMessages };
    }
    return point;
  });

  const maxMessages = Math.max(...dataWithLive.map((d) => d.messages), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            Message Activity
          </h3>
          <p className="text-sm text-surface-500">Last 24 minutes (1 bar = 1 minute)</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
          <span className="text-surface-500">
            Live: <span className="font-semibold text-primary-600 dark:text-primary-400">{liveMessages}</span> msgs
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dataWithLive} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-surface-700" />
          <XAxis
            dataKey="minute"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(value) => {
              const minutesAgo = 23 - parseInt(value);
              // Only show labels for every 5 minutes or at the start/end
              if (minutesAgo % 5 === 0 || minutesAgo === 0 || minutesAgo === 23) {
                return `${minutesAgo}m`;
              }
              return "";
            }}
            label={{ value: "Minutes ago", position: "insideBottom", offset: -5, fill: "#6b7280" }}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            label={{ value: "Messages", angle: -90, position: "insideLeft", fill: "#6b7280" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px",
            }}
            formatter={(value: number) => [value, "Messages"]}
            labelFormatter={(label) => `${23 - parseInt(label)} minutes ago`}
          />
          <Bar
            dataKey="messages"
            radius={[8, 8, 0, 0]}
            label={((props: unknown) => {
              // Type assertion for Recharts label props
              const labelProps = props as { value?: number | string; x?: number; y?: number; width?: number; height?: number };
              // Only show label if value is greater than 0
              const value = typeof labelProps.value === 'number' ? labelProps.value : 0;
              if (value > 0 && labelProps.x !== undefined && labelProps.y !== undefined && labelProps.width !== undefined) {
                return (
                  <text
                    x={labelProps.x + labelProps.width / 2}
                    y={labelProps.y - 5}
                    fill="#6b7280"
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={500}
                  >
                    {value}
                  </text>
                );
              }
              return null;
            }) as never}
          >
            {dataWithLive.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  index === dataWithLive.length - 1
                    ? "#3b82f6" // Primary blue for current minute
                    : entry.messages > 0
                      ? "#60a5fa" // Lighter blue for past
                      : "#e5e7eb" // Gray for empty
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

