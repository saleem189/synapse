// ================================
// Real-time Chart Component
// ================================
// Shows live message activity

"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/hooks/use-socket";

const MAX_DATA_POINTS = 20;

interface DataPoint {
  time: string;
  count: number;
}

export function RealtimeChart() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [messagesPerMinute, setMessagesPerMinute] = useState(0);
  const countRef = useRef(0);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Initialize with empty data
    const initialData: DataPoint[] = [];
    for (let i = MAX_DATA_POINTS - 1; i >= 0; i--) {
      const time = new Date(Date.now() - i * 3000);
      initialData.push({
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        count: 0,
      });
    }
    setDataPoints(initialData);

    // Listen for messages
    const handleReceiveMessage = () => {
      countRef.current += 1;
    };

    socket.on("receive-message", handleReceiveMessage);

    // Update chart every 3 seconds
    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: DataPoint = {
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        count: countRef.current,
      };

      setMessagesPerMinute(countRef.current * 20); // Approximate per minute
      countRef.current = 0;

      setDataPoints((prev) => {
        const newData = [...prev.slice(1), newPoint];
        return newData;
      });
    }, 3000);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      clearInterval(interval);
    };
  }, [socket, isConnected]);

  // Calculate max for scaling
  const maxCount = Math.max(...dataPoints.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-foreground">
            {messagesPerMinute}
          </p>
          <p className="text-sm text-muted-foreground">msgs/min (approx)</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Updating every 3s
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 flex items-end gap-1">
        {dataPoints.map((point, index) => {
          const height = maxCount > 0 ? (point.count / maxCount) * 100 : 0;
          const isLast = index === dataPoints.length - 1;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t transition-all duration-300 ${isLast
                  ? "bg-primary"
                  : point.count > 0
                    ? "bg-primary/60"
                    : "bg-muted"
                  }`}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{dataPoints[0]?.time}</span>
        <span>{dataPoints[dataPoints.length - 1]?.time}</span>
      </div>
    </div>
  );
}

